/**
 * @fileoverview Resolves the public site origin for customer-facing links in outbound email.
 * @module utils/public-site-url
 */

const DEFAULT_PRODUCTION_SITE = "https://nnaud.io";

/**
 * @brief True when hostname should never be used inside emails (local dev / loopback).
 * @param hostname Parsed URL hostname.
 * @returns Whether to fall back to production.
 */
function isLocalDevEmailHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0.0.0.0" ||
    h.endsWith(".local")
  );
}

/**
 * @brief Base URL (origin only, no trailing slash) for links in transactional email bodies and List-Unsubscribe.
 * @returns `https://nnaud.io` when `NEXT_PUBLIC_SITE_URL` is unset, invalid, or points at localhost —
 * so real emails sent while developing do not contain `http://localhost:3000` links.
 * @note Preview deployments (e.g. `*.vercel.app`) are kept as-is when set in env.
 * @example
 * const products = `${getPublicSiteUrlForEmail()}/products`;
 */
export function getPublicSiteUrlForEmail(): string {
  const raw = (
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : ""
  ).trim();
  if (!raw) return DEFAULT_PRODUCTION_SITE;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    if (isLocalDevEmailHost(u.hostname)) return DEFAULT_PRODUCTION_SITE;
    return u.origin;
  } catch {
    return DEFAULT_PRODUCTION_SITE;
  }
}
