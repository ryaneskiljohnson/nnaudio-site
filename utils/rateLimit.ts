/**
 * @fileoverview In-memory rate limiter for API routes. Resets on deploy; single-instance only.
 * @module utils/rateLimit
 */

/** Entry for one rate-limit key (e.g. IP). */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Checks whether the given key is within the rate limit.
 * @param key - Identifier to limit (e.g. client IP)
 * @param maxRequests - Max requests allowed in the window
 * @param windowSecs - Window duration in seconds
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSecs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowSecs * 1000 });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Gets the client IP from request headers (for use as rate-limit key).
 * @param request - NextRequest or similar with headers
 * @returns IP string, or '127.0.0.1' if unavailable
 */
export function getClientIp(request: { headers: { get: (name: string) => string | null } }): string {
  // Prefer Vercel's platform-trusted header (it cannot be spoofed by the client
  // on Vercel), then fall back to standard proxy headers for other hosts.
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}
