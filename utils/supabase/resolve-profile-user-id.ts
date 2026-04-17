/**
 * @fileoverview Resolves Supabase auth user id from profile email (lowercased).
 * @module utils/supabase/resolve-profile-user-id
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

/**
 * @brief Looks up `profiles.id` by normalized email.
 * @param supabase - Supabase client with read access to `profiles`.
 * @param email - Email address (any casing).
 * @returns User id or null if no profile row exists for that email.
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
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}
