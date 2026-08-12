/**
 * @fileoverview Shared helpers and constants for anonymous live-site presence.
 * @module utils/presence
 */

/** Visitors with a heartbeat newer than this are counted as currently on site. */
export const PRESENCE_ACTIVE_WINDOW_MS = 45_000;

/** How often browsers ping /api/presence while the tab is open. */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 20_000;

/** How often the admin UI refreshes the live count. */
export const PRESENCE_ADMIN_POLL_INTERVAL_MS = 4_000;

/** Delete rows older than this so the table stays small. */
export const PRESENCE_STALE_AFTER_MS = 2 * 60_000;

export const PRESENCE_VISITOR_STORAGE_KEY = "nnaudio_presence_id";

export type PresencePageCount = {
  path: string;
  count: number;
};

export type AdminPresenceResponse = {
  count: number;
  pages: PresencePageCount[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @brief Returns true when value is a UUID the heartbeat API will accept.
 */
export function isPresenceVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * @brief Strips query/hash and caps length so presence paths stay anonymous and short.
 */
export function sanitizePresencePath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/")) {
    return "/";
  }

  const withoutQuery = path.split("?")[0]?.split("#")[0] ?? "/";
  const collapsed = withoutQuery.replace(/\/{2,}/g, "/").slice(0, 200);
  return collapsed.length > 0 ? collapsed : "/";
}
