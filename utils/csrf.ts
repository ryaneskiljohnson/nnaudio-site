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
    // A missing token is only acceptable for genuine non-browser clients
    // (e.g. the native NNAudio app). Browser requests carry Origin and/or
    // Sec-Fetch-Site headers; if we see those, CSRF is required.
    return !isBrowserRequest(request);
  }
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;
  return cookieToken.length > 0 && bodyToken === cookieToken;
}

/**
 * @brief Heuristically detects a browser-originated request (vs. native app).
 * Browsers attach `Origin` and/or `Sec-Fetch-*` headers to fetch/XHR/form POSTs.
 */
function isBrowserRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const origin = request.headers.get("origin");
  const userAgent = request.headers.get("user-agent") ?? "";

  // Explicit native-app signals bypass the browser classification.
  if (/^cymasphere:/i.test(userAgent) || request.headers.get("x-nnaudio-app")) {
    return false;
  }

  return Boolean(secFetchSite || secFetchMode || origin);
}
