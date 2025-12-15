/**
 * Create a 100% off Stripe coupon and promotion code for testing checkout.
 * Run with: npx tsx scripts/create-test-coupon.ts
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
  const code = "TEST100";

  // Create a 100% off, one-time coupon
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: "once",
    name: "Test 100% Off",
  });

  console.log(`Created coupon ${coupon.id} (100% off, once)`);

  // Create a promotion code for the coupon
  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    active: true,
    max_redemptions: 50, // plenty for testing
  });

  console.log(`Created promotion code ${promo.code} (${promo.id})`);
  console.log("Use this code at checkout:", promo.code);
}

main().catch((err) => {
  console.error("Error creating test coupon/promo code:", err);
  process.exit(1);
});

