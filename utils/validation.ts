/**
 * @fileoverview Shared validation helpers for API routes (UUID, etc.).
 * @module utils/validation
 */

/** UUID v4 pattern for Supabase/auth IDs. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true if the string is a valid UUID (safe for Stripe query interpolation).
 * @param value - String to check
 * @returns true if valid UUID
 */
export function isUuid(value: string): boolean {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/**
 * Validates that a value is a UUID; returns the value or null if invalid.
 * Use before interpolating into Stripe search queries.
 * @param value - String to validate
 * @returns The value if valid, null otherwise
 */
export function requireUuid(value: string | undefined): string | null {
  if (value && isUuid(value)) return value;
  return null;
}
