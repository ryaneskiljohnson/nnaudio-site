/**
 * @fileoverview Shared email normalization for `product_grants` matching (NFR/admin).
 * Kept outside `"use server"` modules because Next.js only allows async function exports from Server Actions.
 * @module utils/supabase/email-grant-normalize
 */

/**
 * @brief Normalize email for grant matching (NFC, trim, lower) — same idea as backfill scripts.
 * @param raw Raw email from DB or UI.
 * @returns Normalized string for map keys and `ilike` patterns.
 */
export function normalizeEmailForGrantLookup(raw: string): string {
  return raw.normalize("NFC").trim().toLowerCase();
}
