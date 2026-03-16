/**
 * @fileoverview Admin API: return orders (Stripe + product grants) for a user.
 * Used by support tickets admin to show order list in a dialog.
 * @module api/admin/user-orders
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import { stripe } from "@/utils/stripe/client";

type OrderRow = {
  id: string;
  type: "stripe" | "grant";
  amountCents: number;
  created: string | null;
  productName?: string | null;
};

/**
 * GET /api/admin/user-orders?user_id=...
 * Returns { count, orders } for the given user (Stripe succeeded PIs + product grants).
 * Each order: { id, type: "stripe" | "grant", amountCents, created, productName? }.
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
    const {
      data: { user },
    } = await serviceSupabase.auth.admin.getUserById(userId);
    const email = user?.email ?? null;

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("customer_id")
      .eq("id", userId)
      .single();

    const orders: OrderRow[] = [];

    if (profile?.customer_id) {
      const { data: paymentIntents } = await stripe.paymentIntents.list({
        customer: profile.customer_id,
        limit: 100,
      });
      const succeeded = paymentIntents.filter((pi) => pi.status === "succeeded");
      for (const pi of succeeded) {
        orders.push({
          id: pi.id,
          type: "stripe",
          amountCents: pi.amount,
          created: pi.created
            ? new Date(pi.created * 1000).toISOString()
            : null,
        });
      }
    }

    if (email) {
      const { data: grants } = await (serviceSupabase as any)
        .from("product_grants")
        .select(
          `
          id,
          amount,
          granted_at,
          products:product_id ( name )
        `
        )
        .eq("user_email", email.toLowerCase().trim())
        .order("granted_at", { ascending: false });

      const grantList = (grants ?? []) as Array<{
        id: string;
        amount: number;
        granted_at: string;
        products?: { name: string } | null;
      }>;
      for (const g of grantList) {
        const amountCents = Math.round(Number(g.amount ?? 0) * 100);
        orders.push({
          id: g.id,
          type: "grant",
          amountCents,
          created: g.granted_at ?? null,
          productName: g.products?.name ?? null,
        });
      }
    }

    orders.sort((a, b) => {
      if (!a.created || !b.created) return 0;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

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
