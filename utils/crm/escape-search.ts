/**
 * @fileoverview Sanitizes CRM search text before it is placed in PostgREST `or()` / `ilike` filters.
 * @module utils/crm/escape-search
 */

/**
 * @brief Prepares a CRM search string for `ilike.%value%` filters.
 * @param raw User-entered search text.
 * @returns Escaped term, `null` when there is no search, or `""` when the
 *   raw text is non-empty but sanitizes to nothing (match nobody).
 * @note Strips `,()` so they cannot break PostgREST `or()` lists. Escapes
 *   LIKE wildcards `%` and `_`.
 * @example
 * sanitizeCrmSearchTerm("ryan johnson"); // "ryan johnson"
 * sanitizeCrmSearchTerm("100%"); // "100\\%"
 * sanitizeCrmSearchTerm(","); // ""
 */
export function sanitizeCrmSearchTerm(raw?: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const escaped = trimmed
    .replace(/[,()]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\s+/g, " ")
    .trim();
  return escaped;
}

/**
 * @brief Escapes a value for an exact, case-insensitive PostgREST `ilike` match.
 * @param raw Email or other exact token (already may be mixed case).
 * @returns Escaped token, or null when nothing remains after sanitizing.
 * @note Strips `,()` so `or()` lists stay valid. Escapes LIKE `%` `_` and `\`.
 * @example
 * escapePostgrestIlikeExact("first_last@x.com"); // "first\\_last@x.com"
 */
export function escapePostgrestIlikeExact(
  raw?: string | null
): string | null {
  if (raw == null) return null;
  const cleaned = raw.toLowerCase().trim().replace(/[,()]/g, "");
  if (!cleaned) return null;
  return cleaned
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * @brief Builds a PostgREST `or()` clause for exact, case-insensitive email matches.
 * @param emails Raw emails (mixed case, possibly with wildcards).
 * @returns Comma-joined `email.ilike.` filters, or empty when none are valid.
 * @example
 * emailIlikeOrClause(["first_last@x.com"]);
 * // "email.ilike.first\\_last@x.com"
 */
export function emailIlikeOrClause(emails: readonly string[]): string {
  return emails
    .map((email) => escapePostgrestIlikeExact(email))
    .filter((email): email is string => Boolean(email))
    .map((email) => `email.ilike.${email}`)
    .join(",");
}
