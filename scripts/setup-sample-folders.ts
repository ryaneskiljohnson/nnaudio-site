#!/usr/bin/env tsx

/**
 * Script to delete all sample folders and create fresh folders with minimal placeholder files
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

// All products that should have sample folders
const PRODUCTS_WITH_SAMPLES = [
  "albanju",
  "apache-flute",
  "bakers-dozen",
  "blaque",
  "curio-texture-generator",
  "digitaldreamscape-quad-rompler",
  "evanescent-baby-grand-piano",
  "game-boi-retro-sounds-free-plugin",
  "gameboi-pack",
  "go-to-work-modern-song-constructions",
  "cowboy-harp-free-jaw-harp-plugin",
  "mandolele-mandolin-ukulele",
  "mesosphere",
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
  "rompl-workstation",
  "strange-tingz-free-80s-plugin",
  "subflux-bass-module",
  "tactures",
  "tetrad-guitars",
  "tetrad-keys",
  "tetrad-winds",
];

async function deleteAllProductFolders() {
  console.log("🗑️  Deleting all product folders...\n");

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

    // Delete all files in all product folders
    let deletedCount = 0;
    let errorCount = 0;

    for (const folder of folders) {
      if (!folder.name) continue;

      const productPath = `products/${folder.name}`;
      
      // List all files in this product folder
      const { data: files, error: filesError } = await supabase.storage
        .from("product-downloads")
        .list(productPath, {
          limit: 1000,
        });

      if (filesError) {
        console.warn(`⚠️  Error listing files in ${productPath}:`, filesError);
        continue;
      }

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${productPath}/${f.name}`).filter(Boolean);
        
        console.log(`   Deleting ${filePaths.length} files from ${productPath}/`);
        
        const { error: deleteError } = await supabase.storage
          .from("product-downloads")
          .remove(filePaths);

        if (deleteError) {
          console.error(`   ❌ Error deleting files:`, deleteError);
          errorCount += filePaths.length;
        } else {
          deletedCount += filePaths.length;
        }
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} files`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} errors occurred`);
    }

    return true;
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return false;
  }
}

async function createFoldersWithPlaceholders() {
  console.log("\n📁 Creating folders with placeholder files...\n");

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
    const placeholderPath = `${folderPath}/.placeholder.zip`;

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
}

async function main() {
  console.log("🔧 Setting Up Sample Folders in Supabase Storage\n");
  console.log("=".repeat(70));

  // Step 1: Delete all existing folders
  const deleted = await deleteAllProductFolders();
  
  if (!deleted) {
    console.error("\n❌ Failed to delete existing folders. Aborting.");
    process.exit(1);
  }

  // Step 2: Create folders with placeholders
  await createFoldersWithPlaceholders();

  console.log("\n" + "=".repeat(70));
  console.log("\n✅ Setup Complete!\n");
  console.log("📋 Next Steps:");
  console.log("   1. Go to Supabase Dashboard → Storage → product-downloads bucket");
  console.log("   2. Navigate to each product folder: products/{slug}/");
  console.log("   3. Delete the .placeholder.zip file");
  console.log("   4. Upload your sample ZIP file and name it: samples.zip");
  console.log("\n📦 Folders ready for upload:");
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

