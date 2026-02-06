import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const lifetimePriceId = process.env.STRIPE_PRICE_ID_LIFETIME;
const lifetimePriceId2 = process.env.LIFETIME_PRICE_ID_2; // Second lifetime price ID

// Create Stripe client
if (!stripeSecretKey) {
  console.error(
    "❌ STRIPE_SECRET_KEY is required but not found in environment variables"
  );
  process.exit(1);
}

if (!lifetimePriceId) {
  console.error(
    "❌ STRIPE_PRICE_ID_LIFETIME is required but not found in environment variables"
  );
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

// Function to check if a payment intent is a lifetime purchase
async function isLifetimePurchase(paymentIntent) {
  try {
    // Must have invoice and latest_charge
    if (!paymentIntent.invoice || !paymentIntent.latest_charge) {
      return false;
    }

    // Must not be a subscription (lifetime is one-time payment)
    if (paymentIntent.invoice.subscription) {
      return false;
    }

    // Must be paid and not refunded
    const paid =
      paymentIntent.latest_charge.paid &&
      paymentIntent.latest_charge.amount_refunded === 0;
    if (!paid) {
      return false;
    }

    // Check if any line item has our lifetime price IDs
    const hasLifetimePrice = paymentIntent.invoice.lines.data.some(
      (li) =>
        li.price.id === lifetimePriceId || li.price.id === lifetimePriceId2
    );

    return hasLifetimePrice;
  } catch (error) {
    console.error(
      `❌ Error checking payment intent ${paymentIntent.id}:`,
      error.message
    );
    return false;
  }
}

// Function to update payment intent metadata
async function updatePaymentIntentMetadata(paymentIntentId) {
  try {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        purchase_type: "lifetime",
      },
    });
    return true;
  } catch (error) {
    console.error(
      `❌ Error updating payment intent ${paymentIntentId}:`,
      error.message
    );
    return false;
  }
}

// Function to scan and tag all lifetime payment intents
async function tagLifetimeTransactions() {
  console.log(
    "🚀 Starting to scan all Stripe payment intents for lifetime purchases..."
  );
  console.log(`🔗 Lifetime Price ID 1: ${lifetimePriceId}`);
  console.log(`🔗 Lifetime Price ID 2: ${lifetimePriceId2 || "Not set"}`);

  const results = {
    totalProcessed: 0,
    lifetimeFound: 0,
    alreadyTagged: 0,
    newlyTagged: 0,
    updateErrors: 0,
    errors: [],
  };

  let hasMore = true;
  let startingAfter = undefined;

  try {
    while (hasMore) {
      console.log(
        `\n🔍 Fetching payment intents batch...${
          startingAfter ? ` (starting after ${startingAfter})` : ""
        }`
      );

      // Fetch payment intents with expanded data
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100, // Maximum allowed
        expand: ["data.latest_charge", "data.invoice", "data.invoice.lines"],
        ...(startingAfter && { starting_after: startingAfter }),
      });

      console.log(
        `📊 Processing ${paymentIntents.data.length} payment intents...`
      );
      results.totalProcessed += paymentIntents.data.length;

      // Process each payment intent
      for (const paymentIntent of paymentIntents.data) {
        try {
          // Check if it's already tagged
          if (paymentIntent.metadata?.purchase_type === "lifetime") {
            console.log(
              `✅ Payment intent ${paymentIntent.id} already tagged as lifetime`
            );
            results.alreadyTagged++;
            continue;
          }

          // Check if it's a lifetime purchase
          const isLifetime = await isLifetimePurchase(paymentIntent);

          if (isLifetime) {
            console.log(
              `🎯 Found lifetime purchase: ${paymentIntent.id} - Adding metadata...`
            );
            results.lifetimeFound++;

            // Update the payment intent with metadata
            const success = await updatePaymentIntentMetadata(paymentIntent.id);

            if (success) {
              console.log(
                `✅ Successfully tagged payment intent ${paymentIntent.id}`
              );
              results.newlyTagged++;
            } else {
              console.log(
                `❌ Failed to tag payment intent ${paymentIntent.id}`
              );
              results.updateErrors++;
              results.errors.push({
                paymentIntentId: paymentIntent.id,
                error: "Failed to update metadata",
              });
            }

            // Add small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(
            `❌ Error processing payment intent ${paymentIntent.id}:`,
            error.message
          );
          results.errors.push({
            paymentIntentId: paymentIntent.id,
            error: error.message,
          });
        }
      }

      // Check if there are more results
      hasMore = paymentIntents.has_more;
      if (hasMore && paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;

        // Add delay between batches to avoid rate limiting
        console.log("⏳ Waiting 2 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Print final results
    console.log("\n🎉 Tagging completed!");
    console.log("📈 Summary:");
    console.log(`  Total payment intents processed: ${results.totalProcessed}`);
    console.log(`  🎯 Lifetime purchases found: ${results.lifetimeFound}`);
    console.log(`  ✅ Already tagged: ${results.alreadyTagged}`);
    console.log(`  🆕 Newly tagged: ${results.newlyTagged}`);
    console.log(`  ❌ Update errors: ${results.updateErrors}`);

    if (results.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.paymentIntentId}: ${error.error}`);
      });
    }

    return results;
  } catch (error) {
    console.error("💥 Error in scanning process:", error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log("🚀 Starting lifetime transaction tagging process...");

    await tagLifetimeTransactions();
    console.log("\n✨ Tagging process finished successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Tagging process failed:", error);
    process.exit(1);
  }
}

// Run the script
main();

export { tagLifetimeTransactions };
