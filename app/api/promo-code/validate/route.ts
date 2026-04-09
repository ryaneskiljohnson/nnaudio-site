/**
 * @fileoverview Validates Stripe promotion codes for checkout; respects DB promotion scope and exclusions.
 * @module app/api/promo-code/validate/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from "@/utils/stripe/client";
import { createClient } from '@/utils/supabase/server';
import {
  discountAmountForEligibleSubtotal,
  eligibleSubtotalForPromotion,
  type PromotionPricingRow,
} from '@/utils/promotions/apply-promotion';

/**
 * @brief POST handler: validates code and returns discount preview.
 * @param request JSON body: `code`, `amount` (cart total dollars), optional `items` with `id` + `lineTotal`.
 * @returns 200 with discount breakdown or 4xx/5xx with `error`. `discount.percent` is Stripe
 * `percent_off` when the coupon is percent-based; otherwise `0` (fixed-amount coupons use `discount.amount` only).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, amount } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const rawItems = body.items;
    const lineItems =
      Array.isArray(rawItems) &&
      rawItems.every(
        (x: unknown) =>
          x !== null &&
          typeof x === 'object' &&
          typeof (x as { id?: unknown }).id === 'string' &&
          typeof (x as { lineTotal?: unknown }).lineTotal === 'number' &&
          Number.isFinite((x as { lineTotal: number }).lineTotal)
      )
        ? (rawItems as { id: string; lineTotal: number }[]).map((x) => ({
            id: x.id,
            lineTotal: x.lineTotal,
          }))
        : undefined;

    const baseAmount =
      lineItems && lineItems.length > 0
        ? lineItems.reduce((s, i) => s + i.lineTotal, 0)
        : Number(amount);

    if (!baseAmount || baseAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const promotionCodes = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    const promotionCode = promotionCodes.data[0];
    const promotion = promotionCode.promotion;
    const couponRef = promotion?.type === "coupon" ? promotion.coupon : null;
    const coupon =
      couponRef == null
        ? null
        : typeof couponRef === "string"
          ? await stripe.coupons.retrieve(couponRef)
          : couponRef;

    if (!coupon) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    if (!coupon.valid) {
      return NextResponse.json(
        { error: 'This promo code is no longer valid' },
        { status: 400 }
      );
    }

    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit' },
        { status: 400 }
      );
    }

    if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 }
      );
    }

    let dbPromotion: PromotionPricingRow | null = null;
    try {
      const supabase = await createClient();
      const { data } = await (supabase as any)
        .from('promotions')
        .select('promotion_target_mode, included_targets, discount_type, discount_value')
        .eq('stripe_coupon_code', coupon.id)
        .maybeSingle();
      if (data) {
        dbPromotion = data as PromotionPricingRow;
      }
    } catch (e) {
      console.warn('[promo-code/validate] promotions lookup failed', e);
    }

    const eligibleSubtotal = lineItems?.length
      ? eligibleSubtotalForPromotion(lineItems, dbPromotion)
      : baseAmount;

    if (lineItems?.length && eligibleSubtotal <= 0) {
      return NextResponse.json(
        {
          error:
            'This promotion does not apply to any items in your cart.',
        },
        { status: 400 }
      );
    }

    const discountAmount = discountAmountForEligibleSubtotal(eligibleSubtotal, coupon);
    /**
     * Stripe percent discount for display only. Must not be derived from cart ratio:
     * a fixed $10 off on a $100 cart would otherwise read as 10 and the checkout UI
     * would show "10% off" instead of "$10.00 off".
     */
    const discountPercent =
      coupon.percent_off != null && coupon.percent_off > 0
        ? coupon.percent_off
        : 0;

    const finalAmount = Math.max(0, baseAmount - discountAmount);

    return NextResponse.json({
      success: true,
      promotionCode: {
        id: promotionCode.id,
        code: promotionCode.code,
      },
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
      },
      discount: {
        amount: discountAmount,
        percent: discountPercent,
      },
      originalAmount: baseAmount,
      finalAmount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate promo code';
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
