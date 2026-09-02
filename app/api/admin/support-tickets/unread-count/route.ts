/**
 * @fileoverview Admin API for the per-admin count of support tickets awaiting a response.
 * Used by the admin sidebar to show a notification badge that respects dismissals.
 * @module api/admin/support-tickets/unread-count
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import {
  checkAdmin,
  getSupportTicketReplyStateMapAdmin,
} from "@/app/actions/user-management";
import { ACTIVE_SUPPORT_TICKET_STATUSES } from "@/utils/support/is-active-support-ticket-status";

/**
 * @brief Returns the per-admin unread support ticket count.
 * GET /api/admin/support-tickets/unread-count
 * @returns 200 JSON with count; 401 if not admin; 500 on error
 * @note Tickets count as unread only when status is open or in_progress, the latest
 * message is from the customer, and the current admin has not dismissed that message.
 * Resolved/closed tickets are excluded so changing status removes the notification.
 * @example
 * ```json
 * { "count": 3 }
 * ```
 */
export async function GET() {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = await createSupabaseServiceRole();

    const { data: tickets, error: ticketsError } = await serviceSupabase
      .from("support_tickets")
      .select("id")
      .in("status", [...ACTIVE_SUPPORT_TICKET_STATUSES])
      .order("created_at", { ascending: false });

    if (ticketsError || !tickets?.length) {
      return NextResponse.json({ count: 0 });
    }

    const ticketIds = tickets.map((t) => t.id);
    const replyStateMap = await getSupportTicketReplyStateMapAdmin(
      ticketIds,
      adminUser.id,
    );

    let unreadCount = 0;
    for (const ticketId of ticketIds) {
      if (replyStateMap.get(ticketId)?.awaitingAdminResponse) {
        unreadCount++;
      }
    }

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error("[support-tickets unread-count] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to get unread count",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
