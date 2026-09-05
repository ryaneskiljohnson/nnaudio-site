/**
 * @fileoverview Admin emails for order copies and support ticket notifications.
 * @module lib/admin-order-email-copy
 *
 * Used by Stripe webhook (paid order confirmation copies) and support ticket correspondence.
 * Free orders never notify admins.
 */

import { createSupabaseServiceRole } from "@/utils/supabase/service";

/**
 * @brief Fetches all admin user emails (from admins table + profiles).
 * Used for support ticket notifications so all admins receive correspondence.
 * @returns Array of admin email addresses (no duplicates)
 */
export async function getAdminEmails(): Promise<string[]> {
  const supabase = await createSupabaseServiceRole();
  const { data: adminRows, error: adminError } = await supabase
    .from("admins")
    .select("user");
  if (adminError || !adminRows?.length) return [];
  const userIds = [...new Set((adminRows as { user: string }[]).map((r) => r.user))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email")
    .in("id", userIds)
    .not("email", "is", null);
  const emails = (profiles ?? [])
    .map((p) => p.email as string)
    .filter((e): e is string => Boolean(e));
  return [...new Set(emails)];
}

/**
 * @brief Fetches admin emails that opted in to paid-order confirmation copies.
 * @param isPaidOrder - true when order total > 0
 * @returns Array of admin email addresses (no duplicates)
 * @note Free orders never notify admins, regardless of stored preferences.
 * @example
 * const emails = await getAdminEmailsForOrderCopy(amountTotal > 0);
 */
export async function getAdminEmailsForOrderCopy(
  isPaidOrder: boolean
): Promise<string[]> {
  if (!isPaidOrder) return [];
  const supabase = await createSupabaseServiceRole();
  const { data: rows, error } = await supabase
    .from("admin_notification_preferences")
    .select("user_id, notify_on_paid_order")
    .eq("notify_on_paid_order", true);

  if (error || !rows?.length) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email")
    .in("id", userIds)
    .not("email", "is", null);
  const emails = (profiles ?? [])
    .map((p) => p.email as string)
    .filter((e): e is string => Boolean(e));
  return [...new Set(emails)];
}
