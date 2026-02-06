/**
 * @fileoverview Supabase server-side client creation utility
 * 
 * This file provides a function to create a Supabase client for server-side
 * operations in Next.js. Uses Supabase SSR (Server-Side Rendering) utilities
 * to handle cookie-based authentication sessions. The client respects Row
 * Level Security (RLS) policies based on the authenticated user.
 * 
 * @module utils/supabase/server
 */

"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/database.types";

/**
 * @brief Creates a Supabase client for server-side operations
 * 
 * Creates a Supabase client configured for server-side use in Next.js.
 * Handles cookie-based authentication sessions and respects RLS policies.
 * Uses the anonymous key, so all queries are subject to Row Level Security.
 * 
 * @returns Promise resolving to a Supabase client instance
 * @note Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * @note Handles cookie management for authentication sessions
 * @note Silently handles cookie setting errors (expected in Server Components)
 * @note Works with middleware for session refresh
 * 
 * @example
 * ```typescript
 * const supabase = await createClient();
 * const { data } = await supabase.from("profiles").select("*");
 * ```
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
