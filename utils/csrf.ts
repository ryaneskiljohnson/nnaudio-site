/**
 * @fileoverview CSRF token validation for auth form submissions.
 * @module utils/csrf
 */

import type { NextRequest } from "next/server";

export const CSRF_COOKIE_NAME = "csrf_token";

/**
 * Validates that the request's CSRF cookie matches the token sent in the body.
 * If no token is sent in the body (e.g. native app), returns true (skip validation).
 * @param request - The request with cookies
 * @param bodyToken - The csrf_token value from the request body, or undefined if not sent
 * @returns true if valid or not applicable, false if token mismatch
 */
export function validateCsrfToken(
  request: NextRequest,
  bodyToken: string | undefined
): boolean {
  if (bodyToken === undefined || bodyToken === "") {
    return true; // No token sent (e.g. NNAudio app) - allow
  }
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;
  return cookieToken.length > 0 && bodyToken === cookieToken;
}
