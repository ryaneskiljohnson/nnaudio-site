#!/usr/bin/env tsx

/**
 * Check what files are uploaded to products/sample-libraries
 */

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S3_ACCESS_KEY_ID = process.env.SUPABASE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
const S3_REGION = process.env.SUPABASE_S3_REGION || "us-west-2";

if (!supabaseUrl || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("❌ Missing credentials");
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("❌ Could not extract project reference");
  process.exit(1);
}

const s3Client = new S3Client({
  forcePathStyle: true,
  region: S3_REGION,
  endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/s3`,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

async function checkUploads() {
  console.log("🔍 Checking uploaded files in products/sample-libraries...\n");

  try {
    const command = new ListObjectsV2Command({
      Bucket: "product-downloads",
      Prefix: "products/sample-libraries/",
    });

    const response = await s3Client.send(command);

    if (response.Contents && response.Contents.length > 0) {
      console.log(`✅ Found ${response.Contents.length} files:\n`);
      response.Contents.forEach((file) => {
        const sizeMB = ((file.Size || 0) / 1024 / 1024).toFixed(2);
        console.log(`   - ${file.Key?.replace('products/sample-libraries/', '')} (${sizeMB} MB)`);
      });
    } else {
      console.log("❌ No files found in products/sample-libraries/");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message || String(error));
  }
}

checkUploads();

