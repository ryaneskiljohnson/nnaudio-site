/**
 * @fileoverview Admin API: count of support tickets where the last reply is from the customer (unread by admin).
 * Used by the admin sidebar to show a notification badge.
 * @module api/admin/support-tickets/unread-count
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * GET /api/admin/support-tickets/unread-count
 * Returns { count: number } — tickets where the last message is from the customer (not admin).
 * @returns 200 JSON with count; 401 if not admin; 500 on error
 */
export async function GET() {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = await createSupabaseServiceRole();

    const { data: tickets, error: ticketsError } = await serviceSupabase
      .from("support_tickets")
      .select("id")
      .order("created_at", { ascending: false });

    if (ticketsError || !tickets?.length) {
      return NextResponse.json({ count: 0 });
    }

    const ticketIds = tickets.map((t) => t.id);
    const { data: messages, error: messagesError } = await serviceSupabase
      .from("support_messages")
      .select("ticket_id, is_admin, created_at")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: false });

    if (messagesError || !messages?.length) {
      return NextResponse.json({ count: ticketIds.length });
    }

    const lastIsAdminByTicket = new Map<string, boolean>();
    for (const msg of messages) {
      if (!lastIsAdminByTicket.has(msg.ticket_id)) {
        lastIsAdminByTicket.set(msg.ticket_id, msg.is_admin);
      }
    }

    let unreadCount = 0;
    for (const ticketId of ticketIds) {
      const lastIsAdmin = lastIsAdminByTicket.get(ticketId);
      if (lastIsAdmin !== true) unreadCount++;
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
