/**
 * Debug script: fetch Stripe payment intents and log what we get
 * Run: npx dotenv -e .env.local -- npx tsx scripts/debug-stripe-orders.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import Stripe from "stripe";
import { getStripeClient } from "../utils/stripe/client";

const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("Fetching Stripe payment intents...\n");

  const all: Stripe.PaymentIntent[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  let page = 0;

  while (hasMore) {
    page++;
    const response = await stripe.paymentIntents.list({
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    console.log(`Page ${page}: got ${response.data.length} payment intents`);
    all.push(...response.data);

    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  console.log(`\nTotal payment intents: ${all.length}`);

  const succeeded = all.filter((pi) => pi.status === "succeeded");
  console.log(`Succeeded: ${succeeded.length}`);

  const withCartItems = succeeded.filter((pi) => pi.metadata?.cart_items);
  console.log(`With cart_items (product purchases): ${withCartItems.length}`);

  const withOtherMetadata = succeeded.filter((pi) => !pi.metadata?.cart_items && Object.keys(pi.metadata || {}).length > 0);
  console.log(`Succeeded with other metadata (no cart_items): ${withOtherMetadata.length}`);

  if (succeeded.length > 0) {
    console.log("\n--- Sample succeeded payment intents (first 5) ---");
    succeeded.slice(0, 5).forEach((pi, i) => {
      console.log(`\n${i + 1}. ${pi.id}`);
      console.log(`   status: ${pi.status}, amount: ${pi.amount / 100} ${pi.currency}`);
      console.log(`   metadata keys: ${Object.keys(pi.metadata || {}).join(", ") || "(none)"}`);
      if (pi.metadata?.cart_items) {
        console.log(`   cart_items: (present, ${(pi.metadata.cart_items as string).length} chars)`);
      }
      if (pi.metadata?.purchase_type) {
        console.log(`   purchase_type: ${pi.metadata.purchase_type}`);
      }
    });
  }

  if (withCartItems.length > 0) {
    console.log("\n--- Product orders (cart_items) ---");
    withCartItems.slice(0, 3).forEach((pi, i) => {
      const items = JSON.parse(pi.metadata!.cart_items as string);
      console.log(`${i + 1}. ${pi.id}: ${items.length} items`);
    });
  }

  if (all.length === 0) {
    console.log("\nNo payment intents found. Check Stripe dashboard and API key (test vs live).");
  }
}

main().catch(console.error);
