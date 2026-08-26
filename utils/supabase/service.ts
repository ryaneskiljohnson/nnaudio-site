"use server";

import { getServiceRoleClient } from "@/utils/supabase/service-role-client";

/**
 * Creates a Supabase client with the service role key
 * This should only be used server-side for admin operations
 * like accessing the private stripe_tables schema
 */
export async function createSupabaseServiceRole() {
  return getServiceRoleClient();
}

/**
 * Alias for createSupabaseServiceRole for consistency
 * Creates a Supabase client with admin/service role privileges
 */
export async function createAdminClient() {
  return createSupabaseServiceRole();
}
