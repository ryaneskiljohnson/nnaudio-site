/**
 * @fileoverview Central switch for synthetic Meta Marketing API responses (local/tests only).
 * @module utils/facebook/mock-mode
 */

/**
 * @brief When true, Facebook Ads API routes may return fixed demo payloads instead of calling Graph API.
 * @returns False in production regardless of env; otherwise true only if FACEBOOK_MOCK_CONNECTION=true.
 * @note Vitest uses NODE_ENV=test — still non-production, so explicit mock tests keep working.
 */
export function isFacebookAdsMockEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.FACEBOOK_MOCK_CONNECTION === "true";
}
