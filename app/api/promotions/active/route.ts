/**
 * @fileoverview Returns the highest-priority active promotion, optional tier filter, and subscription-checkout tier hints.
 * @module app/api/promotions/active/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isPSTDateAfterNow, isPSTDateBeforeNow } from "@/utils/timezoneUtils";
import { getMembershipProductSlug } from "@/utils/products/membership-product";
import {
  PLAN_TYPES,
  promotionIncludesProductTier,
  subscriptionTiersForProduct,
  type PlanTypeKey,
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";

const TIERS = new Set<string>(["monthly", "annual", "lifetime"]);

/**
 * @brief GET — active promotion for banner, pricing, or conversion tracking.
 * @param request Query: `plan` or `tier` (optional) = subscription tier; `product_slug` (optional) defaults to membership slug env.
 * @returns JSON `{ success, promotion, count, subscription_checkout_tiers }` with cache headers, or 500.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tierRaw =
      searchParams.get("tier")?.toLowerCase() ||
      searchParams.get("plan")?.toLowerCase() ||
      null;
    const productSlug =
      searchParams.get("product_slug")?.trim() ||
      getMembershipProductSlug();

    const supabase = await createClient();

    let subscriptionProductId: string | null = null;
    try {
      const { data: row } = await (supabase as any)
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .maybeSingle();
      if (row?.id) subscriptionProductId = row.id as string;
    } catch (e) {
      console.warn("[promotions/active] membership product lookup failed", e);
    }

    const query = (supabase as any)
      .from("promotions")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: false });

    const { data: promotions, error } = await query;

    if (error) {
      console.error("Error fetching active promotions:", error);
      return NextResponse.json(
        { error: "Failed to fetch promotions" },
        { status: 500 }
      );
    }

    const filtered =
      promotions?.filter((promo: PromotionPricingRow) => {
        if (promo.start_date && isPSTDateAfterNow(promo.start_date)) {
          return false;
        }
        if (promo.end_date && isPSTDateBeforeNow(promo.end_date)) {
          return false;
        }

        if (tierRaw && TIERS.has(tierRaw) && subscriptionProductId) {
          if (
            !promotionIncludesProductTier(
              promo,
              subscriptionProductId,
              tierRaw as PlanTypeKey
            )
          ) {
            return false;
          }
        }

        return true;
      }) || [];

    const activePromotion =
      (filtered[0] as PromotionPricingRow | undefined) ?? null;

    let subscription_checkout_tiers: PlanTypeKey[] = [];
    if (activePromotion) {
      if (activePromotion.promotion_target_mode === "all") {
        subscription_checkout_tiers = [...PLAN_TYPES];
      } else if (subscriptionProductId) {
        subscription_checkout_tiers = subscriptionTiersForProduct(
          activePromotion,
          subscriptionProductId
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        promotion: activePromotion,
        count: filtered.length,
        subscription_checkout_tiers,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/promotions/active:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
