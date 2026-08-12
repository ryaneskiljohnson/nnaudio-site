/**
 * @fileoverview Admin API for the live count of people currently on the site.
 * @module api/admin/presence
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import {
  PRESENCE_ACTIVE_WINDOW_MS,
  PRESENCE_STALE_AFTER_MS,
  type AdminPresenceResponse,
  type PresencePageCount,
} from "@/utils/presence";

/**
 * @brief Returns unique visitors with a heartbeat inside the active window.
 * GET /api/admin/presence
 * @returns 200 JSON with count and top pages; 401 if not admin; 500 on error
 */
export async function GET() {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = await createSupabaseServiceRole();
    const now = Date.now();
    const activeCutoff = new Date(now - PRESENCE_ACTIVE_WINDOW_MS).toISOString();
    const staleCutoff = new Date(now - PRESENCE_STALE_AFTER_MS).toISOString();

    const [{ data, error }, cleanup] = await Promise.all([
      serviceSupabase
        .from("site_presence")
        .select("path")
        .gte("last_seen", activeCutoff),
      serviceSupabase
        .from("site_presence")
        .delete()
        .lt("last_seen", staleCutoff),
    ]);

    if (cleanup.error) {
      console.error("[admin presence] cleanup failed:", cleanup.error.message);
    }

    if (error) {
      console.error("[admin presence] Error:", error);
      return NextResponse.json(
        { error: "Failed to get presence count", details: error.message },
        { status: 500 },
      );
    }

    const pageCounts = new Map<string, number>();
    for (const row of data ?? []) {
      const path = row.path || "/";
      pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1);
    }

    const pages: PresencePageCount[] = [...pageCounts.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
      .slice(0, 12);

    const response: AdminPresenceResponse = {
      count: data?.length ?? 0,
      pages,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[admin presence] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to get presence count",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
