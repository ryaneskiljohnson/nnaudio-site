import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";
import csv from "csv-parser";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Stripe configuration (you'll need to set this environment variable)
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

// Function to find Stripe customer by email
async function findStripeCustomerByEmail(email) {
  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    return null;
  } catch (error) {
    console.error(
      `❌ Error finding Stripe customer for ${email}:`,
      error.message
    );
    return null;
  }
}

// Function to check for lifetime purchase (using proven logic from StripeController.js)
async function checkLifetimePurchase(customerId, userEmail) {
  try {
    console.log(`🔍 Checking Stripe payment intents for ${userEmail}...`);

    // Query Stripe for payment intents with expanded data (same as StripeController.js)
    const payments = await stripe.paymentIntents.list({
      customer: customerId,
      expand: ["data.latest_charge", "data.invoice"],
      limit: 100,
    });

    console.log(
      `📊 Found ${payments.data.length} payment intents for ${userEmail}`
    );

    // Check for lifetime purchase using the same logic as StripeController.js
    const lifetimePurchased = payments.data.some((p) => {
      if (!p.invoice || !p.latest_charge) return false;

      if (p.invoice.subscription) return false; // Lifetime is not a subscription

      const paid =
        p.latest_charge.paid && p.latest_charge.amount_refunded === 0;
      if (!paid) return false;

      return p.invoice.lines.data.some(
        (li) =>
          li.price.id === lifetimePriceId || li.price.id === lifetimePriceId2
      );
    });

    if (lifetimePurchased) {
      // Find the specific payment intent with lifetime purchase for details
      const lifetimePayment = payments.data.find((p) => {
        if (!p.invoice || !p.latest_charge) return false;
        if (p.invoice.subscription) return false;
        const paid =
          p.latest_charge.paid && p.latest_charge.amount_refunded === 0;
        if (!paid) return false;
        return p.invoice.lines.data.some(
          (li) =>
            li.price.id === lifetimePriceId || li.price.id === lifetimePriceId2
        );
      });

      if (lifetimePayment) {
        const lifetimeLine = lifetimePayment.invoice.lines.data.find(
          (li) =>
            li.price.id === lifetimePriceId || li.price.id === lifetimePriceId2
        );

        console.log(`✅ Found lifetime purchase for ${userEmail}!`);
        return {
          transactionId: lifetimePayment.id,
          amount: lifetimePayment.amount,
          currency: lifetimePayment.currency,
          created: new Date(lifetimePayment.created * 1000).toISOString(),
          status: lifetimePayment.status,
          priceId: lifetimeLine.price.id,
          source: "stripe_api",
        };
      }
    }

    console.log(`❌ No lifetime purchase found for ${userEmail}`);
    return null;
  } catch (error) {
    console.error(
      `❌ Error checking lifetime purchase for customer ${customerId}:`,
      error.message
    );
    return null;
  }
}

// Function to find all CSV users and their lifetime transactions
async function findLifetimeUsersFromCSV() {
  const csvFilePath = "db/universe.users.trimmed.modified.csv";

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    return;
  }

  console.log("🔍 Starting lifetime transaction analysis from CSV...");
  console.log("📂 Reading file:", csvFilePath);

  const users = [];
  const results = {
    totalUsers: 0,
    usersWithTransactions: 0,
    usersWithoutTransactions: 0,
    usersWithoutCustomerId: 0,
    transactions: [],
    errors: [],
  };

  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        users.push(row);
      })
      .on("end", async () => {
        console.log(`📊 Found ${users.length} total users in CSV`);

        // Filter users upfront before making any Stripe calls
        const validUsers = users.filter((userData) => {
          const { emailVerified, proLifetime } = userData;

          // Check if email is verified
          const isEmailVerified =
            emailVerified === "TRUE" || emailVerified === true;
          if (!isEmailVerified) {
            return false;
          }

          // Check if user has proLifetime set to true
          const hasProLifetime = proLifetime === "TRUE" || proLifetime === true;
          if (!hasProLifetime) {
            return false;
          }

          return true;
        });

        console.log(
          `📊 After filtering: ${validUsers.length} users with verified emails and proLifetime=true`
        );
        console.log(
          `⏭️ Skipped ${
            users.length - validUsers.length
          } users (unverified emails or no proLifetime)`
        );

        if (validUsers.length === 0) {
          console.log("ℹ️ No valid users found to process");
          resolve({
            totalUsers: 0,
            usersWithTransactions: 0,
            usersWithoutTransactions: 0,
            usersWithoutCustomerId: 0,
            transactions: [],
            errors: [],
          });
          return;
        }

        results.totalUsers = validUsers.length;

        // Process valid users in batches to avoid rate limiting
        const batchSize = 5; // Smaller batches for Stripe API calls
        const batches = [];

        for (let i = 0; i < validUsers.length; i += batchSize) {
          batches.push(validUsers.slice(i, i + batchSize));
        }

        console.log(
          `📦 Processing ${batches.length} batches of up to ${batchSize} users each`
        );

        // Process each batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(
            `\n🔄 Processing batch ${batchIndex + 1}/${batches.length}...`
          );

          // Process all users in current batch
          const batchPromises = batch.map(async (userData, userIndex) => {
            const { email, first_name, last_name, custId, _id } = userData;

            console.log(
              `\n🔄 Processing user ${batchIndex * batchSize + userIndex + 1}/${
                results.totalUsers
              }: ${email}`
            );

            // Try to get customer ID from CSV first, then search by email
            let customerId = custId;

            if (!customerId) {
              console.log(
                `🔍 No customer ID in CSV, searching Stripe by email: ${email}`
              );
              customerId = await findStripeCustomerByEmail(email);
            }

            if (!customerId) {
              console.log(`⚠️ User ${email} has no Stripe customer ID`);
              results.usersWithoutCustomerId++;
              return;
            }

            // Find lifetime transaction
            const transaction = await checkLifetimePurchase(customerId, email);

            if (transaction) {
              console.log(
                `✅ Found lifetime transaction for ${email}: ${transaction.transactionId}`
              );
              results.usersWithTransactions++;
              results.transactions.push({
                userEmail: email,
                originalId: _id,
                customerId: customerId,
                firstName: first_name,
                lastName: last_name,
                ...transaction,
              });
            } else {
              console.log(`❌ No lifetime transaction found for ${email}`);
              results.usersWithoutTransactions++;
              results.errors.push({
                userEmail: email,
                originalId: _id,
                customerId: customerId,
                error: "No lifetime transaction found",
              });
            }
          });

          // Wait for current batch to complete
          await Promise.all(batchPromises);

          // Add delay between batches to avoid rate limiting
          if (batchIndex < batches.length - 1) {
            console.log("⏳ Waiting 2 seconds before next batch...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        // Print final results
        console.log("\n🎉 Analysis completed!");
        console.log("📈 Summary:");
        console.log(
          `  Total CSV users (verified emails): ${results.totalUsers}`
        );
        console.log(
          `  ✅ Users with lifetime transactions: ${results.usersWithTransactions}`
        );
        console.log(
          `  ❌ Users without lifetime transactions: ${results.usersWithoutTransactions}`
        );
        console.log(
          `  ⚠️ Users without Stripe customer ID: ${results.usersWithoutCustomerId}`
        );

        if (results.transactions.length > 0) {
          console.log("\n💰 Lifetime Transactions Found:");
          console.log("=====================================");
          results.transactions.forEach((transaction, index) => {
            const amount = (transaction.amount / 100).toFixed(2);
            console.log(`${index + 1}. ${transaction.userEmail}`);
            console.log(`   Transaction ID: ${transaction.transactionId}`);
            console.log(`   Price ID: ${transaction.priceId}`);
            console.log(
              `   Amount: ${amount} ${transaction.currency.toUpperCase()}`
            );
            console.log(`   Date: ${transaction.created}`);
            console.log(`   Status: ${transaction.status}`);
            console.log(`   Customer ID: ${transaction.customerId}`);
            console.log(`   Original ID: ${transaction.originalId}`);
            if (transaction.firstName || transaction.lastName) {
              console.log(
                `   Name: ${transaction.firstName || ""} ${
                  transaction.lastName || ""
                }`.trim()
              );
            }
            console.log("");
          });
        }

        if (results.errors.length > 0) {
          console.log("\n❌ Users with Issues:");
          console.log("=====================");
          results.errors.forEach((error, index) => {
            console.log(
              `${index + 1}. ${error.userEmail} (${error.originalId})`
            );
            console.log(`   Customer ID: ${error.customerId}`);
            console.log(`   Issue: ${error.error}`);
            console.log("");
          });
        }

        resolve(results);
      })
      .on("error", (error) => {
        console.error("❌ Error reading CSV file:", error);
        reject(error);
      });
  });
}

// Main function
async function main() {
  try {
    console.log("🚀 Starting lifetime users analysis from CSV...");
    console.log(
      `�� Stripe Secret Key: ${stripeSecretKey ? "Configured" : "Missing"}`
    );
    console.log(`🔗 Lifetime Price ID: ${lifetimePriceId}`);

    await findLifetimeUsersFromCSV();
    console.log("\n✨ Analysis finished successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Analysis failed:", error);
    process.exit(1);
  }
}

// Run the analysis
main();

export { findLifetimeUsersFromCSV };
