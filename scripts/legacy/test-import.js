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
// const supabase = createClient(supabaseUrl, supabaseServiceKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false,
//   },
// });

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
    // Prepare data for Supabase
    const supabaseUserData = {
      email: email,
      password: tempPassword,
      email_confirm: true, // All migrated users will have verified emails
      user_metadata: {
        first_name: first_name || "",
        last_name: last_name || "",
        customer_id: custId || "",
      },
    };

    console.log(
      `📋 Data to be sent for ${email}:`,
      JSON.stringify(supabaseUserData, null, 2)
    );

    // Create user using admin API (COMMENTED OUT FOR TESTING)
    // const { data, error } = await supabase.auth.admin.createUser(supabaseUserData);

    // if (error) {
    //   console.log(`❌ Error creating user ${email}:`, error.message);
    //   return { success: false, reason: error.message };
    // }

    console.log(
      `✅ Would create user: ${email} (${first_name} ${last_name}) - Temp password: ${tempPassword}`
    );
    return {
      success: true,
      // user: data.user,
      tempPassword,
      originalId: _id,
    };
  } catch (err) {
    console.log(`❌ Unexpected error for ${email}:`, err.message);
    return { success: false, reason: err.message };
  }
}

// Function to test import with first 3 users
async function testImport() {
  const csvFilePath = "db/universe.users.trimmed.modified.csv";

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    return;
  }

  console.log("🧪 Testing user import with first 3 users...");

  const users = [];

  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        if (users.length < 3) {
          // Only take first 3 users for testing
          users.push(row);
        }
      })
      .on("end", async () => {
        console.log(`📊 Processing ${users.length} test users`);

        // Process test users
        for (let i = 0; i < users.length; i++) {
          const userData = users[i];
          console.log(
            `\n🔄 Processing user ${i + 1}/${users.length}: ${userData.email}`
          );

          const result = await createUser(userData);
          console.log(
            `Result:`,
            result.success ? "Success" : `Failed: ${result.reason}`
          );

          // Add delay between users
          if (i < users.length - 1) {
            console.log("⏳ Waiting 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        console.log("\n🎉 Test completed!");
        resolve();
      })
      .on("error", (error) => {
        console.error("❌ Error reading CSV file:", error);
        reject(error);
      });
  });
}

// Run the test
testImport()
  .then(() => {
    console.log("\n✨ Test finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
