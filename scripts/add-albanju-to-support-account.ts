import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeKey = process.env.STRIPE_SECRET_KEY!;

if (!supabaseUrl || !supabaseKey || !stripeKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-02-24.acacia",
});

const USER_EMAIL = "support@newnationllc.com";

async function main() {
  console.log("🔍 Checking purchases for:", USER_EMAIL);
  console.log("=".repeat(60));

  // 1. Find user in Supabase
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email === USER_EMAIL);

  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (${user.id})\n`);

  // 2. Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.error("❌ Profile not found");
    process.exit(1);
  }

  console.log(`📧 Email: ${profile.email}`);
  console.log(`💳 Customer ID: ${profile.customer_id || "None"}\n`);

  // 3. Find or create Stripe customer
  let customerId = profile.customer_id;

  if (!customerId) {
    console.log("🔍 Searching for Stripe customer by email...");
    const customers = await stripe.customers.list({
      email: USER_EMAIL,
      limit: 10,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`✅ Found existing customer: ${customerId}`);
      
      // Update profile with customer ID
      await supabase
        .from("profiles")
        .update({ customer_id: customerId })
        .eq("id", user.id);
    } else {
      console.log("📝 Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: USER_EMAIL,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log(`✅ Created customer: ${customerId}`);
      
      // Update profile with customer ID
      await supabase
        .from("profiles")
        .update({ customer_id: customerId })
        .eq("id", user.id);
    }
  }

  // 4. Check current purchases
  console.log("\n📦 Checking current purchases...");
  const paymentIntents = await stripe.paymentIntents.list({
    customer: customerId,
    limit: 100,
  });

  const successfulPayments = paymentIntents.data.filter(
    (pi) => pi.status === "succeeded"
  );

  console.log(`Found ${successfulPayments.length} successful payments\n`);

  const purchasedProductIds = new Set<string>();

  for (const pi of successfulPayments) {
    try {
      const cartItemsStr = pi.metadata?.cart_items;
      if (cartItemsStr) {
        const items = JSON.parse(cartItemsStr);
        for (const item of items) {
          if (item.id) {
            purchasedProductIds.add(item.id);
            console.log(`  ✅ Purchased: ${item.name || item.id}`);
          }
        }
      }
    } catch (e) {
      // Skip if parsing fails
    }
  }

  // 5. Find Albanju product
  console.log("\n🔍 Finding Albanju product...");
  const { data: albanju } = await supabase
    .from("products")
    .select("id, name, slug, price, stripe_price_id")
    .ilike("name", "%albanju%")
    .eq("status", "active")
    .single();

  if (!albanju) {
    console.error("❌ Albanju product not found in database");
    process.exit(1);
  }

  console.log(`✅ Found: ${albanju.name} (${albanju.id})`);
  console.log(`   Slug: ${albanju.slug}`);
  console.log(`   Price: $${albanju.price}`);
  console.log(`   Stripe Price ID: ${albanju.stripe_price_id || "None"}\n`);

  // Check if already purchased
  if (purchasedProductIds.has(albanju.id)) {
    console.log("✅ Albanju is already in purchased products!");
    return;
  }

  // 6. Create 100% off coupon
  console.log("🎫 Creating 100% off coupon...");
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: "once",
    name: "Free Albanju - Support Account",
    metadata: {
      product_id: albanju.id,
      user_id: user.id,
      reason: "support_account_grant",
    },
  });
  console.log(`✅ Created coupon: ${coupon.id}\n`);

  // 7. Get or create Stripe price for Albanju
  let priceId = albanju.stripe_price_id;

  if (!priceId) {
    console.log("⚠️  No Stripe price ID found. Creating price...");
    
    // Create a product in Stripe if needed
    let stripeProductId: string | undefined;
    
    // Check if product exists in Stripe
    const products = await stripe.products.search({
      query: `name:'${albanju.name}'`,
      limit: 1,
    });

    if (products.data.length > 0) {
      stripeProductId = products.data[0].id;
      console.log(`✅ Found Stripe product: ${stripeProductId}`);
    } else {
      const stripeProduct = await stripe.products.create({
        name: albanju.name,
        description: albanju.slug,
        metadata: {
          product_id: albanju.id,
        },
      });
      stripeProductId = stripeProduct.id;
      console.log(`✅ Created Stripe product: ${stripeProductId}`);
    }

    // Create price
    const price = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: Math.round((albanju.price || 0) * 100), // Convert to cents
      currency: "usd",
    });
    priceId = price.id;
    console.log(`✅ Created price: ${priceId}`);

    // Update product in database
    await supabase
      .from("products")
      .update({ stripe_price_id: priceId })
      .eq("id", albanju.id);
  }

  // 8. Create invoice with 100% discount
  console.log("\n📄 Creating invoice...");
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 0,
    metadata: {
      product_id: albanju.id,
      user_id: user.id,
      purchase_type: "individual_product",
      reason: "support_account_grant",
    },
    description: `Purchase: ${albanju.name}`,
  });

  console.log(`✅ Created invoice: ${invoice.id}`);

  // 9. Add line item
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    price: priceId,
    quantity: 1,
    description: albanju.name,
  });

  console.log("✅ Added line item");

  // 10. Apply coupon
  await stripe.invoices.update(invoice.id, {
    discounts: [{ coupon: coupon.id }],
  });

  console.log("✅ Applied 100% coupon");

  // 11. Finalize invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
  console.log("✅ Finalized invoice");

  // 12. Mark as paid (since it's $0) - handle if already paid
  if (finalizedInvoice.amount_due === 0) {
    try {
      await stripe.invoices.pay(invoice.id);
      console.log("✅ Marked invoice as paid");
    } catch (error: any) {
      if (error.message?.includes("already paid")) {
        console.log("✅ Invoice already paid (automatic for $0 invoices)");
      } else {
        throw error;
      }
    }
  }

  // 13. Get the payment intent from the invoice
  let paymentIntentId: string | null = null;
  
  if (finalizedInvoice.payment_intent) {
    paymentIntentId = typeof finalizedInvoice.payment_intent === "string"
      ? finalizedInvoice.payment_intent
      : finalizedInvoice.payment_intent.id;
    console.log(`✅ Found payment intent from invoice: ${paymentIntentId}`);
    
    // Update payment intent metadata
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        cart_items: JSON.stringify([
          {
            id: albanju.id,
            name: albanju.name,
            quantity: 1,
            price: albanju.price || 0,
          },
        ]),
        user_id: user.id,
        purchase_type: "individual_product",
        invoice_id: invoice.id,
        reason: "support_account_grant",
      },
    });
    console.log("✅ Updated payment intent metadata");
  } else {
    // For $0 invoices, Stripe doesn't create a payment intent
    // We need to create one manually with minimum amount so the system can detect it
    console.log("\n💳 Creating payment intent with minimum amount ($0.50)...");
    
    // Create payment intent with $0.50 (Stripe minimum)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 50, // $0.50 minimum
      currency: "usd",
      customer: customerId,
      metadata: {
        cart_items: JSON.stringify([
          {
            id: albanju.id,
            name: albanju.name,
            quantity: 1,
            price: albanju.price || 0,
          },
        ]),
        user_id: user.id,
        purchase_type: "individual_product",
        invoice_id: invoice.id,
        reason: "support_account_grant",
        free_product: "true", // Mark as free product grant
      },
      payment_method_types: ["card"],
    });
    
    paymentIntentId = paymentIntent.id;
    console.log(`✅ Created payment intent: ${paymentIntentId}`);
    
    // Try to confirm the payment intent
    // First, check if customer has any saved payment methods
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      
      if (paymentMethods.data.length > 0) {
        // Use existing payment method
        const paymentMethod = paymentMethods.data[0];
        await stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: paymentMethod.id,
        });
        console.log("✅ Payment intent confirmed with existing payment method");
      } else {
        // No saved payment method - we'll need to update it manually
        // For now, we'll use Stripe's test mode confirmation
        console.log("⚠️  No saved payment method found");
        console.log("ℹ️  To confirm this payment intent, run:");
        console.log(`   stripe payment_intents confirm ${paymentIntentId} --payment-method pm_card_visa`);
        console.log(`   Or confirm it manually in Stripe dashboard: https://dashboard.stripe.com/payments/${paymentIntentId}`);
        console.log("\n   Alternatively, you can use Stripe CLI:");
        console.log(`   stripe payment_intents confirm ${paymentIntentId} -c`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not confirm payment intent: ${error.message}`);
      console.log(`ℹ️  Payment Intent ID: ${paymentIntentId}`);
      console.log("   Please confirm it manually in Stripe dashboard or via CLI");
    }
  }
  
  // Also update invoice metadata for reference
  const refreshedInvoice = await stripe.invoices.retrieve(invoice.id);
  await stripe.invoices.update(invoice.id, {
    metadata: {
      ...(refreshedInvoice.metadata || {}),
      cart_items: JSON.stringify([
        {
          id: albanju.id,
          name: albanju.name,
          quantity: 1,
          price: albanju.price || 0,
        },
      ]),
      user_id: user.id,
      purchase_type: "individual_product",
      reason: "support_account_grant",
    },
  });
  console.log("✅ Updated invoice metadata with cart items");

  console.log("\n" + "=".repeat(60));
  console.log("✅ SUCCESS!");
  console.log("=".repeat(60));
  console.log(`Albanju has been added to ${USER_EMAIL}`);
  console.log(`Invoice ID: ${invoice.id}`);
  if (paymentIntentId) {
    console.log(`Payment Intent ID: ${paymentIntentId}`);
  }
  console.log(`Coupon ID: ${coupon.id}`);
  console.log("\nThe product should now appear in the user's purchased products.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

