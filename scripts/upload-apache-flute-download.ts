#!/usr/bin/env tsx

/**
 * Script to upload Apache Flute plugin download file to Supabase Storage
 * and update the product's downloads field
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";

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

async function uploadApacheFluteDownload() {
  console.log("📦 Uploading Apache Flute plugin download...\n");

  const filePath = "/Users/rjmacbookpro/Downloads/plugin_Apache.zip";
  const productId = "0ba4b698-da40-49a6-9bde-f363adccc3fa";
  const productSlug = "apache-flute";

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const fileName = "plugin_Apache.zip";

  console.log(`📄 File: ${fileName}`);
  console.log(`📊 Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);

  // Storage path structure: products/{product-slug}/plugin_{product-slug}.zip
  const storagePath = `products/${productSlug}/${fileName}`;

  try {
    // Read file
    console.log("📖 Reading file...");
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to Supabase Storage
    console.log(`📤 Uploading to storage: ${storagePath}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-downloads")
      .upload(storagePath, fileBuffer, {
        contentType: "application/zip",
        upsert: true, // Overwrite if exists
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      process.exit(1);
    }

    console.log("✅ File uploaded successfully!\n");

    // Get current product data
    console.log("📋 Fetching product data...");
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, downloads")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("❌ Error fetching product:", productError);
      process.exit(1);
    }

    // Prepare download object
    const downloadObject = {
      path: storagePath,
      name: "Apache Flute Plugin",
      type: "plugin",
      version: null, // Can be added later if needed
      file_size: fileSize,
    };

    // Update downloads array
    const currentDownloads = (product.downloads as any[]) || [];
    
    // Remove any existing plugin download for this product
    const filteredDownloads = currentDownloads.filter(
      (d: any) => d.type !== "plugin"
    );
    
    // Add new download
    const updatedDownloads = [...filteredDownloads, downloadObject];

    console.log("💾 Updating product downloads field...");
    const { error: updateError } = await supabase
      .from("products")
      .update({ downloads: updatedDownloads })
      .eq("id", productId);

    if (updateError) {
      console.error("❌ Error updating product:", updateError);
      process.exit(1);
    }

    console.log("✅ Product updated successfully!\n");
    console.log("📋 Download metadata:");
    console.log(JSON.stringify(downloadObject, null, 2));
    console.log("\n✅ Complete!");
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

uploadApacheFluteDownload()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });


