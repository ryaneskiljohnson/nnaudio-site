/**
 * @fileoverview One-off script to fetch payment methods for a customer by email from Stripe
 * @module scripts/stripe-check-payment-methods
 * Run: bun run scripts/stripe-check-payment-methods.ts
 */

import "dotenv/config";
import { config } from "dotenv";
import path from "path";
import Stripe from "stripe";

// Load .env.local (Next.js convention)
config({ path: path.resolve(process.cwd(), ".env.local") });

const EMAIL = "support@newnationllc.com";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY not set in .env.local");
    process.exit(1);
  }

  const stripe = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });

  console.log("Looking up Stripe customer by email:", EMAIL);

  const customers = await stripe.customers.list({
    email: EMAIL,
    limit: 10,
  });

  if (customers.data.length === 0) {
    console.log("No Stripe customer found with email:", EMAIL);
    return;
  }

  for (const customer of customers.data) {
    console.log("\n--- Customer ---");
    console.log("ID:", customer.id);
    console.log("Email:", customer.email);
    console.log(
      "Default payment method (invoice_settings):",
      customer.invoice_settings?.default_payment_method ?? "(none)"
    );
    console.log("Default source:", customer.default_source ?? "(none)");

    const customerId = customer.id;

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
    console.log("\nPaymentMethods API (type=card):", paymentMethods.data.length);
    paymentMethods.data.forEach((pm, i) => {
      console.log(
        `  [${i + 1}] ${pm.id} ${pm.card?.brand} ****${pm.card?.last4} exp ${pm.card?.exp_month}/${pm.card?.exp_year}`
      );
    });

    const sources = await stripe.customers.listSources(customerId, {
      object: "card",
      limit: 100,
    });
    console.log("\nSources API (object=card):", sources.data.length);
    sources.data.forEach((src: any, i: number) => {
      console.log(
        `  [${i + 1}] ${src.id} ${src.brand} ****${src.last4} exp ${src.exp_month}/${src.exp_year}`
      );
    });

    // Subscriptions (card might be on subscription default_payment_method)
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
      expand: ["data.default_payment_method", "data.latest_invoice.payment_intent"],
    });
    console.log("\nSubscriptions:", subs.data.length);
    for (let i = 0; i < subs.data.length; i++) {
      const sub = subs.data[i];
      const pm = sub.default_payment_method;
      const pmId = typeof pm === "string" ? pm : (pm as any)?.id;
      const card = typeof pm === "object" && pm && "card" in pm ? (pm as any).card : null;
      console.log(
        `  [${i + 1}] ${sub.id} status=${sub.status} default_pm=${pmId || "(none)"} ${card ? `****${card.last4}` : ""}`
      );
      const latestInvoice = sub.latest_invoice;
      const invId = typeof latestInvoice === "string" ? latestInvoice : (latestInvoice as any)?.id;
      if (invId) {
        const inv = await stripe.invoices.retrieve(invId, { expand: ["payment_intent.payment_method"] });
        const pi = (inv as any).payment_intent;
        if (pi?.payment_method) {
          const pmObj = typeof pi.payment_method === "object" ? pi.payment_method : await stripe.paymentMethods.retrieve(pi.payment_method as string);
          const c = (pmObj as any).card;
          console.log(`      Latest invoice payment_method: ${(pmObj as any).id} ${c ? `${c.brand} ****${c.last4}` : ""}`);
        }
      }
    }

    // All payment methods (any type) to be thorough
    const allPms = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 100,
    });
    console.log("\nPaymentMethods API (all types):", allPms.data.length);
    allPms.data.forEach((pm, i) => {
      const card = pm.card;
      console.log(
        `  [${i + 1}] ${pm.id} type=${pm.type} ${card ? `${card.brand} ****${card.last4}` : "(no card)"}`
      );
    });

    console.log("\n--- End customer ---");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
