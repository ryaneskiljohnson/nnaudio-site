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
