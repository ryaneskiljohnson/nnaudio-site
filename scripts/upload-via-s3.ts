#!/usr/bin/env tsx

/**
 * Upload files directly to Supabase Storage via S3 protocol
 * This handles large files much better than the regular API
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("❌ Could not extract project reference from URL");
  process.exit(1);
}

// Get S3 credentials from environment or prompt user
const S3_ACCESS_KEY_ID = process.env.SUPABASE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
const S3_REGION = process.env.SUPABASE_S3_REGION || "us-west-2";

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("❌ Missing S3 credentials!");
  console.error("");
  console.error("Please set in .env.local:");
  console.error("  SUPABASE_S3_ACCESS_KEY_ID=your_access_key_id");
  console.error("  SUPABASE_S3_SECRET_ACCESS_KEY=your_secret_access_key");
  console.error("  SUPABASE_S3_REGION=us-west-2 (optional)");
  console.error("");
  console.error("Get these from: Supabase Dashboard → Project Settings → Storage → S3 Configuration");
  process.exit(1);
}

// Create S3 client
const s3Client = new S3Client({
  forcePathStyle: true,
  region: S3_REGION,
  endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/s3`,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fileName = process.argv[2];
const storagePath = process.argv[3];

if (!fileName || !storagePath) {
  console.error("Usage: bun run scripts/upload-via-s3.ts <local-file> <storage-path>");
  console.error("");
  console.error("Example:");
  console.error('  bun run scripts/upload-via-s3.ts "/path/to/file.zip" "products/curio/samples.zip"');
  process.exit(1);
}

async function uploadViaS3() {
  const filePath = path.resolve(fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log(`📦 Uploading via S3: ${path.basename(filePath)}`);
  console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`   Storage path: ${storagePath}`);
  console.log(`   Bucket: product-downloads`);
  console.log("");

  try {
    console.log("📤 Uploading to S3...");
    const startTime = Date.now();

    const command = new PutObjectCommand({
      Bucket: "product-downloads",
      Key: storagePath,
      Body: fileBuffer,
      ContentType: "application/zip",
      CacheControl: "3600",
    });

    await s3Client.send(command);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Upload succeeded in ${elapsed}s!`);
    console.log(`   Path: ${storagePath}`);
    
    return true;
  } catch (error: any) {
    console.error(`❌ Upload failed:`, error.message || String(error));
    if (error.Code) {
      console.error(`   Error Code: ${error.Code}`);
    }
    return false;
  }
}

uploadViaS3().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

