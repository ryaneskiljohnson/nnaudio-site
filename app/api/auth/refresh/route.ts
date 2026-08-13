"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Profile } from "@/utils/supabase/types";
import { Database } from "@/database.types";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

interface ProfileWithEmail extends Profile {
  email: string;
}

type UserResponse = {
  user: ProfileWithEmail | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  error: { code: string; message: string } | null;
};

const ok = (
  user: ProfileWithEmail,
  access_token: string,
  refresh_token: string,
  expires_at: number | null
): NextResponse<UserResponse> => {
  return NextResponse.json({
    user,
    access_token,
    refresh_token,
    expires_at,
    error: null,
  });
};

const err = (code: string, message: string): NextResponse<UserResponse> => {
  return NextResponse.json({
    user: null,
    access_token: null,
    refresh_token: null,
    expires_at: null,
    error: { code, message },
  });
};

/**
 * Per-request client. A module-level client plus `setSession` can leak
 * one caller's tokens into a concurrent refresh.
 */
function createTokenClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setAll(_cookiesToSet) {},
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<UserResponse>> {
  try {
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`auth-refresh:${clientIp}`, 30, 60)) {
      return NextResponse.json(
        {
          user: null,
          access_token: null,
          refresh_token: null,
          expires_at: null,
          error: {
            code: "rate_limited",
            message: "Too many requests. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    const body = await request.formData();
    const access_token = body.get("access_token")?.toString();
    const refresh_token = body.get("refresh_token")?.toString();

    if (!access_token || !refresh_token)
      return err(
        "invalid_token",
        "access_token and refresh_token are required"
      );

    const supabase = createTokenClient();

    // First try to use the existing session
    let session;
    let user;
    let error;

    // Set the session in supabase
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (setSessionError) {
      // If setting session failed, try to refresh
      const refreshResult = await supabase.auth.refreshSession({
        refresh_token,
      });

      user = refreshResult.data.user;
      session = refreshResult.data.session;
      error = refreshResult.error;
    } else {
      // Get current user with the set session
      const { data, error: getUserError } = await supabase.auth.getUser();
      user = data.user;

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData.session;
      error = getUserError;
    }

    // Handle error in getting user/session
    if (error) {
      return err(error.code as string, error.message);
    }

    // Proceed if we have user and session
    if (session && user && user.email) {
      const { data: profile, error: profile_error } = await supabase
        .from("profiles")
        .select()
        .eq("id", user.id)
        .single();

      if (profile_error) {
        return err(profile_error.code, profile_error.message);
      }

      if (profile) {
        // Check and update subscription status (NFR, Stripe, and iOS)
        try {
          // Use centralized function that handles NFR, Stripe, and iOS
          const { updateUserProStatus } = await import(
            "@/utils/subscriptions/check-subscription"
          );
          const subscriptionCheck = await updateUserProStatus(user.id);

          console.log(`[Refresh] Subscription check for ${user.email}:`, {
            subscription: subscriptionCheck.subscription,
            source: subscriptionCheck.source,
            expiration: subscriptionCheck.subscriptionExpiration,
          });

          // Update profile with subscription info
          const finalProfileWithSubscription = {
            ...profile,
            subscription: subscriptionCheck.subscription,
            subscription_expiration:
              subscriptionCheck.subscriptionExpiration?.toISOString() || null,
            subscription_source: subscriptionCheck.source,
            email: user.email,
          };

          console.log(
            `[Refresh] Returning profile with subscription: ${finalProfileWithSubscription.subscription}`
          );

          return ok(
            finalProfileWithSubscription,
            session.access_token,
            session.refresh_token,
            session.expires_at || null
          );
        } catch (error) {
          console.error("[Refresh] Error checking subscription:", error);
          // Continue with original profile if subscription check fails
        }

        return ok(
          { ...profile, email: user.email },
          session.access_token,
          session.refresh_token,
          session.expires_at || null
        );
      }
    }

    return err("unexpected_failure", "An unexpected error occurred");
  } catch (error) {
    console.error(error);
    return err("unexpected_failure", "An unexpected error occurred");
  }
}
