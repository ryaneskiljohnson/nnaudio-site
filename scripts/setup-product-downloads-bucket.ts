#!/usr/bin/env tsx

/**
 * Script to set up the product-downloads storage bucket in Supabase
 * Run this once to create the bucket for storing product download files
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

async function setupBucket() {
  console.log("🔧 Setting up product-downloads storage bucket...\n");

  const bucketName = "product-downloads";

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("❌ Error listing buckets:", listError);
      return;
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (bucketExists) {
      console.log(`✅ Bucket "${bucketName}" already exists`);
      
      // Verify it's private (for security)
      const bucket = buckets.find((b) => b.name === bucketName);
      if (bucket?.public) {
        console.warn(
          `⚠️  WARNING: Bucket "${bucketName}" is public. For security, it should be private.`
        );
        console.warn(
          "   Signed URLs will be used for downloads, so the bucket should be private."
        );
      } else {
        console.log("✅ Bucket is private (secure)");
      }
      return;
    }

    // Create bucket
    console.log(`📦 Creating bucket "${bucketName}"...`);

    const { data: bucketData, error: createError } =
      await supabase.storage.createBucket(bucketName, {
        public: false, // Private bucket - use signed URLs for access
        allowedMimeTypes: [
          // Plugin files
          "application/zip",
          "application/x-zip-compressed",
          // Sample libraries
          "audio/wav",
          "audio/mpeg",
          "audio/mp3",
          // Documentation
          "application/pdf",
          // MIDI files
          "audio/midi",
          "audio/x-midi",
          // Generic
          "application/octet-stream",
        ],
      });

    if (createError) {
      console.error("❌ Error creating bucket:", createError);
      return;
    }

    console.log(`✅ Successfully created bucket "${bucketName}"`);
    console.log("\n📋 Bucket Configuration:");
    console.log("   - Name: product-downloads");
    console.log("   - Public: false (private, uses signed URLs)");
    console.log("   - Max file size: 10GB");
    console.log("   - Allowed types: ZIP, audio files, PDF, MIDI");
    console.log(
      "\n💡 Next steps:"
    );
    console.log(
      "   1. Upload product files to this bucket using the admin UI"
    );
    console.log(
      "   2. Add download metadata to products.downloads JSON field"
    );
    console.log(
      "   3. Desktop app will request signed URLs via /api/nnaudio-access/download"
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

setupBucket()
  .then(() => {
    console.log("\n✅ Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });

