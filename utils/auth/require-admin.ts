/**
 * @fileoverview Shared admin authorization guard for API route handlers.
 * @module utils/auth/require-admin
 *
 * `proxy.ts` does not protect `/api/*`, so every privileged route must
 * authorize itself. This helper verifies a real authenticated session and an
 * `admins` table row for that user, returning a ready-to-send error response
 * when the caller is not an admin.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export interface RequireAdminSuccess {
  ok: true;
  userId: string;
  supabase: SupabaseClient;
}

export interface RequireAdminFailure {
  ok: false;
  response: NextResponse;
}

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure;

/**
 * @brief Ensures the caller is an authenticated admin.
 * @returns Success payload (userId + supabase client) or a 401/403 response.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("user", user.id)
    .maybeSingle();

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, supabase: supabase as unknown as SupabaseClient };
}

/**
 * @brief Admin guard that returns a NextResponse when unauthorized, or null when allowed.
 * Convenience wrapper for routes that prefer early-return style.
 */
export async function requireAdminResponse(): Promise<NextResponse | null> {
  const result = await requireAdmin();
  return result.ok ? null : result.response;
}
