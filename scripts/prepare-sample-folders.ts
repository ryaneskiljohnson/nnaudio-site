#!/usr/bin/env tsx

/**
 * Script to remove all existing sample files and prepare folder structure
 * for manual upload of sample ZIP files
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

// All products that should have sample files
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

async function deleteAllSampleFiles() {
  console.log("🗑️  Removing all existing sample files...\n");

  try {
    // List all files in products/ directory
    const { data: folders, error: listError } = await supabase.storage
      .from("product-downloads")
      .list("products", {
        limit: 1000,
      });

    if (listError) {
      console.error("❌ Error listing products folder:", listError);
      return false;
    }

    if (!folders || folders.length === 0) {
      console.log("✅ No product folders found");
      return true;
    }

    let deletedCount = 0;
    let errorCount = 0;

    // For each product folder, check for sample files
    for (const folder of folders) {
      if (!folder.name) continue;

      const productPath = `products/${folder.name}`;
      
      // List files in this product folder
      const { data: files, error: filesError } = await supabase.storage
        .from("product-downloads")
        .list(productPath, {
          limit: 100,
        });

      if (filesError) {
        console.warn(`⚠️  Error listing files in ${productPath}:`, filesError);
        continue;
      }

      // Delete sample files
      for (const file of files || []) {
        if (!file.name) continue;
        
        // Delete if it's a sample file (old naming or new naming)
        if (file.name.startsWith("samples") || file.name === "samples.zip") {
          const filePath = `${productPath}/${file.name}`;
          console.log(`   Deleting: ${filePath}`);
          
          const { error: deleteError } = await supabase.storage
            .from("product-downloads")
            .remove([filePath]);

          if (deleteError) {
            console.error(`   ❌ Error deleting ${filePath}:`, deleteError);
            errorCount++;
          } else {
            deletedCount++;
          }
        }
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} sample files`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} errors occurred`);
    }

    return true;
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return false;
  }
}

async function createFolderStructure() {
  console.log("\n📁 Creating folder structure...\n");

  // Create a minimal empty ZIP file to create each folder
  // This is a valid empty ZIP file (22 bytes - minimum ZIP structure)
  const emptyZipBuffer = Buffer.from([
    0x50, 0x4B, 0x05, 0x06, // ZIP end of central directory signature
    0x00, 0x00, 0x00, 0x00, // Number of this disk
    0x00, 0x00, 0x00, 0x00, // Number of the disk with the start of the central directory
    0x00, 0x00, 0x00, 0x00, // Total number of entries
    0x00, 0x00, 0x00, 0x00, // Size of central directory
    0x00, 0x00, 0x00, 0x00, // Offset of start of central directory
    0x00, 0x00              // ZIP file comment length
  ]);

  let createdCount = 0;
  let errorCount = 0;

  for (const slug of PRODUCTS_WITH_SAMPLES) {
    const folderPath = `products/${slug}`;
    const placeholderPath = `${folderPath}/.folder_placeholder.zip`;

    try {
      console.log(`   Creating: ${folderPath}/`);
      
      const { error: uploadError } = await supabase.storage
        .from("product-downloads")
        .upload(placeholderPath, emptyZipBuffer, {
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

  // Delete placeholder files (folders will remain)
  console.log("\n🧹 Cleaning up placeholder files...\n");
  
  for (const slug of PRODUCTS_WITH_SAMPLES) {
    const placeholderPath = `products/${slug}/.folder_placeholder.zip`;
    
    const { error: deleteError } = await supabase.storage
      .from("product-downloads")
      .remove([placeholderPath]);

    if (!deleteError) {
      console.log(`   ✅ Removed placeholder: ${placeholderPath}`);
    }
  }
}

async function main() {
  console.log("🔧 Preparing Sample File Folders in Supabase Storage\n");
  console.log("=".repeat(70));

  // Step 1: Delete all existing sample files
  const deleted = await deleteAllSampleFiles();
  
  if (!deleted) {
    console.error("\n❌ Failed to delete existing files. Aborting.");
    process.exit(1);
  }

  // Step 2: Create folder structure
  await createFolderStructure();

  console.log("\n" + "=".repeat(70));
  console.log("\n✅ Preparation Complete!\n");
  console.log("📋 Next Steps:");
  console.log("   1. Go to Supabase Dashboard → Storage → product-downloads bucket");
  console.log("   2. Navigate to each product folder: products/{slug}/");
  console.log("   3. Upload your sample ZIP file and name it: samples.zip");
  console.log("\n📦 Products ready for upload:");
  PRODUCTS_WITH_SAMPLES.forEach(slug => {
    console.log(`   - products/${slug}/samples.zip`);
  });
  console.log("\n💡 After uploading, run: bun run scripts/associate-uploaded-samples.ts");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

