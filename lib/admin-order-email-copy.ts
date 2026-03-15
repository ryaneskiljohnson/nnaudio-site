/**
 * @fileoverview Admin emails for order copies and support ticket notifications.
 * @module lib/admin-order-email-copy
 *
 * Used by Stripe webhook, payment-intent (free orders), and support ticket correspondence.
 */

import { createSupabaseServiceRole } from "@/utils/supabase/service";

/**
 * Fetches all admin user emails (from admins table + profiles).
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
 * Fetches admin emails that should receive a copy of the order confirmation.
 * @param isPaidOrder - true when order total > 0
 * @param isFreeOrder - true when order total === 0
 * @returns Array of admin email addresses (no duplicates)
 */
export async function getAdminEmailsForOrderCopy(
  isPaidOrder: boolean,
  isFreeOrder: boolean
): Promise<string[]> {
  if (!isPaidOrder && !isFreeOrder) return [];
  const supabase = await createSupabaseServiceRole();
  const { data: rows, error } = await supabase
    .from("admin_notification_preferences")
    .select("user_id, notify_on_paid_order, notify_on_free_order")
    .or("notify_on_paid_order.eq.true,notify_on_free_order.eq.true");

  if (error || !rows?.length) return [];
  const wantCopy = rows.filter(
    (r) =>
      (isPaidOrder && r.notify_on_paid_order) ||
      (isFreeOrder && r.notify_on_free_order)
  );
  const userIds = [...new Set(wantCopy.map((r) => r.user_id))];
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
