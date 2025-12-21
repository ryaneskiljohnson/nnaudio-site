#!/usr/bin/env tsx

/**
 * Script to delete all sample files from Supabase Storage
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

async function deleteAllSampleFiles() {
  console.log("🗑️  Deleting all sample files from Supabase Storage...\n");

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
    const filesToDelete: string[] = [];

    // For each product folder, find all sample files
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

      // Collect all sample files to delete
      for (const file of files || []) {
        if (!file.name) continue;
        
        // Delete if it's a sample file (any naming pattern)
        if (file.name.startsWith("samples") || 
            file.name === "samples.zip" || 
            file.name.includes("sample") ||
            file.name.includes("FOLDER_PLACEHOLDER")) {
          const filePath = `${productPath}/${file.name}`;
          filesToDelete.push(filePath);
        }
      }
    }

    // Delete all files at once
    if (filesToDelete.length > 0) {
      console.log(`\n📋 Found ${filesToDelete.length} files to delete\n`);
      
      // Delete in batches of 100 (Supabase limit)
      for (let i = 0; i < filesToDelete.length; i += 100) {
        const batch = filesToDelete.slice(i, i + 100);
        
        for (const filePath of batch) {
          console.log(`   Deleting: ${filePath}`);
        }
        
        const { error: deleteError } = await supabase.storage
          .from("product-downloads")
          .remove(batch);

        if (deleteError) {
          console.error(`   ❌ Error deleting batch:`, deleteError);
          errorCount += batch.length;
        } else {
          deletedCount += batch.length;
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

async function main() {
  console.log("🗑️  Delete All Sample Files\n");
  console.log("=".repeat(70));
  
  await deleteAllSampleFiles();
  
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

