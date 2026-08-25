/**
 * @fileoverview When the homepage proxy may skip Supabase session
 * refresh to keep anonymous `/` paints fast.
 * @module utils/supabase/session-refresh-policy
 */

/**
 * @brief True when any cookie looks like a Supabase SSR auth token.
 * @param cookieNames Cookie names from the incoming request.
 * @returns Whether a session refresh may still be needed.
 * @example
 * hasSupabaseAuthCookie(["sb-xyz-auth-token"]) // true
 * hasSupabaseAuthCookie(["attribution"]) // false
 */
export function hasSupabaseAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some(
    (name) => name.startsWith("sb-") && name.includes("auth-token")
  );
}

/**
 * @brief Skip session refresh only for anonymous visitors on `/`.
 * Logged-in users still refresh so idle homepage sessions do not expire
 * silently while they sit on marketing.
 * @param path Request pathname (no query).
 * @param cookieNames Cookie names on the request.
 * @returns True when `updateSession` can be skipped.
 * @example
 * shouldSkipHomepageSessionRefresh("/", []) // true
 * shouldSkipHomepageSessionRefresh("/", ["sb-x-auth-token"]) // false
 * shouldSkipHomepageSessionRefresh("/plugins", []) // false
 */
export function shouldSkipHomepageSessionRefresh(
  path: string,
  cookieNames: readonly string[]
): boolean {
  return path === "/" && !hasSupabaseAuthCookie(cookieNames);
}
