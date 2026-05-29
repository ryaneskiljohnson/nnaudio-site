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

    // Create subscriber for the new user if signup was successful
    if (authResponse.data.user && !authResponse.error) {
      try {
        await linkPurchasesToUserByEmail({
          userId: authResponse.data.user.id,
          email: authResponse.data.user.email || email,
          preferredCustomerId: customer_id,
        });
      } catch (linkError) {
        console.error("Failed to link purchases on signup:", linkError);
      }

      try {
        const { error: subscriberError } = await supabase
          .from("subscribers")
          .insert({
            id: authResponse.data.user.id, // Use user ID as subscriber ID
            user_id: authResponse.data.user.id,
            email: authResponse.data.user.email || email, // Use fallback email
            source: getSubscriberSource(attribution),
            status: "active",
            tags: [
              "free-user",
              ...(attribution?.utm_source ? [`source:${attribution.utm_source}`] : []),
            ],
            metadata: {
              first_name: first_name || "",
              last_name: last_name || "",
              subscription: "none",
              auth_created_at: authResponse.data.user.created_at,
              profile_updated_at: new Date().toISOString(),
              ...attributionToSubscriberMetadata(attribution),
            },
          });

        if (subscriberError) {
          console.error("Failed to create subscriber:", subscriberError);
          // Don't fail the signup if subscriber creation fails
        } else {
          console.log(
            "Subscriber created successfully for user:",
            authResponse.data.user.id
          );
        }
      } catch (subscriberError) {
        console.error("Error creating subscriber:", subscriberError);
        // Don't fail the signup if subscriber creation fails
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
