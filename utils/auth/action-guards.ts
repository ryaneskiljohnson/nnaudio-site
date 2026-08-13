/**
 * @fileoverview Authorization guards for Next.js Server Actions.
 * @module utils/auth/action-guards
 *
 * Server Actions are remotely invocable by any client that knows the action id,
 * so every privileged action must authorize itself. These helpers throw on
 * failure (the client receives a rejected action) rather than silently
 * returning, so a missing guard can never fall through to a privileged path.
 */

import "server-only";
import { createClient } from "@/utils/supabase/server";

/**
 * @brief Returns the authenticated user's id, or null if unauthenticated.
 */
export async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * @brief Throws unless there is an authenticated session. Returns the user id.
 */
export async function requireSessionUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * @brief Returns true when the current session belongs to an admin.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("user", user.id)
    .maybeSingle();
  return !!adminRow;
}

/**
 * @brief Throws unless the current session is an authenticated admin.
 */
export async function requireAdminAction(): Promise<void> {
  const admin = await isCurrentUserAdmin();
  if (!admin) {
    throw new Error("Forbidden");
  }
}

/**
 * @brief Throws unless the caller is the target user OR an admin.
 * @param targetUserId The user id the action operates on.
 */
export async function requireSelfOrAdmin(targetUserId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (user.id === targetUserId) {
    return;
  }
  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("user", user.id)
    .maybeSingle();
  if (!adminRow) {
    throw new Error("Forbidden");
  }
}
