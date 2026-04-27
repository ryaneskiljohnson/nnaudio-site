/**
 * @fileoverview Email verification and OTP confirmation API endpoint.
 * @module app/api/auth/confirm
 *
 * Handles email verification, password recovery OTP confirmation, and email-change
 * confirmation (Supabase `email_change` OTP from `verifyOtp`). Users are redirected
 * here from email verification links. After verifying the OTP token, users are
 * redirected to the appropriate page (dashboard, settings, or reset-password).
 *
 * On successful `email_change` verification, the response is a 302 redirect to
 * `/settings?email_change=success` so the settings page can show a confirmation
 * message instead of the user landing on a generic dashboard with no feedback.
 *
 * On failure (token already consumed, expired, etc.), if the visitor already has
 * a valid session we treat that as a benign re-click of a one-time link and send
 * them to a contextual page (settings for `email_change`, dashboard otherwise)
 * with a hint param. Only truly unauthenticated callers see the login error page.
 */

"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/**
 * @brief GET endpoint to confirm email verification or password recovery OTP.
 * @param request - Next.js request object containing query parameters.
 * @returns Redirect response to dashboard, settings, reset-password, or login.
 *
 * Query parameters:
 * - token_hash: OTP token hash from the email link (required for fresh confirmation)
 * - type: "signup" | "email" | "recovery" | "invite" | "email_change" etc.
 *
 * Redirects (302):
 * - Success (recovery or invite): /reset-password
 * - Success (email_change): /settings?email_change=success
 * - Success (other types): /dashboard
 * - Failure with active session (email_change): /settings?email_change=already_confirmed
 * - Failure with active session (other types): /dashboard
 * - Failure without session (email_change): /login?auth_error=email_change_failed
 * - Failure without session (other types): /login?auth_error=verification_failed
 * - No token params with active session: /dashboard (treat as already-done)
 * - No token params without session: /login (no error banner)
 *
 * @note Requires the Supabase auth email templates to link to this URL with `token_hash`
 * and `type` in the query (matches the signup confirmation template pattern).
 * @note 100ms delay after verification gives Supabase time to set cookies before redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (type === "email_change") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          const { syncStripeCustomerEmailFromProfile } = await import(
            "@/utils/stripe/sync-customer-email"
          );
          await syncStripeCustomerEmailFromProfile(supabase, user.id, user.email);
        }
        redirect("/settings?email_change=success");
      }
      if (type === "recovery" || type === "invite") {
        redirect("/reset-password");
      }
      redirect("/dashboard");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      if (type === "email_change") {
        redirect("/settings?email_change=already_confirmed");
      }
      redirect("/dashboard");
    }

    if (type === "email_change") {
      redirect("/login?auth_error=email_change_failed");
    }
    redirect("/login?auth_error=verification_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
