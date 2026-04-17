/**
 * @fileoverview Records promotion view or conversion via Supabase RPC using the service role.
 * @module app/api/promotions/track/route
 *
 * @note Uses `SUPABASE_SERVICE_ROLE_KEY` so increments succeed for anonymous visitors (anon key + RLS
 *       cannot reliably execute `increment_promotion_*` against `promotions`).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

const PROMOTION_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @brief POST — increment `views` or `conversions`/`revenue` for a promotion row.
 * @param request JSON body `{ promotion_id: string, type: 'view' | 'conversion', value?: number }`.
 * @returns `{ success: true }` or error JSON.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[promotions/track] SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { promotion_id, type, value } = body as {
      promotion_id?: string;
      type?: string;
      value?: number;
    };

    if (!promotion_id || !type) {
      return NextResponse.json(
        { error: "promotion_id and type required" },
        { status: 400 }
      );
    }

    if (!PROMOTION_ID_UUID_RE.test(String(promotion_id).trim())) {
      return NextResponse.json(
        { error: "Invalid promotion_id" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServiceRole();
    const id = String(promotion_id).trim();

    if (type === "view") {
      const { error } = await supabase.rpc("increment_promotion_view", {
        promotion_id: id,
      });

      if (error) {
        console.error("Error tracking promotion view:", error);
        return NextResponse.json(
          { error: "Failed to track view" },
          { status: 500 }
        );
      }
    } else if (type === "conversion") {
      const { error } = await supabase.rpc("increment_promotion_conversion", {
        promotion_id: id,
        conversion_value: typeof value === "number" && Number.isFinite(value) ? value : 0,
      });

      if (error) {
        console.error("Error tracking promotion conversion:", error);
        return NextResponse.json(
          { error: "Failed to track conversion" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in POST /api/promotions/track:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
