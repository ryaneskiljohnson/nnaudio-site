/**
 * @fileoverview Admin growth dashboard API with site-readiness flags and core
 * business metrics for the growth operating system.
 * @module app/api/admin/growth-dashboard/route
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/service";
import {
  getAnalytics,
} from "@/app/actions/email-campaigns/analytics";
import {
  getMRR,
  getMonthlyRevenue,
  getTotalUsers,
  getYTDSales,
} from "@/utils/stripe/admin-analytics";

/**
 * @brief Returns growth metrics for the admin Growth Strategy page.
 * @returns JSON payload with readiness flags and core business metrics.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from("admins")
      .select("id")
      .eq("user", user.id)
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();

    const [
      userStats,
      mrr,
      monthlyRevenue,
      ytdSales,
      emailAnalytics,
      activeSubscribersResult,
      unsubscribedSubscribersResult,
      freeProductsResult,
      paidProductsResult,
      bundlesResult,
    ] = await Promise.all([
      getTotalUsers(),
      getMRR(),
      getMonthlyRevenue(),
      getYTDSales(),
      getAnalytics({ timeRange: "30d" }),
      adminSupabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      adminSupabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "unsubscribed"),
      (adminSupabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .or("price.eq.0,sale_price.eq.0"),
      (adminSupabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("price", 0),
      (adminSupabase as any)
        .from("bundles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers: userStats.totalUsers,
        freeUsers: userStats.freeUsers,
        activeSubscriptions: userStats.activeSubscriptions,
        mrr,
        monthlyRevenue,
        ytdSales,
        activeSubscribers: activeSubscribersResult.count ?? 0,
        unsubscribedSubscribers: unsubscribedSubscribersResult.count ?? 0,
        freeProducts: freeProductsResult.count ?? 0,
        paidProducts: paidProductsResult.count ?? 0,
        activeBundles: bundlesResult.count ?? 0,
        emailsSentLast30d: emailAnalytics.data.summary.totalSent,
        emailOpenRate: emailAnalytics.data.summary.openRate,
        emailClickRate: emailAnalytics.data.summary.clickRate,
        emailBounceRate: emailAnalytics.data.summary.bounceRate,
      },
      readiness: {
        metaPixelConfigured: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
        capiConfigured: Boolean(process.env.META_CONVERSIONS_API_TOKEN),
        gtmConfigured: Boolean(process.env.NEXT_PUBLIC_GTM_ID),
        adManagerConfigured: Boolean(
          process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
        ),
        emailConfigured: Boolean(process.env.SENDGRID_API_KEY),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/growth-dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load growth dashboard" },
      { status: 500 }
    );
  }
}
