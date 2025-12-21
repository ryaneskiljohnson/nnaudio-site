#!/usr/bin/env tsx

/**
 * Upload all sample libraries via S3 protocol
 */

import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const S3_ACCESS_KEY_ID = process.env.SUPABASE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
const S3_REGION = process.env.SUPABASE_S3_REGION || "us-west-2";

if (!supabaseUrl || !supabaseServiceKey || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("❌ Missing credentials. Set SUPABASE_S3_ACCESS_KEY_ID and SUPABASE_S3_SECRET_ACCESS_KEY in .env.local");
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SAMPLES_DIR = '/Volumes/T7/NNAudio Sample Libraries 2';
const STORAGE_PATH = 'products/sample-libraries';

async function uploadFile(filePath: string, storagePath: string): Promise<boolean> {
  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  
  console.log(`\n📦 ${path.basename(filePath)} (${fileSizeMB.toFixed(2)} MB)`);
  console.log(`   → ${storagePath}`);

  // Use multipart upload for files over 100MB
  if (fileSizeMB > 100) {
    return await uploadMultipart(filePath, storagePath, stats.size);
  }

  // Use simple upload for smaller files
  try {
    const startTime = Date.now();
    const fileBuffer = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: "product-downloads",
      Key: storagePath,
      Body: fileBuffer,
      ContentType: "application/zip",
      CacheControl: "3600",
    });

    await s3Client.send(command);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ Uploaded in ${elapsed}s`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message || String(error)}`);
    return false;
  }
}

async function uploadMultipart(filePath: string, storagePath: string, fileSize: number): Promise<boolean> {
  const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
  const fileBuffer = fs.readFileSync(filePath);
  
  try {
    console.log(`   📤 Starting multipart upload (${Math.ceil(fileSize / CHUNK_SIZE)} parts)...`);
    const startTime = Date.now();

    // Step 1: Create multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: "product-downloads",
      Key: storagePath,
      ContentType: "application/zip",
      CacheControl: "3600",
    });

    const { UploadId } = await s3Client.send(createCommand);
    if (!UploadId) {
      throw new Error("Failed to create multipart upload");
    }

    // Step 2: Upload parts
    const parts: Array<{ ETag: string; PartNumber: number }> = [];
    let offset = 0;
    let partNumber = 1;

    while (offset < fileSize) {
      const chunk = fileBuffer.slice(offset, Math.min(offset + CHUNK_SIZE, fileSize));
      const progress = ((offset / fileSize) * 100).toFixed(1);
      console.log(`   📤 Uploading part ${partNumber} (${progress}%)...`);

      const uploadPartCommand = new UploadPartCommand({
        Bucket: "product-downloads",
        Key: storagePath,
        PartNumber: partNumber,
        UploadId,
        Body: chunk,
      });

      const { ETag } = await s3Client.send(uploadPartCommand);
      if (!ETag) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      parts.push({ ETag, PartNumber: partNumber });
      offset += chunk.length;
      partNumber++;
    }

    // Step 3: Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: "product-downloads",
      Key: storagePath,
      UploadId,
      MultipartUpload: { Parts: parts },
    });

    await s3Client.send(completeCommand);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ Uploaded in ${elapsed}s (multipart)`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message || String(error)}`);
    return false;
  }
}

// No database updates needed - files are just uploaded to storage

async function main() {
  console.log("📦 Uploading All Sample Libraries via S3\n");
  console.log("=".repeat(70));

  const files = fs.readdirSync(SAMPLES_DIR)
    .filter(f => f.endsWith('.zip') && f.startsWith('samples_'))
    .map(f => path.join(SAMPLES_DIR, f))
    .sort();

  console.log(`\nFound ${files.length} sample ZIP files\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const fileName = path.basename(filePath);

    console.log(`\n[${i + 1}/${files.length}]`);

    // Upload directly to products/sample-libraries/{filename}
    const storagePath = `${STORAGE_PATH}/${fileName}`;

    const success = await uploadFile(filePath, storagePath);

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
}

main().catch(console.error);

