/**
 * @fileoverview Admin API: return orders (succeeded payment intents) for a user.
 * Used by support tickets admin to show order list in a dialog.
 * @module api/admin/user-orders
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import { stripe } from "@/utils/stripe/client";

/**
 * GET /api/admin/user-orders?user_id=...
 * Returns { count, orders: [{ id, amount, created }] } for the given user.
 * @param request - Next request; user_id query param required
 * @returns 200 JSON with count and orders; 400 if user_id missing; 401 if not admin; 500 on error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = await createSupabaseServiceRole();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("customer_id")
      .eq("id", userId)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json({ count: 0, orders: [] });
    }

    const { data: paymentIntents } = await stripe.paymentIntents.list({
      customer: profile.customer_id,
      limit: 100,
    });

    const succeeded = paymentIntents.filter((pi) => pi.status === "succeeded");
    const orders = succeeded.map((pi) => ({
      id: pi.id,
      amount: pi.amount,
      created: pi.created
        ? new Date(pi.created * 1000).toISOString()
        : null,
    }));

    return NextResponse.json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("[user-orders] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to load user orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
