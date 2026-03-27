/**
 * @fileoverview Auto-applies the highest-priority active DB promotion for shop cart or embedded bundle checkout.
 * @module app/api/checkout/auto-promotion
 *
 * ## POST (cart)
 * **Request:** `{ items: { id, price, sale_price?, quantity }[] }`
 *
 * ## POST (bundle — `/checkout/bundle` Elements flow)
 * **Request:** `{ bundle_slug: string, tier: "monthly" | "annual" | "lifetime" }`
 *
 * **200 applied:** `{ success: true, applied: true, promotionCodeId, code, discount: { amount, percent } }`
 * **200 skip:** `{ success: true, applied: false }`
 * **503:** Stripe not configured
 * **500:** Server error
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/utils/stripe/client";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { isPSTDateAfterNow, isPSTDateBeforeNow } from "@/utils/timezoneUtils";
import {
  discountAmountForEligibleSubtotal,
  eligibleSubtotalForPromotion,
  promotionHasApplicableTargets,
  promotionIncludesBundleTier,
  type PlanTypeKey,
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";
import { resolvePromotionCodeFromPromotionRow } from "@/utils/stripe/checkout-discount";

type BodyItem = {
  id: string;
  price: number;
  sale_price?: number | null;
  quantity: number;
};

/**
 * @brief POST — resolve auto promo for cart PaymentIntents.
 * @param request JSON body with `items` array.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { success: false, error: "Stripe not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const bundleSlugRaw = body.bundle_slug;
    const bundleTierRaw = body.tier;
    const bundleSlug =
      typeof bundleSlugRaw === "string" ? bundleSlugRaw.trim() : "";
    const bundleTierOk =
      bundleTierRaw === "monthly" ||
      bundleTierRaw === "annual" ||
      bundleTierRaw === "lifetime";

    if (bundleSlug && bundleTierOk) {
      const supabase = await createSupabaseServiceRole();
      const { data: bundleRow, error: bundleErr } = await (supabase as any)
        .from("bundles")
        .select("id")
        .eq("slug", bundleSlug)
        .eq("status", "active")
        .maybeSingle();

      if (bundleErr) {
        console.error("[auto-promotion] bundle load", bundleErr);
        return NextResponse.json(
          { success: false, error: "Failed to load bundle" },
          { status: 500 }
        );
      }

      if (!bundleRow?.id) {
        return NextResponse.json({ success: true, applied: false });
      }

      const { data: tierRow } = await (supabase as any)
        .from("bundle_subscription_tiers")
        .select("price, sale_price")
        .eq("bundle_id", bundleRow.id)
        .eq("subscription_type", bundleTierRaw)
        .eq("active", true)
        .maybeSingle();

      const baseAmount = Number(
        tierRow?.sale_price ?? tierRow?.price ?? 0
      );
      if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        return NextResponse.json({ success: true, applied: false });
      }

      const { data: promoRows, error: promoError } = await (supabase as any)
        .from("promotions")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false });

      if (promoError) {
        console.error("[auto-promotion] promotions query (bundle)", promoError);
        return NextResponse.json(
          { success: false, error: "Failed to load promotions" },
          { status: 500 }
        );
      }

      for (const p of promoRows || []) {
        const row = p as PromotionPricingRow & {
          stripe_coupon_code?: string | null;
          stripe_coupon_id?: string | null;
          stripe_coupon_created?: boolean | null;
          start_date?: string | null;
          end_date?: string | null;
        };

        if (row.start_date && isPSTDateAfterNow(row.start_date)) continue;
        if (row.end_date && isPSTDateBeforeNow(row.end_date)) continue;
        if (!promotionHasApplicableTargets(row)) continue;
        if (
          !promotionIncludesBundleTier(
            row,
            bundleRow.id as string,
            bundleTierRaw as PlanTypeKey
          )
        ) {
          continue;
        }
        if (row.stripe_coupon_created === false) continue;

        const promotionCode = await resolvePromotionCodeFromPromotionRow(row);
        if (!promotionCode) {
          console.warn(
            "[auto-promotion] bundle: Stripe promotion not resolved for row",
            (p as { id?: string }).id
          );
          continue;
        }

        const promotion = promotionCode.promotion;
        const couponRefFromStripe =
          promotion?.type === "coupon" ? promotion.coupon : null;
        const coupon =
          couponRefFromStripe == null
            ? null
            : typeof couponRefFromStripe === "string"
              ? await stripe.coupons.retrieve(couponRefFromStripe)
              : couponRefFromStripe;

        if (!coupon?.valid) continue;

        const discountAmount = discountAmountForEligibleSubtotal(
          baseAmount,
          coupon
        );
        const discountPercent =
          baseAmount > 0
            ? Math.round((discountAmount / baseAmount) * 100)
            : 0;

        return NextResponse.json({
          success: true,
          applied: true,
          promotionCodeId: promotionCode.id,
          code: promotionCode.code || row.stripe_coupon_code || "",
          discount: {
            amount: discountAmount,
            percent: discountPercent,
          },
        });
      }

      return NextResponse.json({ success: true, applied: false });
    }

    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ success: true, applied: false });
    }

    const items: BodyItem[] = [];
    for (const x of rawItems) {
      if (
        x == null ||
        typeof x !== "object" ||
        typeof (x as BodyItem).id !== "string" ||
        typeof (x as BodyItem).quantity !== "number"
      ) {
        continue;
      }
      const price = Number((x as BodyItem).price);
      if (!Number.isFinite(price)) continue;
      items.push({
        id: (x as BodyItem).id,
        price,
        sale_price: (x as BodyItem).sale_price,
        quantity: Math.max(1, Math.floor((x as BodyItem).quantity)),
      });
    }

    if (items.length === 0) {
      return NextResponse.json({ success: true, applied: false });
    }

    const supabase = await createSupabaseServiceRole();
    const { data: promoRows, error } = await (supabase as any)
      .from("promotions")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: false });

    if (error) {
      console.error("[auto-promotion] promotions query", error);
      return NextResponse.json(
        { success: false, error: "Failed to load promotions" },
        { status: 500 }
      );
    }

    const lineItemsForPromo = items.map((item) => {
      const unit =
        item.sale_price !== null &&
        item.sale_price !== undefined &&
        Number.isFinite(Number(item.sale_price))
          ? Number(item.sale_price)
          : item.price;
      return { id: item.id, lineTotal: unit * item.quantity };
    });

    const baseAmount = lineItemsForPromo.reduce((s, i) => s + i.lineTotal, 0);
    if (baseAmount <= 0) {
      return NextResponse.json({ success: true, applied: false });
    }

    for (const p of promoRows || []) {
      const row = p as PromotionPricingRow & {
        stripe_coupon_code?: string | null;
        stripe_coupon_id?: string | null;
        stripe_coupon_created?: boolean | null;
      };

      if (row.start_date && isPSTDateAfterNow(row.start_date)) continue;
      if (row.end_date && isPSTDateBeforeNow(row.end_date)) continue;
      if (!promotionHasApplicableTargets(row)) continue;

      if (row.stripe_coupon_created === false) continue;

      const eligibleSubtotal = eligibleSubtotalForPromotion(
        lineItemsForPromo,
        row
      );
      if (eligibleSubtotal <= 0) continue;

      const promotionCode = await resolvePromotionCodeFromPromotionRow(row);
      if (!promotionCode) {
        console.warn(
          "[auto-promotion] Stripe promotion not resolved for promotion row",
          (p as { id?: string }).id
        );
        continue;
      }

      const promotion = promotionCode.promotion;
      const couponRefFromStripe =
        promotion?.type === "coupon" ? promotion.coupon : null;
      const coupon =
        couponRefFromStripe == null
          ? null
          : typeof couponRefFromStripe === "string"
            ? await stripe.coupons.retrieve(couponRefFromStripe)
            : couponRefFromStripe;

      if (!coupon?.valid) continue;

      const discountAmount = discountAmountForEligibleSubtotal(
        eligibleSubtotal,
        coupon
      );
      const discountPercent =
        baseAmount > 0
          ? Math.round((discountAmount / baseAmount) * 100)
          : 0;

      return NextResponse.json({
        success: true,
        applied: true,
        promotionCodeId: promotionCode.id,
        code:
          promotionCode.code ||
          (typeof row.stripe_coupon_code === "string"
            ? row.stripe_coupon_code
            : "") ||
          "",
        discount: {
          amount: discountAmount,
          percent: discountPercent,
        },
      });
    }

    return NextResponse.json({ success: true, applied: false });
  } catch (e) {
    console.error("[auto-promotion]", e);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
