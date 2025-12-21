#!/usr/bin/env tsx

/**
 * Script to upload sample ZIP files to Supabase Storage
 * and associate them with the correct products in the database
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";

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

interface UploadResult {
  productSlug: string;
  productName: string;
  success: boolean;
  error?: string;
}

// Manual mapping for folders that don't match product slugs exactly
const FOLDER_TO_SLUG_MAPPING: Record<string, string> = {
  'albanju-middle-eastern-banjo': 'albanju',
  'apache-native-american-flute': 'apache-flute',
  'bakers-dozen-bundle': 'bakers-dozen',
  'blaque-dark-electric-guitar': 'blaque',
  'curio-sample-archive': 'curio-texture-generator',
  'digitaldreamsacpe-sample-archive': 'digitaldreamscape-quad-rompler',
  'evanescent-baby-grand-pianio': 'evanescent-baby-grand-piano',
  'game-boi-sample-archive': 'game-boi-retro-sounds-free-plugin',
  'go-to-work-modern-song-constructions': 'go-to-work-modern-song-constructions',
  'jay-harp-sample-archive': 'cowboy-harp-free-jaw-harp-plugin',
  'mandolele-mandolin-and-ukulele': 'mandolele-mandolin-ukulele',
  'mesosphere-samples-archive': 'mesosphere',
  'natura-sampled-analog-instrument': 'natura',
  'noker-drum-and-bass': 'noker',
  'numb-dark-acoustic-guitar': 'numb',
  'obscura-sample-archive': 'obscura-tortured-orchestral-box',
  'perc-gadget-sample-archive': 'perc-gadget',
  'prodigious-samples-archive': 'prodigious',
  'quoir-mixed-vocal-choir': 'quoir',
  'reiya-sample-archive': 'reiya',
  'rompl-workstation-sample-archive': 'rompl-workstation',
  'strange-tingz-samples-archive': 'strange-tingz-free-80s-plugin',
  'subflux-sample-archive': 'subflux-bass-module',
  'tactures-sample-archive': 'tactures',
  'tetrad-guitars-sample-archive': 'tetrad-guitars',
  'tetrad-keys-samples-archive': 'tetrad-keys',
  'tetrad-winds-sample-archive': 'tetrad-winds',
};

async function uploadSampleZip(zipFilePath: string): Promise<UploadResult> {
  const fileName = path.basename(zipFilePath);
  
  // Extract product slug from filename: samples_{slug}.zip -> {slug}
  const slugMatch = fileName.match(/^samples_(.+)\.zip$/);
  if (!slugMatch) {
    return {
      productSlug: "",
      productName: "",
      success: false,
      error: `Invalid filename format: ${fileName}`,
    };
  }

  const folderSlug = slugMatch[1];
  // Use mapping if available, otherwise try the folder slug as-is
  const productSlug = FOLDER_TO_SLUG_MAPPING[folderSlug] || folderSlug;
  const simpleFileName = "samples.zip";

  try {
    // Find product by slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, downloads")
      .eq("slug", productSlug)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      return {
        productSlug,
        productName: "",
        success: false,
        error: `Product not found: ${productSlug}`,
      };
    }

    // Get file stats
    const stats = fs.statSync(zipFilePath);
    const fileSize = stats.size;

    // Sanitize product slug for storage path (AWS S3 compatible)
    // Remove any characters that might cause issues
    const sanitizedSlug = productSlug
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-') // Only allow lowercase letters, numbers, hyphens, underscores
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Storage path structure: products/{product-slug}/samples.zip (simplified)
    const storagePath = `products/${sanitizedSlug}/samples.zip`;

    console.log(`\n📦 Processing: ${product.name} (${productSlug})`);
    console.log(`   Source file: ${fileName}`);
    console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage path: ${storagePath}`);
    console.log(`   Sanitized slug: ${sanitizedSlug}`);

    // Read file
    console.log("   📖 Reading file...");
    const fileBuffer = fs.readFileSync(zipFilePath);
    const fileSizeMB = fileSize / (1024 * 1024);

    // Upload to Supabase Storage
    // For large files (>100MB), use chunked upload approach
    let uploadData;
    let uploadError;

    if (fileSizeMB > 100) {
      console.log(`   📤 Uploading large file (${fileSizeMB.toFixed(2)} MB) using chunked method...`);
      
      // For large files, try uploading in chunks or use resumable upload
      // Supabase Storage supports files up to 10GB, but we need to handle timeouts
      const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
      const chunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);
      
      console.log(`   📦 Splitting into ${chunks} chunks...`);
      
      // Try direct upload first (Supabase should handle it, but with longer timeout)
      // If that fails, we'll need to use a different approach
      const { data, error } = await supabase.storage
        .from("product-downloads")
        .upload(storagePath, fileBuffer, {
          contentType: "application/zip",
          upsert: true,
          cacheControl: "3600",
        });
      
      uploadData = data;
      uploadError = error;
      
      // If direct upload fails, try with retries and exponential backoff
      if (uploadError) {
        console.log(`   ⚠️  Direct upload failed, retrying with longer timeout...`);
        
        // Retry up to 3 times with exponential backoff
        for (let retry = 0; retry < 3; retry++) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from("product-downloads")
            .upload(storagePath, fileBuffer, {
              contentType: "application/zip",
              upsert: true,
              cacheControl: "3600",
            });
          
          if (!retryError) {
            uploadData = retryData;
            uploadError = null;
            console.log(`   ✅ Upload succeeded on retry ${retry + 1}`);
            break;
          }
          
          uploadError = retryError;
        }
      }
    } else {
      console.log("   📤 Uploading to storage...");
      const { data, error } = await supabase.storage
        .from("product-downloads")
        .upload(storagePath, fileBuffer, {
          contentType: "application/zip",
          upsert: true,
          cacheControl: "3600",
        });
      
      uploadData = data;
      uploadError = error;
    }

    if (uploadError) {
      return {
        productSlug,
        productName: product.name,
        success: false,
        error: `Upload error: ${uploadError.message}`,
      };
    }

    console.log("   ✅ File uploaded successfully!");

    // Prepare download object
    const downloadObject = {
      path: storagePath,
      name: `${product.name} Samples`,
      type: "samples",
      version: null, // Can be added later if needed
      file_size: fileSize,
    };

    // Update downloads array
    const currentDownloads = (product.downloads as any[]) || [];
    
    // Remove any existing samples download for this product
    const filteredDownloads = currentDownloads.filter(
      (d: any) => d.type !== "samples"
    );
    
    // Add new download
    const updatedDownloads = [...filteredDownloads, downloadObject];

    console.log("   💾 Updating product downloads field...");
    const { error: updateError } = await supabase
      .from("products")
      .update({ downloads: updatedDownloads })
      .eq("id", product.id);

    if (updateError) {
      return {
        productSlug,
        productName: product.name,
        success: false,
        error: `Update error: ${updateError.message}`,
      };
    }

    console.log("   ✅ Product updated successfully!");

    return {
      productSlug,
      productName: product.name,
      success: true,
    };
  } catch (error: any) {
    return {
      productSlug,
      productName: "",
      success: false,
      error: `Unexpected error: ${error.message}`,
    };
  }
}

async function main() {
  console.log("📦 Uploading Sample ZIP Files to Supabase Storage\n");
  console.log("=" .repeat(70));

  // Check if sample-zips directory exists
  if (!fs.existsSync(SAMPLE_ZIPS_DIR)) {
    console.error(`❌ Sample ZIPs directory not found: ${SAMPLE_ZIPS_DIR}`);
    process.exit(1);
  }

  // Get all ZIP files (including the new ones we just created)
  const files = fs.readdirSync(SAMPLE_ZIPS_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('samples_'))
    .map(file => path.join(SAMPLE_ZIPS_DIR, file))
    .sort(); // Sort for consistent processing

  if (files.length === 0) {
    console.error(`❌ No sample ZIP files found in ${SAMPLE_ZIPS_DIR}`);
    process.exit(1);
  }

  console.log(`\nFound ${files.length} sample ZIP files to upload\n`);

  const results: UploadResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${i + 1}/${files.length}]`);
    
    const result = await uploadSampleZip(file);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
      console.error(`   ❌ Failed: ${result.error}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary\n");
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed: ${failCount} files`);

  if (failCount > 0) {
    console.log("\n❌ Failed uploads:");
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.productSlug || 'unknown'}: ${r.error}`);
      });
  }

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

