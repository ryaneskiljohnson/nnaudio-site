/**
 * @fileoverview PKCE auth callback: exchange `code` for a session, then redirect.
 * @module app/auth/callback
 *
 * Password-reset emails that still use `{{ .ConfirmationURL }}` send the browser
 * to `/reset-password?code=...`. Client-side `exchangeCodeForSession` races the
 * browser client's `detectSessionInUrl` and often fails with "invalid/expired".
 * Exchanging on the server with the PKCE cookie is the SSR-safe path.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectUrl } from "@/utils/redirectValidation";

/**
 * @brief GET handler that exchanges a PKCE auth code and redirects onward.
 * @param request Incoming request with `code` and optional `next` query params.
 * @returns Redirect to `next` (default `/reset-password`) on success, or the
 *   reset page with `error=invalid_link` on failure.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectUrl(searchParams.get("next")) ?? "/reset-password";
  const failureUrl = `${origin}/reset-password?error=invalid_link`;

  if (!code) {
    return NextResponse.redirect(failureUrl);
  }

  let redirectResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          redirectResponse = NextResponse.redirect(`${origin}${next}`);
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(failureUrl);
  }

  return redirectResponse;
}
