/**
 * @fileoverview Email verification and OTP confirmation API endpoint.
 * @module app/api/auth/confirm
 *
 * Handles email verification, password recovery OTP confirmation, and email-change
 * confirmation (Supabase `email_change` OTP from `verifyOtp`). Users are redirected
 * here from email verification links. After verifying the OTP token, users are
 * redirected to the appropriate page (dashboard or reset-password).
 *
 * On successful `email_change` verification, the response is a 302 redirect to
 * `/dashboard` (same as signup/email verification flows handled by this route).
 *
 * On failure, redirects to `/login` with `auth_error` so the login page can show
 * a contextual message (and so unauthenticated users are not sent to a dead-end
 * error page that drops query params through private-layout redirects).
 */

"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/**
 * @brief GET endpoint to confirm email verification or password recovery OTP
 * @param request - Next.js request object containing query parameters
 * @returns Redirect response to dashboard, reset-password, or login with auth_error
 *
 * Query parameters:
 * - token_hash: OTP token hash from the email link (required)
 * - type: "signup" | "email" | "recovery" | "invite" | "email_change" etc. (required)
 *
 * Redirects (302):
 * - Success (recovery or invite): /reset-password
 * - Success (other types, including email_change): /dashboard
 * - Missing params or verify failure: /login?auth_error=verification_failed
 * - Verify failure (type email_change): /login?auth_error=email_change_failed
 *
 * @note Requires Supabase "Confirm signup" email template to link to this URL with token_hash and type in the query.
 * @note 100ms delay after verification to ensure session is established before redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (type === "recovery" || type === "invite") {
        redirect("/reset-password");
      }
      redirect("/dashboard");
    }

    if (type === "email_change") {
      redirect("/login?auth_error=email_change_failed");
    }
  }

  redirect("/login?auth_error=verification_failed");
}
