/**
 * @fileoverview Order statistics API endpoint
 * @module api/admin/order-stats
 * 
 * Provides statistics about product grants and orders including:
 * - Total product grants
 * - Unique customers
 * - Unique products granted
 * - Grants created this month
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * @brief Get order and grant statistics
 * @param request Next.js request object
 * @returns Order statistics
 * 
 * @example
 * GET /api/admin/order-stats
 * Response:
 * {
 *   "total_grants": 1234,
 *   "unique_customers": 567,
 *   "unique_products": 89,
 *   "grants_this_month": 45
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get total grants
    const { count: totalGrants } = await (adminSupabase as any)
      .from("product_grants")
      .select("*", { count: "exact", head: true });

    // Get unique customers
    const { data: uniqueCustomersData } = await (adminSupabase as any)
      .from("product_grants")
      .select("user_id");

    const uniqueCustomers = uniqueCustomersData
      ? new Set(uniqueCustomersData.map((g: any) => g.user_id)).size
      : 0;

    // Get unique products
    const { data: uniqueProductsData } = await (adminSupabase as any)
      .from("product_grants")
      .select("product_id");

    const uniqueProducts = uniqueProductsData
      ? new Set(uniqueProductsData.map((g: any) => g.product_id)).size
      : 0;

    // Get grants from this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { count: grantsThisMonth } = await (adminSupabase as any)
      .from("product_grants")
      .select("*", { count: "exact", head: true })
      .gte("granted_at", firstDayOfMonth.toISOString());

    return NextResponse.json({
      total_grants: totalGrants || 0,
      unique_customers: uniqueCustomers,
      unique_products: uniqueProducts,
      grants_this_month: grantsThisMonth || 0,
    });
  } catch (error: any) {
    console.error("[order-stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
