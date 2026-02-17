/**
 * @fileoverview Test script: simulate getAdminStripeOrders flow (Stripe API + conversion)
 * Run: npx tsx scripts/test-stripe-orders-flow.ts
 * Verifies Stripe returns data and conversion to AdminOrder works.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import Stripe from "stripe";
import { getStripeClient } from "../utils/stripe/client";

const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("Simulating getAdminStripeOrders flow...\n");

  const effectiveLimit = 50;
  const allPaymentIntents: Stripe.PaymentIntent[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  let useExpand = true;
  let page = 0;

  while (hasMore) {
    page++;
    let response: Stripe.ApiList<Stripe.PaymentIntent>;
    try {
      response = await stripe.paymentIntents.list({
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
        ...(useExpand && {
          expand: ["data.customer", "data.latest_charge", "data.latest_charge.refunds"],
        }),
      });
    } catch (err) {
      if (useExpand) {
        console.log("Expand failed, retrying without expand...");
        useExpand = false;
        startingAfter = undefined;
        hasMore = true;
        allPaymentIntents.length = 0;
        page = 0;
        continue;
      }
      throw err;
    }

    const succeeded = response.data.filter((pi) => pi.status === "succeeded");
    allPaymentIntents.push(...succeeded);
    console.log(`Page ${page}: ${response.data.length} total, ${succeeded.length} succeeded (running total: ${allPaymentIntents.length})`);

    hasMore = response.has_more && allPaymentIntents.length < effectiveLimit;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMore = false;
    }
    if (allPaymentIntents.length >= effectiveLimit) break;
  }

  const toProcess = allPaymentIntents.slice(0, effectiveLimit);
  console.log(`\nProcessing ${toProcess.length} payment intents into AdminOrder format...`);

  const orders = toProcess.map((pi) => {
    const customer = pi.customer as Stripe.Customer | string | null;
    const customerEmail =
      customer && typeof customer === "object" && !customer.deleted && "email" in customer
        ? customer.email
        : null;

    let items: { id: string; name: string; price: number; quantity: number }[] = [];
    try {
      const cartItemsStr = pi.metadata?.cart_items;
      if (cartItemsStr) {
        items = JSON.parse(cartItemsStr);
      }
    } catch {
      /* ignore */
    }
    if (items.length === 0) {
      const source =
        pi.metadata?.Reseller ? `Reseller: ${pi.metadata.Reseller}` :
        pi.metadata?.purchase_type === "lifetime" ? "Lifetime subscription" :
        pi.metadata?.POnumber ? "Reseller order" :
        "Stripe payment";
      items = [{ id: pi.id, name: source, price: pi.amount / 100, quantity: 1 }];
    }

    return {
      id: pi.id,
      orderNumber: pi.id.substring(3, 11).toUpperCase(),
      date: new Date(pi.created * 1000).toISOString(),
      amount: pi.amount / 100,
      items: items.length,
      customerEmail: customerEmail ?? "(none)",
    };
  });

  console.log(`\n--- Result: ${orders.length} AdminOrder objects ---`);
  orders.slice(0, 5).forEach((o, i) => {
    console.log(`${i + 1}. ${o.orderNumber} | $${o.amount.toFixed(2)} | ${o.items} item(s) | ${o.customerEmail}`);
  });
  if (orders.length > 5) {
    console.log(`... and ${orders.length - 5} more`);
  }

  if (orders.length === 0) {
    console.log("\n⚠️ No orders returned. Check STRIPE_SECRET_KEY (test vs live) and Stripe dashboard.");
  } else {
    console.log("\n✅ Stripe API + conversion pipeline works. If UI still empty, check auth (admin check) or browser cache.");
  }
}

main().catch(console.error);
