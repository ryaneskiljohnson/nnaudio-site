/**
 * @fileoverview Next.js proxy: Supabase session refresh and security headers.
 * @module proxy
 *
 * Replaces deprecated middleware.ts (Next.js 16+). Used only for routing
 * (redirects, headers); auth is enforced in server layouts.
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { shouldSkipHomepageSessionRefresh } from "@/utils/supabase/session-refresh-policy";
import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_COOKIE_NAME,
  extractAttributionFromUrl,
  mergeAttribution,
  parseAttributionCookie,
  serializeAttributionCookie,
} from "@/utils/marketing/attribution";

/**
 * Applies security headers to a response.
 * @param response - The response to modify
 * @returns The same response with security headers set
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  // CSP report-only: log violations without blocking (tune before switching to enforce)
  response.headers.set(
    "Content-Security-Policy-Report-Only",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';"
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return response;
}

/**
 * @brief Persists marketing attribution parameters into a durable cookie when
 * a visitor lands with UTM or click-id query parameters.
 * @param request - The current request.
 * @param response - Response to mutate with attribution cookies.
 * @returns The same response for chaining.
 */
function applyAttributionCookie(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const incomingAttribution = extractAttributionFromUrl(
    request.nextUrl,
    request.headers.get("referer")
  );

  if (!incomingAttribution) {
    return response;
  }

  const existingAttribution = parseAttributionCookie(
    request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value
  );

  const mergedAttribution = mergeAttribution(
    existingAttribution,
    incomingAttribution
  );

  response.cookies.set(
    ATTRIBUTION_COOKIE_NAME,
    serializeAttributionCookie(mergedAttribution),
    {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
    }
  );

  return response;
}

/** Paths that require an authenticated user (server-side enforcement). */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/settings",
  "/billing",
  "/downloads",
  "/my-products",
  "/my-orders",
  "/profile",
  "/support",
];

/**
 * Proxy entry: refreshes Supabase session, enforces auth for protected paths, applies security headers.
 * @param request - The incoming request
 * @returns Response with session cookies and security headers
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const authCode = searchParams.get("code");

  // PKCE recovery/invite: exchange the code on the server, not in the reset page.
  if (
    authCode &&
    path.startsWith("/reset-password") &&
    !searchParams.get("error")
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    callbackUrl.searchParams.set("code", authCode);
    callbackUrl.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(callbackUrl);
  }

  // Email verification / signup / recovery: if link landed on any page with token_hash + type in query,
  // send to the confirm route so we verify OTP and redirect to dashboard (or reset-password).
  if (tokenHash && type && path !== "/api/auth/confirm") {
    const confirmUrl = request.nextUrl.clone();
    confirmUrl.pathname = "/api/auth/confirm";
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", type);
    return NextResponse.redirect(confirmUrl);
  }

  /** Anonymous `/` skips auth refresh; logged-in visitors still refresh. */
  const skipSessionRefresh = shouldSkipHomepageSessionRefresh(
    path,
    request.cookies.getAll().map((cookie) => cookie.name)
  );
  const { response: supabaseResponse, user } = skipSessionRefresh
    ? { response: NextResponse.next({ request }), user: null }
    : await updateSession(request);
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth");

  if (isProtected && !user && !isAuthPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", path);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie.name, cookie.value)
    );
    return applySecurityHeaders(applyAttributionCookie(request, redirectResponse));
  }

  return applySecurityHeaders(applyAttributionCookie(request, supabaseResponse));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
