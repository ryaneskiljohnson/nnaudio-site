/**
 * @fileoverview Host allowlist for email click-tracking redirects.
 * @module utils/email-campaigns/safe-click-target
 */

const DEFAULT_SITE = "https://nnaud.io";

/**
 * @brief Resolves a click-through target to a safe destination.
 * Only http(s) URLs whose host is the site host or an allowlisted host
 * (`EMAIL_LINK_ALLOWED_HOSTS`, comma-separated) are permitted.
 */
export function resolveSafeClickTarget(
  rawUrl: string | null,
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE
): string {
  const fallback = siteUrl || DEFAULT_SITE;
  if (!rawUrl) {
    return fallback;
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, fallback);
  } catch {
    return fallback;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return fallback;
  }

  const allowedHosts = new Set<string>();
  try {
    allowedHosts.add(new URL(fallback).host.toLowerCase());
  } catch {
    // ignore
  }
  (process.env.EMAIL_LINK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .forEach((h) => allowedHosts.add(h));

  const host = parsed.host.toLowerCase();
  const isAllowed = [...allowedHosts].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
  return isAllowed ? parsed.toString() : fallback;
}
