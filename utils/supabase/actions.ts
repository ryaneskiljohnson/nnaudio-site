/**
 * @fileoverview Server-side Supabase actions used by auth and profile flows.
 * @module utils/supabase/actions
 */

"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { Profile } from "@/utils/supabase/types";
import { findOrCreateCustomer } from "@/utils/stripe/actions";
import { linkPurchasesToUserByEmail } from "@/utils/stripe/link-purchases-to-user";
import {
  ATTRIBUTION_COOKIE_NAME,
  attributionToSubscriberMetadata,
  getSubscriberSource,
  parseAttributionCookie,
} from "@/utils/marketing/attribution";
import { ensureSubscriberForUser } from "@/utils/email-campaigns/ensure-subscriber-for-user";
import { requireSelfOrAdmin } from "@/utils/auth/action-guards";

/**
 * @brief Signs up a user, creates a Stripe customer, and stores subscriber and
 * attribution metadata for lifecycle marketing.
 * @param first_name - Subscriber first name.
 * @param last_name - Subscriber last name.
 * @param email - Subscriber email.
 * @param password - Account password.
 * @returns Supabase auth response for the created user.
 */
export async function signUpWithStripe(
  first_name: string,
  last_name: string,
  email: string,
  password: string
) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const attribution = parseAttributionCookie(
      cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value
    );

    // Find or create a Stripe customer
    const customer_id = await findOrCreateCustomer(email);

    // Sign up the user with Supabase; redirect after verification goes to app confirm route → dashboard
    const authResponse = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          customer_id,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/confirm`,
      },
    });

    // On projects with email confirmation, Supabase returns a user object with
    // an EMPTY `identities` array (and no error) when the email is ALREADY
    // registered. Running purchase-linking / subscriber side effects for that
    // obfuscated user lets an attacker rebind another account's Stripe metadata
    // and marketing subscriber. Only run side effects for a genuinely new user.
    const signedUpUser = authResponse.data.user;
    const isNewUser =
      !!signedUpUser &&
      !authResponse.error &&
      Array.isArray(signedUpUser.identities) &&
      signedUpUser.identities.length > 0;

    if (isNewUser && signedUpUser) {
      try {
        await linkPurchasesToUserByEmail({
          userId: signedUpUser.id,
          email: signedUpUser.email || email,
          preferredCustomerId: customer_id,
        });
      } catch (linkError) {
        console.error("Failed to link purchases on signup:", linkError);
      }

      try {
        const subscriberError = await ensureSubscriberForUser({
          userId: signedUpUser.id,
          email: signedUpUser.email || email,
          source: getSubscriberSource(attribution),
          tags: [
            "free-user",
            ...(attribution?.utm_source
              ? [`source:${attribution.utm_source}`]
              : []),
          ],
          metadata: {
            first_name: first_name || "",
            last_name: last_name || "",
            subscription: "none",
            auth_created_at: signedUpUser.created_at,
            profile_updated_at: new Date().toISOString(),
            ...attributionToSubscriberMetadata(attribution),
          },
        });

        if (subscriberError) {
          console.error("Failed to create subscriber:", subscriberError);
        }
      } catch (subscriberError) {
        console.error("Error creating subscriber:", subscriberError);
      }
    }

    return authResponse;
  } catch (error) {
    console.error("Error in signUp:", error);
    throw error;
  }
}

/**
 * @brief Links prior Stripe purchases to the currently authenticated user (idempotent).
 * @note Called after web sign-in / session restore; complements `/api/auth/login` for Cymasphere clients.
 */
export async function linkPurchasesForSessionUser(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return;
  }

  const preferredCustomerId =
    typeof user.user_metadata?.customer_id === "string"
      ? user.user_metadata.customer_id
      : null;

  try {
    await linkPurchasesToUserByEmail({
      userId: user.id,
      email: user.email,
      preferredCustomerId,
    });
  } catch (error) {
    console.error("[linkPurchasesForSessionUser] Failed to link purchases:", error);
  }
}

export async function fetchProfile(
  id: string
): Promise<{ profile: Profile | null; error: PostgrestError | null }> {
  await requireSelfOrAdmin(id);
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select()
    .eq("id", id)
    .single();

  return { profile, error };
}

export async function fetchIsAdmin(
  id: string
): Promise<{ is_admin: boolean; error: PostgrestError | null }> {
  await requireSelfOrAdmin(id);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admins")
    .select()
    .eq("user", id)
    .maybeSingle();

  // Handle errors (other than "no rows found" which maybeSingle handles gracefully)
  if (error) {
    console.log(
      `[fetchIsAdmin] Error checking admin status for user ${id}:`,
      error
    );
    return { is_admin: false, error };
  }

  const isAdmin = !!data;
  console.log(`[fetchIsAdmin] User ${id} is_admin:`, isAdmin);
  return { is_admin: isAdmin, error: null };
}

/**
 * Fetches the sessions for a user
 */
export async function fetchUserSessions(): Promise<{
  sessions: { ip: string; device_name: string; last_used: string }[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: user_error,
    } = await supabase.auth.getUser();

    if (user_error) {
      console.error("Error getting user:", user_error);
      return { sessions: [], error: "Failed to fetch user" };
    }

    if (user) {
      // row level security prevents selecting sessions for other users
      const { data, error } = await supabase
        .from("user_sessions")
        .select("ip, user_agent, refreshed_at, updated_at, created_at")
        .eq("user_id", user.id)
        .order("refreshed_at", { ascending: false });

      if (error) {
        console.error("Error in fetchUserSession:", error);
        // Return empty sessions instead of error to prevent UI breaking
        return { sessions: [], error: null };
      }

      // Group sessions by user_agent and keep only the most recent session for each unique user agent
      const uniqueSessions = new Map();

      data.forEach((session) => {
        const userAgent = session.user_agent;
        if (userAgent) {
          const lastUsed =
            session.refreshed_at || session.updated_at || session.created_at;

          // If we haven't seen this user agent before, or if this session is more recent
          if (
            !uniqueSessions.has(userAgent) ||
            (lastUsed &&
              new Date(lastUsed) >
                new Date(uniqueSessions.get(userAgent).last_used))
          ) {
          // Extract device name from user agent or use a default
          let deviceName = userAgent || "Unknown Device";
          // Remove any app-specific prefixes
          deviceName = deviceName.replace(/^(nnaudio|cymasphere):\s*/i, "");
          
          uniqueSessions.set(userAgent, {
            ip: (session.ip as string) || "Unknown",
            device_name: deviceName,
            last_used: lastUsed || new Date().toISOString(),
          });
          }
        }
      });

      // Convert Map values to array
      const sessions = Array.from(uniqueSessions.values());

      return { sessions, error: null };
    }

    return { sessions: [], error: "User not found" };
  } catch (error) {
    console.error("Error in fetchUserSession:", error);
    return { sessions: [], error: "Failed to fetch user sessions" };
  }
}
