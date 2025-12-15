"use server";

import { Database } from "@/database.types";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service role key
 * This should only be used server-side for admin operations
 * like accessing the private stripe_tables schema
 */
export async function createSupabaseServiceRole() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Alias for createSupabaseServiceRole for consistency
 * Creates a Supabase client with admin/service role privileges
 */
export async function createAdminClient() {
  return createSupabaseServiceRole();
}
