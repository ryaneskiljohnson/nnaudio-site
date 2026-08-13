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

/**
 * @brief Sanitizes a free-text search term for interpolation inside a PostgREST
 * `.or(...)` filter string (e.g. `title.ilike.%TERM%`).
 *
 * In addition to escaping LIKE wildcards, this strips PostgREST filter-syntax
 * delimiters (`,` `(` `)` `:` `*`) that would otherwise let a user break out of
 * the intended condition and inject additional filters.
 * @param value Raw user-supplied search text.
 * @returns A value safe to embed between `ilike.%` and `%` in an `.or()` clause.
 */
export function escapeIlikeContainsForOr(value: string): string {
  return escapeIlikeExactPattern(value).replace(/[,()*:]/g, "");
}
