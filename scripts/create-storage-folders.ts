#!/usr/bin/env tsx

/**
 * Script to create folder structure in Supabase Storage
 * by uploading a minimal file to each folder path
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// All products that need sample folders
const PRODUCTS_WITH_SAMPLES = [
  "albanju",
  "blaque",
  "game-boi-retro-sounds-free-plugin",
  "gameboi-pack",
  "natura",
  "noker",
  "numb",
  "obscura-tortured-orchestral-box",
  "obscura-royal-family-bundle-black-friday",
  "perc-gadget",
  "percgadget-drum-machine",
  "prodigious",
  "quoir",
  "reiya",
  "strange-tingz-free-80s-plugin",
];

async function createFolders() {
  console.log("📁 Creating folders in Supabase Storage...\n");

  // Create a minimal valid ZIP file (22 bytes - empty ZIP structure)
  const emptyZip = Buffer.from([
    0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);

  let createdCount = 0;
  let errorCount = 0;

  for (const slug of PRODUCTS_WITH_SAMPLES) {
    const folderPath = `products/${slug}`;
    // Upload a placeholder file to create the folder
    // User will replace this with their actual samples.zip
    const placeholderPath = `${folderPath}/_FOLDER_PLACEHOLDER_.zip`;

    try {
      console.log(`   Creating: ${folderPath}/`);
      
      const { error: uploadError } = await supabase.storage
        .from("product-downloads")
        .upload(placeholderPath, emptyZip, {
          contentType: "application/zip",
          upsert: true,
        });

      if (uploadError) {
        console.error(`   ❌ Error: ${uploadError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Created: ${folderPath}/`);
        createdCount++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error creating ${folderPath}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Created ${createdCount} folders`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors occurred`);
  }

  console.log("\n📋 Folders created in Supabase Storage:");
  console.log("   You can now see them in: Storage → product-downloads → products/");
  console.log("\n💡 When you upload samples.zip, you can delete the _FOLDER_PLACEHOLDER_.zip file");
}

async function main() {
  console.log("🔧 Creating Storage Folders\n");
  console.log("=".repeat(70));
  
  await createFolders();
  
  console.log("\n" + "=".repeat(70));
  console.log("\n✅ Complete!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

