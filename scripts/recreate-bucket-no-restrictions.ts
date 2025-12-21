#!/usr/bin/env tsx

/**
 * Script to recreate the product-downloads bucket WITHOUT any restrictions
 * This allows ANY file name and ANY file type
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

async function deleteAllFiles(bucketName: string): Promise<boolean> {
  console.log(`🗑️  Deleting all files from bucket "${bucketName}"...`);
  
  const filesToDelete: string[] = [];
  
  // Recursively list all files
  async function listFilesRecursive(prefix: string = "") {
    const { data: items, error } = await supabase.storage
      .from(bucketName)
      .list(prefix, { limit: 1000, offset: 0 });
    
    if (error) {
      console.error(`❌ Error listing files in ${prefix}:`, error);
      return;
    }
    
    if (!items) return;
    
    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      
      if (item.id === null) {
        // It's a folder, recurse
        await listFilesRecursive(fullPath);
      } else {
        // It's a file
        filesToDelete.push(fullPath);
      }
    }
  }
  
  await listFilesRecursive();
  
  if (filesToDelete.length === 0) {
    console.log("   No files to delete");
    return true;
  }
  
  console.log(`   Found ${filesToDelete.length} files to delete`);
  
  // Delete in batches
  const batchSize = 100;
  for (let i = 0; i < filesToDelete.length; i += batchSize) {
    const batch = filesToDelete.slice(i, i + batchSize);
    const { error } = await supabase.storage
      .from(bucketName)
      .remove(batch);
    
    if (error) {
      console.error(`❌ Error deleting batch:`, error);
      return false;
    }
    
    console.log(`   Deleted ${Math.min(i + batchSize, filesToDelete.length)}/${filesToDelete.length} files`);
  }
  
  console.log("✅ All files deleted");
  return true;
}

async function recreateBucket() {
  console.log("🔓 Recreating bucket WITHOUT restrictions...\n");

  const bucketName = "product-downloads";

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("❌ Error listing buckets:", listError);
      return;
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (bucketExists) {
      // Delete all files first
      const deleted = await deleteAllFiles(bucketName);
      if (!deleted) {
        console.error("❌ Failed to delete all files. Cannot proceed.");
        return;
      }

      // Delete bucket
      console.log(`\n🗑️  Deleting bucket "${bucketName}"...`);
      const { error: deleteError } = await supabase.storage.deleteBucket(bucketName);
      
      if (deleteError) {
        console.error("❌ Error deleting bucket:", deleteError);
        return;
      }
      
      console.log("✅ Bucket deleted");
    }

    // Create bucket WITHOUT restrictions
    console.log(`\n📦 Creating bucket "${bucketName}" WITHOUT restrictions...`);

    const { data: bucketData, error: createError } = await supabase.storage.createBucket(
      bucketName,
      {
        public: false, // Private bucket - use signed URLs for access
        // NO allowedMimeTypes - allows ALL file types!
        // NO fileSizeLimit - uses default (10GB)
      }
    );

    if (createError) {
      console.error("❌ Error creating bucket:", createError);
      return;
    }

    console.log(`✅ Successfully created bucket "${bucketName}"`);
    console.log("\n📋 New Bucket Configuration:");
    console.log("   - Name: product-downloads");
    console.log("   - Public: false (private, uses signed URLs)");
    console.log("   - Allowed MIME types: NONE (allows ALL types!)");
    console.log("   - File size limit: 10GB (default)");
    console.log("\n✅ You can now upload files with ANY name and ANY type!");

  } catch (error: any) {
    console.error("❌ Error:", error);
  }
}

async function main() {
  await recreateBucket();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
