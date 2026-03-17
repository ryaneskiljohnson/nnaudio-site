/**
 * @fileoverview Marketing attribution helpers for persisting UTM data across
 * signup, checkout, and admin reporting surfaces.
 * @module utils/marketing/attribution
 */

export const ATTRIBUTION_COOKIE_NAME = "nnaud_attribution";
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

/**
 * @brief Marketing attribution payload stored in cookies and metadata.
 */
export interface MarketingAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  fbclid?: string;
  gclid?: string;
  msclkid?: string;
  landing_path?: string;
  landing_url?: string;
  referrer?: string;
  first_seen_at?: string;
  last_seen_at?: string;
}

const ATTRIBUTION_KEYS: Array<keyof MarketingAttribution> = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "landing_path",
  "landing_url",
  "referrer",
  "first_seen_at",
  "last_seen_at",
];

/**
 * @brief Sanitizes a string for cookie and metadata storage.
 * @param value - Raw string input.
 * @param maxLength - Maximum length to preserve.
 * @returns Sanitized string or undefined when empty.
 */
function sanitizeValue(
  value: string | null | undefined,
  maxLength: number = 255
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

/**
 * @brief Parses persisted attribution JSON from a cookie value.
 * @param cookieValue - Serialized cookie payload.
 * @returns Parsed attribution object or null when invalid.
 */
export function parseAttributionCookie(
  cookieValue?: string | null
): MarketingAttribution | null {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(cookieValue) as Record<string, unknown>;
    const attribution: MarketingAttribution = {};

    for (const key of ATTRIBUTION_KEYS) {
      const value = sanitizeValue(parsed[key] as string | undefined, 512);
      if (value) {
        attribution[key] = value;
      }
    }

    return Object.keys(attribution).length > 0 ? attribution : null;
  } catch {
    return null;
  }
}

/**
 * @brief Serializes attribution for cookie storage.
 * @param attribution - Attribution payload to persist.
 * @returns JSON string for cookies.
 */
export function serializeAttributionCookie(
  attribution: MarketingAttribution
): string {
  return JSON.stringify(attribution);
}

/**
 * @brief Extracts attribution parameters from a URL.
 * @param url - Request URL containing query parameters.
 * @param referrer - Optional referrer header value.
 * @returns Attribution object or null if no marketing parameters are present.
 */
export function extractAttributionFromUrl(
  url: URL,
  referrer?: string | null
): MarketingAttribution | null {
  const utmSource = sanitizeValue(url.searchParams.get("utm_source"));
  const utmMedium = sanitizeValue(url.searchParams.get("utm_medium"));
  const utmCampaign = sanitizeValue(url.searchParams.get("utm_campaign"));
  const utmTerm = sanitizeValue(url.searchParams.get("utm_term"));
  const utmContent = sanitizeValue(url.searchParams.get("utm_content"));
  const fbclid = sanitizeValue(url.searchParams.get("fbclid"));
  const gclid = sanitizeValue(url.searchParams.get("gclid"));
  const msclkid = sanitizeValue(url.searchParams.get("msclkid"));

  const hasMarketingParams =
    !!utmSource ||
    !!utmMedium ||
    !!utmCampaign ||
    !!utmTerm ||
    !!utmContent ||
    !!fbclid ||
    !!gclid ||
    !!msclkid;

  if (!hasMarketingParams) {
    return null;
  }

  const timestamp = new Date().toISOString();

  return {
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: utmTerm,
    utm_content: utmContent,
    fbclid,
    gclid,
    msclkid,
    landing_path: sanitizeValue(url.pathname + url.search, 512),
    landing_url: sanitizeValue(url.toString(), 1024),
    referrer: sanitizeValue(referrer, 1024),
    first_seen_at: timestamp,
    last_seen_at: timestamp,
  };
}

/**
 * @brief Merges existing and incoming attribution values while preserving the
 * first-touch timestamp and latest landing details.
 * @param existing - Previously stored attribution object.
 * @param incoming - Newly captured attribution object.
 * @returns Merged attribution object.
 */
export function mergeAttribution(
  existing: MarketingAttribution | null,
  incoming: MarketingAttribution
): MarketingAttribution {
  return {
    ...existing,
    ...incoming,
    first_seen_at: existing?.first_seen_at || incoming.first_seen_at,
    last_seen_at: incoming.last_seen_at || new Date().toISOString(),
    landing_path: incoming.landing_path || existing?.landing_path,
    landing_url: incoming.landing_url || existing?.landing_url,
    referrer: incoming.referrer || existing?.referrer,
  };
}

/**
 * @brief Converts attribution into Stripe-safe metadata key/value pairs.
 * @param attribution - Attribution object read from cookies.
 * @returns Flat metadata record suitable for Stripe.
 */
export function attributionToStripeMetadata(
  attribution: MarketingAttribution | null
): Record<string, string> {
  if (!attribution) {
    return {};
  }

  const metadata: Record<string, string> = {};

  for (const [key, value] of Object.entries(attribution)) {
    const sanitized = sanitizeValue(value, 500);
    if (sanitized) {
      metadata[key] = sanitized;
    }
  }

  return metadata;
}

/**
 * @brief Builds subscriber metadata additions from attribution.
 * @param attribution - Attribution object read from cookies.
 * @returns Metadata fragment for subscriber records.
 */
export function attributionToSubscriberMetadata(
  attribution: MarketingAttribution | null
): Record<string, string> {
  if (!attribution) {
    return {};
  }

  return attributionToStripeMetadata(attribution);
}

/**
 * @brief Derives a human-readable subscriber source from attribution.
 * @param attribution - Attribution object read from cookies.
 * @returns Source string for subscriber records.
 */
export function getSubscriberSource(
  attribution: MarketingAttribution | null
): string {
  if (!attribution?.utm_source) {
    return "signup";
  }

  if (attribution.utm_medium && attribution.utm_campaign) {
    return `${attribution.utm_source}:${attribution.utm_medium}:${attribution.utm_campaign}`.slice(
      0,
      100
    );
  }

  if (attribution.utm_medium) {
    return `${attribution.utm_source}:${attribution.utm_medium}`.slice(0, 100);
  }

  return attribution.utm_source.slice(0, 100);
}
