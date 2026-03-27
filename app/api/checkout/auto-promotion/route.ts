/**
 * @fileoverview Auto-applies the highest-priority active DB promotion to the shop cart when Stripe + scope match.
 * @module app/api/checkout/auto-promotion
 *
 * ## POST
 * **Request:** `{ items: { id, price, sale_price?, quantity }[] }`
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
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";
import { resolveActivePromotionCode } from "@/utils/stripe/checkout-discount";

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

      const couponRef =
        (typeof row.stripe_coupon_code === "string" &&
          row.stripe_coupon_code.trim()) ||
        (typeof row.stripe_coupon_id === "string" &&
          row.stripe_coupon_id.trim()) ||
        "";
      if (!couponRef) continue;
      if (row.stripe_coupon_created === false) continue;

      const eligibleSubtotal = eligibleSubtotalForPromotion(
        lineItemsForPromo,
        row
      );
      if (eligibleSubtotal <= 0) continue;

      const promotionCode = await resolveActivePromotionCode(couponRef);
      if (!promotionCode) {
        console.warn(
          "[auto-promotion] Stripe promotion not resolved for",
          couponRef
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
        code: promotionCode.code || couponRef,
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
