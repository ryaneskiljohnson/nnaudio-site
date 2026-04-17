/**
 * @fileoverview Escapes strings for use as PostgREST `ilike` / SQL `LIKE` literal patterns
 * so `%`, `_`, and `\` are treated as literals, not wildcards.
 * @module utils/supabase/ilike-escape
 */

/**
 * @brief Escape `\`, `%`, and `_` for ILIKE/LIKE literal matching.
 * @param value Normalized string (e.g. lowercased email).
 * @returns Pattern safe for `.ilike("column", pattern)` without unintended wildcards.
 */
export function escapeIlikeExactPattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
