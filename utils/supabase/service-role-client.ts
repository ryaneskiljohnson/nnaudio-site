/**
 * @fileoverview Lazy Supabase service-role client. Next.js collect-page-data
 * evaluates route modules at build time; constructing the client at import
 * throws when `SUPABASE_SERVICE_ROLE_KEY` is unset.
 * @module utils/supabase/service-role-client
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * @brief Service-role client, created on first use.
 * Untyped like the previous module-scope `createClient` calls so
 * collect-page-data does not fail when the key is missing, and so
 * existing cron/webhook queries are not forced onto generated types.
 * @returns Admin client.
 * @throws When URL or service-role key is missing.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  cached = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
