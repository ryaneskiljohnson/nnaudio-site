/**
 * @fileoverview Admin API for the count of product reviews pending moderation.
 * Used by the admin sidebar to show a notification badge until reviews are approved or rejected.
 * @module api/admin/reviews/pending-count
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief Returns the count of product reviews with moderation_status = 'pending'.
 * GET /api/admin/reviews/pending-count
 * @returns 200 JSON with count; 401 if not admin; 500 on error
 * @note Counts only reviews that have not yet been approved or rejected.
 * @example
 * ```json
 * { "count": 5 }
 * ```
 */
export async function GET() {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = await createSupabaseServiceRole();

    const { count, error } = await serviceSupabase
      .from("product_reviews")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "pending");

    if (error) {
      console.error("[reviews pending-count] Error:", error);
      return NextResponse.json(
        {
          error: "Failed to get pending count",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: typeof count === "number" ? count : 0,
    });
  } catch (error) {
    console.error("[reviews pending-count] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to get pending count",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
