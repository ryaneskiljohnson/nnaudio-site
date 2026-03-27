/**
 * @fileoverview Resolves DB-stored coupon references to Stripe Checkout `discounts` entries or PaymentIntent promo codes.
 * @module utils/stripe/checkout-discount
 */

import Stripe from "stripe";
import { stripe } from "@/utils/stripe/client";

/**
 * @brief Finds an active Promotion Code for a stored coupon id, `promo_*` id, or customer-facing code (case variants).
 * @param stored Value from `promotions.stripe_coupon_code` or `stripe_coupon_id`.
 * @returns Active promotion code, or null.
 */
export async function resolveActivePromotionCode(
  stored: string
): Promise<Stripe.PromotionCode | null> {
  const s = stored.trim();
  if (!s) return null;

  if (s.startsWith("promo_")) {
    try {
      const pc = await stripe.promotionCodes.retrieve(s);
      return pc.active ? pc : null;
    } catch {
      return null;
    }
  }

  try {
    const c = await stripe.coupons.retrieve(s);
    if (c.valid) {
      const { data } = await stripe.promotionCodes.list({
        coupon: c.id,
        active: true,
        limit: 20,
      });
      const want = s.toUpperCase();
      const byCode = data.find((pc) => (pc.code || "").toUpperCase() === want);
      if (byCode) return byCode;
      if (data.length > 0) return data[0];
    }
  } catch {
    /* not a coupon id */
  }

  const variants = [...new Set([s, s.toUpperCase(), s.toLowerCase()])];
  for (const code of variants) {
    try {
      const { data } = await stripe.promotionCodes.list({
        code,
        active: true,
        limit: 5,
      });
      const hit = data.find((pc) => pc.active);
      if (hit) return hit;
    } catch {
      /* continue */
    }
  }

  return null;
}

/**
 * @brief Maps a DB coupon reference to Checkout Session `discounts[0]` (prefers `promotion_code` when resolvable).
 * @param stored Coupon id, `promo_*`, or code string from the promotions table.
 * @returns Discount param for `checkout.sessions.create`, or null.
 */
export async function buildStripeCheckoutDiscount(
  stored: string
): Promise<Stripe.Checkout.SessionCreateParams.Discount | null> {
  const pc = await resolveActivePromotionCode(stored);
  if (pc) {
    return { promotion_code: pc.id };
  }
  const s = stored.trim();
  if (!s) return null;
  try {
    const c = await stripe.coupons.retrieve(s);
    if (c.valid) {
      return { coupon: c.id };
    }
  } catch {
    /* */
  }
  return null;
}

/** @brief Fields on `promotions` used to resolve Stripe Checkout discounts. */
export type PromotionStripeCouponFields = {
  stripe_coupon_code?: string | null;
  stripe_coupon_id?: string | null;
};

/**
 * @brief Resolves an active Stripe Promotion Code from DB fields (tries code string, then id).
 * @param row Promotion row coupon columns.
 * @returns Active `PromotionCode`, or null.
 */
export async function resolvePromotionCodeFromPromotionRow(
  row: PromotionStripeCouponFields
): Promise<Stripe.PromotionCode | null> {
  const code =
    typeof row.stripe_coupon_code === "string"
      ? row.stripe_coupon_code.trim()
      : "";
  const id =
    typeof row.stripe_coupon_id === "string"
      ? row.stripe_coupon_id.trim()
      : "";
  const refs: string[] = [];
  if (code) refs.push(code);
  if (id && id !== code) refs.push(id);
  for (const stored of refs) {
    const pc = await resolveActivePromotionCode(stored);
    if (pc) return pc;
  }
  return null;
}

/**
 * @brief Expands a Checkout `discounts` entry to `{ coupon }` when it used `promotion_code`, for subscription mode reliability.
 * @param discount Session discount from `buildStripeCheckoutDiscount`.
 * @returns Same shape or `{ coupon: underlying id }` when resolvable.
 * @note Uses `expand: ['promotion.coupon']` so the underlying coupon id is always available.
 */
export async function preferCouponDiscountForSubscription(
  discount: Stripe.Checkout.SessionCreateParams.Discount
): Promise<Stripe.Checkout.SessionCreateParams.Discount> {
  if (discount.coupon) return discount;
  const promoId = discount.promotion_code;
  if (!promoId || typeof promoId !== "string") return discount;
  try {
    const pc = await stripe.promotionCodes.retrieve(promoId, {
      expand: ["promotion.coupon"],
    });
    if (!pc.active) return discount;
    const prom = pc.promotion as
      | string
      | { type?: string; coupon?: string | Stripe.Coupon }
      | null
      | undefined;
    if (typeof prom === "string") return discount;
    const cref = prom?.coupon;
    const couponId =
      typeof cref === "string"
        ? cref
        : cref && typeof cref === "object" && "id" in cref
          ? (cref as Stripe.Coupon).id
          : null;
    if (!couponId) return discount;
    const c = await stripe.coupons.retrieve(couponId);
    if (c.valid) return { coupon: c.id };
  } catch (e) {
    console.warn(
      "[checkout-discount] preferCouponDiscountForSubscription",
      e
    );
  }
  return discount;
}

/**
 * @brief Resolves discount from a promotion row, trying customer-facing code then coupon/promo id.
 * @param row `stripe_coupon_code` / `stripe_coupon_id` from DB.
 * @param options When `subscriptionMode`, normalizes `promotion_code` to `{ coupon }` when possible.
 * @returns First resolvable Checkout discount, or null.
 * @note If `stripe_coupon_code` is stale but `stripe_coupon_id` is valid, the second ref still runs.
 */
export async function buildStripeCheckoutDiscountFromPromotionRow(
  row: PromotionStripeCouponFields,
  options?: { subscriptionMode?: boolean }
): Promise<Stripe.Checkout.SessionCreateParams.Discount | null> {
  const code =
    typeof row.stripe_coupon_code === "string"
      ? row.stripe_coupon_code.trim()
      : "";
  const id =
    typeof row.stripe_coupon_id === "string"
      ? row.stripe_coupon_id.trim()
      : "";
  const refs: string[] = [];
  if (code) refs.push(code);
  if (id && id !== code) refs.push(id);
  for (const stored of refs) {
    let d = await buildStripeCheckoutDiscount(stored);
    if (options?.subscriptionMode && d) {
      d = await preferCouponDiscountForSubscription(d);
    }
    if (d) return d;
  }
  return null;
}
