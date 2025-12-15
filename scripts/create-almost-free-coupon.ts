/**
 * Create a ~99.9% off Stripe coupon/promo code (uses 99% because Stripe percent_off must be an integer).
 * Run with: npx tsx scripts/create-almost-free-coupon.ts
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY in environment");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

async function main() {
  const code = "ALMOSTFREE";

  // Stripe percent_off must be an integer (1-100). Use 99% to approximate 99.9%.
  const coupon = await stripe.coupons.create({
    percent_off: 99,
    duration: "once",
    name: "Test ~99.9% Off (99%)",
  });

  console.log(`Created coupon ${coupon.id} (99% off, once)`);

  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    active: true,
    max_redemptions: 50,
  });

  console.log(`Created promotion code ${promo.code} (${promo.id})`);
  console.log("Use this code at checkout:", promo.code);
  console.log("Note: Stripe only supports integer percent_off; this is 99%.");
}

main().catch((err) => {
  console.error("Error creating almost-free coupon/promo code:", err);
  process.exit(1);
});

