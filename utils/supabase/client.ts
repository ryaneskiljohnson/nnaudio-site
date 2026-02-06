/**
 * @fileoverview Supabase client-side client creation utility
 * 
 * This file provides a function to create a Supabase client for client-side
 * (browser) operations. Uses Supabase SSR utilities for browser-based
 * authentication and data fetching. The client respects Row Level Security
 * (RLS) policies based on the authenticated user.
 * 
 * @module utils/supabase/client
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/database.types";

/**
 * @brief Creates a Supabase client for client-side (browser) operations
 * 
 * Creates a Supabase client configured for use in browser/client components.
 * Handles authentication sessions and respects RLS policies. Uses the
 * anonymous key, so all queries are subject to Row Level Security.
 * 
 * @returns Supabase client instance for browser use
 * @note Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * @note Handles authentication sessions automatically
 * @note All queries respect Row Level Security policies
 * 
 * @example
 * ```typescript
 * const supabase = createClient();
 * const { data } = await supabase.from("profiles").select("*");
 * ```
 */
export const createClient = (): SupabaseClient<Database> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};
