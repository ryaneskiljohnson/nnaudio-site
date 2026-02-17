import * as dotenv from "dotenv";
import { getStripeClient } from "../utils/stripe/client";

dotenv.config({ path: ".env.local" });

const stripeKey = process.env.STRIPE_SECRET_KEY!;
if (!stripeKey) {
  console.error("❌ Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = getStripeClient(stripeKey);

const PAYMENT_INTENT_ID = process.argv[2] || "pi_3SgsS8EtE1HSKUzY1eludNvJ";

async function main() {
  console.log(`🔍 Confirming payment intent: ${PAYMENT_INTENT_ID}\n`);

  try {
    // Retrieve the payment intent
    const pi = await stripe.paymentIntents.retrieve(PAYMENT_INTENT_ID);
    console.log(`Current status: ${pi.status}`);
    console.log(`Amount: $${(pi.amount / 100).toFixed(2)}`);
    console.log(`Customer: ${pi.customer}\n`);

    if (pi.status === "succeeded") {
      console.log("✅ Payment intent is already succeeded!");
      return;
    }

    if (pi.status === "requires_payment_method") {
      console.log("📝 Payment intent requires a payment method");
      console.log("ℹ️  In live mode, you need to confirm this manually in Stripe dashboard");
      console.log(`   https://dashboard.stripe.com/payments/${PAYMENT_INTENT_ID}`);
      console.log("\n   Or use Stripe CLI (if in test mode):");
      console.log(`   stripe payment_intents confirm ${PAYMENT_INTENT_ID} -c`);
      return;
    }

    // Try to confirm if it's in the right state
    if (pi.status === "requires_confirmation") {
      console.log("🔄 Attempting to confirm...");
      
      // Check if customer has payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: pi.customer as string,
        type: "card",
        limit: 1,
      });

      if (paymentMethods.data.length > 0) {
        const pm = paymentMethods.data[0];
        const confirmed = await stripe.paymentIntents.confirm(PAYMENT_INTENT_ID, {
          payment_method: pm.id,
        });
        console.log(`✅ Confirmed! Status: ${confirmed.status}`);
      } else {
        console.log("⚠️  No payment methods found for customer");
        console.log("ℹ️  Please confirm manually in Stripe dashboard");
      }
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.log("\n💡 To confirm manually:");
    console.log(`   1. Go to: https://dashboard.stripe.com/payments/${PAYMENT_INTENT_ID}`);
    console.log(`   2. Click "Confirm payment" or use a test card`);
    console.log(`   3. Or use Stripe CLI: stripe payment_intents confirm ${PAYMENT_INTENT_ID} -c`);
  }
}

main();

