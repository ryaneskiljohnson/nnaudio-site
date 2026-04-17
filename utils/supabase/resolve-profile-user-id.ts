/**
 * @fileoverview Resolves Supabase auth user id from profile email (case-insensitive).
 * @module utils/supabase/resolve-profile-user-id
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { escapeIlikeExactPattern } from "@/utils/supabase/ilike-escape";

/**
 * @brief Looks up `profiles.id` by email using case-insensitive match.
 * @param supabase - Supabase client with read access to `profiles`.
 * @param email - Email address (any casing).
 * @returns User id or null if no profile row exists for that email.
 * @note Uses `ilike` with escaped wildcards so mixed-case `profiles.email` rows still resolve.
 */
export async function resolveProfileUserIdByEmail(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", escapeIlikeExactPattern(normalized))
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

