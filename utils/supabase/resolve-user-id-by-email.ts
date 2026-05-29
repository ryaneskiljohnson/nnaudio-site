/**
 * @fileoverview Resolves a Supabase profile / auth user id from an email for admin-only flows.
 * @module utils/supabase/resolve-user-id-by-email
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * @brief Looks up `profiles.id` (same as `auth.users.id`) by email for granting NFR or product access.
 * @param serviceSupabase Service-role Supabase client (bypasses RLS).
 * @param rawEmail Email entered by an admin (trimmed; matched case-insensitively).
 * @returns The user id, or null if no unique profile match exists.
 * @note Uses `ilike` on the full string (no wildcards) so the pattern is treated as a literal address.
 */
export async function resolveUserIdByEmailForAdmin(
  serviceSupabase: SupabaseClient,
  rawEmail: string
): Promise<string | null> {
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized) return null;

  const { data: rows, error } = await serviceSupabase
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .limit(2);

  if (error || !rows?.length) return null;
  if (rows.length > 1) return null;
  return (rows[0] as { id: string }).id;
}
