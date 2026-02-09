/**
 * @fileoverview Debug script - run Stripe orders API requests manually (getOrders pattern)
 * @module scripts/debug-orders-api
 *
 * Usage: npx dotenv -e .env.local -- npx tsx scripts/debug-orders-api.ts [user_id]
 * Or:    bun run scripts/debug-orders-api.ts [user_id]
 *
 * If no user_id, uses first profile with customer_id.
 */

import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not set");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Supabase env vars not set");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-02-24.acacia" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const userIdArg = process.argv[2];

  // Get profile
  let profile: { id: string; email: string | null; customer_id: string | null };
  if (userIdArg) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, customer_id")
      .eq("id", userIdArg)
      .single();
    if (error || !data) {
      console.error("❌ Profile not found:", error?.message || "No data");
      process.exit(1);
    }
    profile = data;
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, customer_id")
      .not("customer_id", "is", null)
      .limit(1)
      .single();
    if (error || !data) {
      console.error("❌ No profile with customer_id found. Pass user_id as arg.");
      process.exit(1);
    }
    profile = data;
  }

  console.log("\n📋 Profile:", { id: profile.id, email: profile.email, customer_id: profile.customer_id });
  const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();

  // Method 1: By customer_id
  if (profile.customer_id) {
    console.log("\n🔹 Method 1: stripe.paymentIntents.list({ customer: ... })");
    try {
      const res = await stripe.paymentIntents.list({
        customer: profile.customer_id,
        limit: 100,
      });
      res.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
      console.log(`   ✅ Found ${res.data.length} payment intents`);
    } catch (e: any) {
      console.log(`   ❌ Error:`, e.message);
    }
  } else {
    console.log("\n🔹 Method 1: Skipped (no customer_id)");
  }

  // Method 2: Search by metadata user_id
  console.log("\n🔹 Method 2: stripe.paymentIntents.search({ query: metadata['user_id'] })");
  try {
    const res = await stripe.paymentIntents.search({
      query: `metadata['user_id']:'${profile.id}'`,
      limit: 100,
    });
    res.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
    console.log(`   ✅ Found ${res.data.length} payment intents`);
  } catch (e: any) {
    console.log(`   ❌ Error:`, e.message);
  }

  // Method 3: By email -> customers -> payment intents
  if (profile.email) {
    console.log("\n🔹 Method 3: stripe.customers.list({ email }) -> paymentIntents per customer");
    try {
      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 10,
      });
      console.log(`   Found ${customers.data.length} customers by email`);
      for (const c of customers.data) {
        const res = await stripe.paymentIntents.list({
          customer: c.id,
          limit: 100,
        });
        res.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
        console.log(`   Customer ${c.id}: ${res.data.length} payment intents`);
      }
    } catch (e: any) {
      console.log(`   ❌ Error:`, e.message);
    }
  } else {
    console.log("\n🔹 Method 3: Skipped (no email)");
  }

  const paymentIntents = Array.from(allPaymentIntents.values());
  const succeeded = paymentIntents.filter((pi) => pi.status === "succeeded");

  console.log("\n📊 Summary:");
  console.log(`   Total unique payment intents: ${paymentIntents.length}`);
  console.log(`   Succeeded: ${succeeded.length}`);

  if (succeeded.length > 0) {
    console.log("\n📦 Succeeded payment intents:");
    succeeded.slice(0, 5).forEach((pi) => {
      const cart = pi.metadata?.cart_items ? "yes" : "no";
      console.log(`   - ${pi.id} | status=${pi.status} | cart_items=${cart} | created=${new Date(pi.created * 1000).toISOString()}`);
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
