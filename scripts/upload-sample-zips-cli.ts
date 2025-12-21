#!/usr/bin/env tsx

/**
 * Script to upload sample ZIP files using Supabase CLI
 * This handles large files better than the JS client
 */

import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

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
  'tetrad-guitars-sample-archive': 'tetrad-series',
  'tetrad-keys-samples-archive': 'tetrad-series',
  'tetrad-winds-sample-archive': 'tetrad-series',
};

async function uploadWithCLI(zipFilePath: string, storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get project reference from URL
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
      return { success: false, error: "Could not extract project reference from URL" };
    }

    // Use Supabase CLI to upload
    // Format: supabase storage upload <bucket> <local-path> <storage-path> --project-ref <ref>
    // Need to use --linked flag or set project ref
    const command = `supabase storage upload product-downloads "${zipFilePath}" "${storagePath}" --project-ref ${projectRef}`;
    
    console.log(`   🔧 Running CLI upload...`);
    
    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || supabaseServiceKey,
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD || '',
      },
      maxBuffer: 1024 * 1024 * 1024, // 1GB buffer for large files
    });

    return { success: true };
  } catch (error: any) {
    // Try alternative method if direct upload fails
    try {
      console.log(`   ⚠️  First attempt failed, trying alternative method...`);
      
      // Alternative: Use linked project
      const altCommand = `supabase storage upload product-downloads "${zipFilePath}" "${storagePath}"`;
      execSync(altCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || supabaseServiceKey,
        },
        maxBuffer: 1024 * 1024 * 1024,
      });
      
      return { success: true };
    } catch (altError: any) {
      return {
        success: false,
        error: `CLI upload failed: ${error.message || String(error)}`,
      };
    }
  }
}

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
  
  // Sanitize product slug for storage path (AWS S3 compatible)
  const sanitizedSlug = productSlug
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Handle Tetrad Series - each component gets its own file
  let storagePath: string;
  if (productSlug === 'tetrad-series') {
    // Extract component name from folder slug
    const componentMatch = folderSlug.match(/tetrad-(guitars|keys|winds)/);
    if (componentMatch) {
      storagePath = `products/${sanitizedSlug}/samples-${componentMatch[1]}.zip`;
    } else {
      storagePath = `products/${sanitizedSlug}/samples.zip`;
    }
  } else {
    storagePath = `products/${sanitizedSlug}/samples.zip`;
  }

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
    const fileSizeMB = fileSize / (1024 * 1024);

    console.log(`\n📦 Processing: ${product.name} (${productSlug})`);
    console.log(`   Source file: ${fileName}`);
    console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`);
    console.log(`   Storage path: ${storagePath}`);

    // Upload using CLI
    console.log("   📤 Uploading with Supabase CLI...");
    const uploadResult = await uploadWithCLI(zipFilePath, storagePath);

    if (!uploadResult.success) {
      return {
        productSlug,
        productName: product.name,
        success: false,
        error: uploadResult.error || "Upload failed",
      };
    }

    console.log("   ✅ File uploaded successfully!");

    // Prepare download object
    // For Tetrad Series, include component name
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
      file_size: fileSize,
    };

    // Update downloads array
    // For Tetrad Series, don't remove existing samples - they're separate components
    const currentDownloads = (product.downloads as any[]) || [];
    let filteredDownloads = currentDownloads;
    if (productSlug !== 'tetrad-series') {
      // For other products, remove existing samples (only one sample file per product)
      filteredDownloads = currentDownloads.filter(
        (d: any) => d.type !== "samples"
      );
    } else {
      // For Tetrad Series, remove only the specific component if it exists
      const componentMatch = folderSlug.match(/tetrad-(guitars|keys|winds)/);
      if (componentMatch) {
        filteredDownloads = currentDownloads.filter(
          (d: any) => !(d.type === "samples" && d.path === storagePath)
        );
      }
    }
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
  console.log("📦 Uploading Sample ZIP Files with Supabase CLI\n");
  console.log("=".repeat(70));

  // Check if Supabase CLI is installed
  try {
    execSync("supabase --version", { stdio: 'pipe' });
  } catch (error) {
    console.error("❌ Supabase CLI not found!");
    console.error("   Install it with: npm install -g supabase");
    console.error("   Or: brew install supabase/tap/supabase");
    process.exit(1);
  }

  // Check if sample-zips directory exists
  if (!fs.existsSync(SAMPLE_ZIPS_DIR)) {
    console.error(`❌ Sample ZIPs directory not found: ${SAMPLE_ZIPS_DIR}`);
    process.exit(1);
  }

  // Get all ZIP files
  const files = fs.readdirSync(SAMPLE_ZIPS_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('samples_'))
    .map(file => path.join(SAMPLE_ZIPS_DIR, file))
    .sort();

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

