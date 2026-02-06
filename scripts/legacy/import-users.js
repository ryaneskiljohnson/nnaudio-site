import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import csv from "csv-parser";
import crypto from "crypto";

// Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jibirpbauzqhdiwjlrmf.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Function to generate a temporary password
function generateTempPassword() {
  return crypto.randomBytes(8).toString("hex") + "Temp!";
}

// Function to create a single user
async function createUser(userData) {
  const { email, first_name, last_name, custId, _id, emailVerified } = userData;

  // Check if email is verified (convert string to boolean)
  const isEmailVerified = emailVerified === "TRUE" || emailVerified === true;

  // Skip if email is not verified
  if (!isEmailVerified) {
    console.log(
      `⏭️  Skipping unverified email: ${email} (${first_name} ${last_name})`
    );
    return { success: false, reason: "Email not verified" };
  }

  // Generate temporary password
  const tempPassword = generateTempPassword();

  try {
    // Create user using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // All migrated users will have verified emails
      user_metadata: {
        first_name: first_name || "",
        last_name: last_name || "",
        customer_id: custId || "",
      },
    });

    if (error) {
      console.log(`❌ Error creating user ${email}:`, error.message);
      return { success: false, reason: error.message };
    }

    // console.log(
    //   `✅ Created user: ${email} (${first_name} ${last_name}) - Temp password: ${tempPassword}`
    // );
    return {
      success: true,
      user: data.user,
      tempPassword,
      originalId: _id,
    };
  } catch (err) {
    console.log(`❌ Unexpected error for ${email}:`, err.message);
    return { success: false, reason: err.message };
  }
}

// Function to process CSV and import users
async function importUsersFromCSV() {
  const csvFilePath = "db/universe.users.trimmed.modified.csv";

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    return;
  }

  console.log("🚀 Starting user import from CSV...");
  console.log("📂 Reading file:", csvFilePath);

  const users = [];
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    unverified: 0,
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
        console.log(`📊 Found ${users.length} users in CSV`);

        // Process users in batches to avoid rate limiting
        const batchSize = 10;
        const batches = [];

        for (let i = 0; i < users.length; i += batchSize) {
          batches.push(users.slice(i, i + batchSize));
        }

        console.log(
          `📦 Processing ${batches.length} batches of ${batchSize} users each`
        );

        // Process each batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(
            `\n🔄 Processing batch ${batchIndex + 1}/${batches.length}...`
          );

          // Process all users in current batch
          const batchPromises = batch.map(async (userData) => {
            results.total++;
            const result = await createUser(userData);

            if (result.success) {
              results.successful++;
            } else if (result.reason === "Email not verified") {
              results.unverified++;
            } else {
              results.failed++;
              results.errors.push({
                email: userData.email,
                error: result.reason,
              });
            }

            return result;
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
        console.log("\n🎉 Import completed!");
        console.log("📈 Results:");
        console.log(`  Total processed: ${results.total}`);
        console.log(`  ✅ Successful: ${results.successful}`);
        console.log(`  ❌ Failed: ${results.failed}`);
        console.log(`  📧 Skipped (unverified email): ${results.unverified}`);

        if (results.errors.length > 0) {
          console.log("\n❌ Errors encountered:");
          results.errors.forEach((error) => {
            console.log(`  ${error.email}: ${error.error}`);
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

// Main function to run the import
async function main() {
  try {
    console.log("🚀 Starting user import process...");
    await importUsersFromCSV();
    console.log("\n✨ Import process finished successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Import process failed:", error);
    process.exit(1);
  }
}

// Run the import
main();

export { importUsersFromCSV, createUser };
