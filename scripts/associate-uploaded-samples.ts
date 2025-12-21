#!/usr/bin/env tsx

/**
 * Script to associate manually uploaded sample ZIP files with products
 * Run this after manually uploading large sample files via Supabase Dashboard
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
// Use simple naming: products/{slug}/samples.zip
const ALL_PRODUCTS_WITH_SAMPLES = [
  { slug: "albanju", size: 31.07 * 1024 * 1024 },
  { slug: "blaque", size: 795.51 * 1024 * 1024 },
  { slug: "game-boi-retro-sounds-free-plugin", size: 26.58 * 1024 * 1024 },
  { slug: "gameboi-pack", size: 26.57 * 1024 * 1024 },
  { slug: "natura", size: 1266.55 * 1024 * 1024 },
  { slug: "noker", size: 12.70 * 1024 * 1024 },
  { slug: "numb", size: 112.66 * 1024 * 1024 },
  { slug: "obscura-tortured-orchestral-box", size: 2119.74 * 1024 * 1024 },
  { slug: "obscura-royal-family-bundle-black-friday", size: 2119.74 * 1024 * 1024 },
  { slug: "perc-gadget", size: 22.41 * 1024 * 1024 },
  { slug: "percgadget-drum-machine", size: 22.42 * 1024 * 1024 },
  { slug: "prodigious", size: 1665.09 * 1024 * 1024 },
  { slug: "quoir", size: 52.93 * 1024 * 1024 },
  { slug: "reiya", size: 1957.55 * 1024 * 1024 },
  { slug: "strange-tingz-free-80s-plugin", size: 27.57 * 1024 * 1024 },
];

async function associateSampleUpload(upload: typeof ALL_PRODUCTS_WITH_SAMPLES[0]) {
  try {
    // Find product by slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, downloads")
      .eq("slug", upload.slug)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      console.error(`❌ Product not found: ${upload.slug}`);
      return false;
    }

    const fileName = "samples.zip";
    const storagePath = `products/${upload.slug}/${fileName}`;

    // Check if file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("product-downloads")
      .list(`products/${upload.slug}`, {
        limit: 100,
      });

    if (fileError) {
      console.error(`❌ Error checking file for ${upload.slug}:`, fileError);
      return false;
    }

    const fileExists = fileData?.some(f => f.name === fileName);

    if (!fileExists) {
      console.warn(`⚠️  File not found in storage: ${storagePath}`);
      console.warn(`   Please upload samples.zip to products/${upload.slug}/`);
      return false;
    }

    // Prepare download object
    const downloadObject = {
      path: storagePath,
      name: `${product.name} Samples`,
      type: "samples",
      version: null,
      file_size: upload.size,
    };

    // Update downloads array
    const currentDownloads = (product.downloads as any[]) || [];
    
    // Remove any existing samples download for this product
    const filteredDownloads = currentDownloads.filter(
      (d: any) => d.type !== "samples"
    );
    
    // Add new download
    const updatedDownloads = [...filteredDownloads, downloadObject];

    console.log(`💾 Updating ${product.name} (${upload.slug})...`);
    const { error: updateError } = await supabase
      .from("products")
      .update({ downloads: updatedDownloads })
      .eq("id", product.id);

    if (updateError) {
      console.error(`❌ Error updating ${upload.slug}:`, updateError);
      return false;
    }

    console.log(`✅ Successfully associated ${product.name}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Unexpected error for ${upload.slug}:`, error);
    return false;
  }
}

async function main() {
  console.log("🔗 Associating Manually Uploaded Sample Files\n");
  console.log("=".repeat(70));

  let successCount = 0;
  let failCount = 0;

  for (const upload of ALL_PRODUCTS_WITH_SAMPLES) {
    console.log(`\n📦 Processing: ${upload.slug}`);
    const success = await associateSampleUpload(upload);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary\n");
  console.log(`✅ Successfully associated: ${successCount} files`);
  console.log(`❌ Failed: ${failCount} files`);

  if (failCount > 0) {
    console.log("\n⚠️  Some files may not be uploaded yet. Please check:");
    console.log("   1. Files are uploaded to Supabase Storage");
    console.log("   2. File paths match: products/{slug}/samples.zip");
    console.log("   3. Run this script again after uploading");
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

