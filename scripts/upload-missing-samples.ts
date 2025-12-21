#!/usr/bin/env tsx

/**
 * Script to upload ONLY the missing sample libraries
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

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

const SAMPLE_ZIPS_DIR = path.join(process.cwd(), "sample-zips");

// Missing files to upload
const MISSING_FILES = [
  'samples_bakers-dozen-bundle.zip',
  'samples_digitaldreamsacpe-sample-archive.zip',
  'samples_obscura-sample-archive.zip',
  'samples_tetrad-guitars-sample-archive.zip',
  'samples_tetrad-keys-samples-archive.zip',
  'samples_tetrad-winds-sample-archive.zip',
];

const FOLDER_TO_SLUG_MAPPING: Record<string, string> = {
  'bakers-dozen-bundle': 'bakers-dozen',
  'digitaldreamsacpe-sample-archive': 'digitaldreamscape-quad-rompler',
  'obscura-sample-archive': 'obscura-tortured-orchestral-box',
  'tetrad-guitars-sample-archive': 'tetrad-series',
  'tetrad-keys-samples-archive': 'tetrad-series',
  'tetrad-winds-sample-archive': 'tetrad-series',
};

async function uploadWithAPI(zipFilePath: string, storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`   🔧 Uploading via API (with retries for large files)...`);
    
    const fileBuffer = fs.readFileSync(zipFilePath);
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    
    // For very large files, use multiple retries with exponential backoff
    const maxRetries = fileSizeMB > 2000 ? 10 : 5;
    let lastError: any = null;
    
    console.log(`   📊 File size: ${fileSizeMB.toFixed(2)} MB - Will retry up to ${maxRetries} times if needed`);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 60000); // Max 60s delay
        console.log(`   ⏳ Retry ${attempt}/${maxRetries - 1} after ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log(`   📤 Attempt ${attempt + 1}/${maxRetries}...`);
      }
      
      try {
        // Create a new client for each attempt to avoid connection issues
        const attemptClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        const { data, error } = await attemptClient.storage
          .from("product-downloads")
          .upload(storagePath, fileBuffer, {
            contentType: "application/zip",
            upsert: true,
            cacheControl: "3600",
          });
        
        if (!error) {
          if (attempt > 0) {
            console.log(`   ✅ Upload succeeded on retry ${attempt + 1}!`);
          } else {
            console.log(`   ✅ Upload succeeded!`);
          }
          return { success: true };
        }
        
        lastError = error;
        console.log(`   ⚠️  Attempt ${attempt + 1} failed: ${error.message}`);
        
        // If it's a timeout or connection error, retry
        if (error.message.includes('timeout') || 
            error.message.includes('connection') ||
            error.message.includes('socket') ||
            error.message.includes('closed')) {
          continue;
        }
        
        // Otherwise, fail immediately
        return { success: false, error: error.message };
      } catch (err: any) {
        lastError = err;
        console.log(`   ⚠️  Attempt ${attempt + 1} exception: ${err.message || String(err)}`);
        if (err.message?.includes('timeout') || 
            err.message?.includes('connection') ||
            err.message?.includes('socket') ||
            err.message?.includes('closed')) {
          continue;
        }
        return { success: false, error: err.message || String(err) };
      }
    }
    
    return {
      success: false,
      error: lastError?.message || "Upload failed after retries",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

async function uploadFile(fileName: string) {
  const filePath = path.join(SAMPLE_ZIPS_DIR, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const slugMatch = fileName.match(/^samples_(.+)\.zip$/);
  if (!slugMatch) {
    console.error(`❌ Invalid filename: ${fileName}`);
    return false;
  }

  const folderSlug = slugMatch[1];
  const productSlug = FOLDER_TO_SLUG_MAPPING[folderSlug] || folderSlug;
  
  const sanitizedSlug = productSlug
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  let storagePath: string;
  if (productSlug === 'tetrad-series') {
    const componentMatch = folderSlug.match(/tetrad-(guitars|keys|winds)/);
    if (componentMatch) {
      storagePath = `products/${sanitizedSlug}/samples-${componentMatch[1]}.zip`;
    } else {
      storagePath = `products/${sanitizedSlug}/samples.zip`;
    }
  } else {
    storagePath = `products/${sanitizedSlug}/samples.zip`;
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  console.log(`\n📦 Uploading: ${fileName}`);
  console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`   Storage path: ${storagePath}`);

  // Upload
  const uploadResult = await uploadWithAPI(filePath, storagePath);

  if (!uploadResult.success) {
    console.error(`   ❌ Upload failed: ${uploadResult.error}`);
    return false;
  }

  console.log(`   ✅ Uploaded successfully!`);

  // Update database
  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, downloads")
    .eq("slug", productSlug)
    .single();

  if (!product) {
    console.error(`   ⚠️  Product not found: ${productSlug}`);
    return false;
  }

  let downloadName = `${product.name} Samples`;
  if (productSlug === 'tetrad-series') {
    const componentMatch = folderSlug.match(/tetrad-(guitars|keys|winds)/);
    if (componentMatch) {
      const componentName = componentMatch[1].charAt(0).toUpperCase() + componentMatch[1].slice(1);
      downloadName = `${product.name} - ${componentName} Samples`;
    }
  }

  const downloadObject = {
    path: storagePath,
    name: downloadName,
    type: "samples",
    version: null,
    file_size: stats.size,
  };

  const currentDownloads = (product.downloads as any[]) || [];
  let filteredDownloads = currentDownloads;
  
  if (productSlug !== 'tetrad-series') {
    filteredDownloads = currentDownloads.filter((d: any) => d.type !== "samples");
  } else {
    filteredDownloads = currentDownloads.filter(
      (d: any) => !(d.type === "samples" && d.path === storagePath)
    );
  }

  const updatedDownloads = [...filteredDownloads, downloadObject];

  const { error: updateError } = await supabase
    .from("products")
    .update({ downloads: updatedDownloads })
    .eq("id", product.id);

  if (updateError) {
    console.error(`   ⚠️  Database update failed: ${updateError.message}`);
    return false;
  }

  console.log(`   ✅ Database updated!`);
  return true;
}

async function main() {
  console.log("📦 Uploading Missing Sample Libraries\n");
  console.log("=".repeat(70));
  console.log(`\nFound ${MISSING_FILES.length} missing files to upload\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MISSING_FILES.length; i++) {
    const fileName = MISSING_FILES[i];
    console.log(`\n[${i + 1}/${MISSING_FILES.length}]`);
    
    const success = await uploadFile(fileName);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary\n");
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed: ${failCount} files`);

  if (failCount === 0) {
    console.log("\n🎉 ALL MISSING FILES UPLOADED!\n");
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

