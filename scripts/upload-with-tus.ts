#!/usr/bin/env tsx

/**
 * Upload large files using TUS resumable upload protocol
 * This is required for files over 2GB
 */

import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing credentials");
  process.exit(1);
}

const fileName = process.argv[2];
const storagePath = process.argv[3];

if (!fileName || !storagePath) {
  console.error("Usage: bun run scripts/upload-with-tus.ts <local-file> <storage-path>");
  process.exit(1);
}

async function uploadWithTUS() {
  const filePath = path.resolve(fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log(`📦 Uploading with TUS: ${path.basename(filePath)}`);
  console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`   Storage: ${storagePath}\n`);

  // TUS resumable upload endpoint
  const tusEndpoint = `${supabaseUrl}/storage/v1/upload/resumable`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/product-downloads/${storagePath}`;

  // Step 1: Create upload session
  try {
    console.log("📤 Creating TUS upload session...");
    
    const createResponse = await fetch(tusEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Upload-Length': stats.size.toString(),
        'Upload-Metadata': `filename ${Buffer.from(path.basename(filePath)).toString('base64')},contentType ${Buffer.from('application/zip').toString('base64')}`,
        'Tus-Resumable': '1.0.0',
        'X-Upsert': 'true',
      },
    });

    if (!createResponse.ok) {
      // If TUS not available, fall back to standard upload with many retries
      console.log("⚠️  TUS not available, using standard upload with extended retries...");
      return await uploadStandardWithManyRetries(fileBuffer, uploadUrl, stats.size);
    }

    const uploadLocation = createResponse.headers.get('Location');
    if (!uploadLocation) {
      console.log("⚠️  No upload location, using standard upload...");
      return await uploadStandardWithManyRetries(fileBuffer, uploadUrl, stats.size);
    }

    console.log(`✅ Upload session created: ${uploadLocation}`);

    // Step 2: Upload file in chunks
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    let offset = 0;

    while (offset < stats.size) {
      const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, stats.size));
      const endOffset = offset + chunk.length - 1;

      console.log(`📤 Uploading chunk: ${(offset / 1024 / 1024).toFixed(2)} MB - ${(endOffset / 1024 / 1024).toFixed(2)} MB`);

      const chunkResponse = await fetch(uploadLocation, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': offset.toString(),
          'Tus-Resumable': '1.0.0',
        },
        body: chunk,
      });

      if (!chunkResponse.ok) {
        const errorText = await chunkResponse.text();
        console.error(`❌ Chunk upload failed: ${chunkResponse.status} - ${errorText}`);
        return false;
      }

      const newOffset = parseInt(chunkResponse.headers.get('Upload-Offset') || '0');
      offset = newOffset;
    }

    console.log(`✅ Upload completed!`);
    return true;

  } catch (error: any) {
    console.log(`⚠️  TUS upload failed: ${error.message}`);
    console.log("   Falling back to standard upload...");
    return await uploadStandardWithManyRetries(fileBuffer, uploadUrl, stats.size);
  }
}

async function uploadStandardWithManyRetries(fileBuffer: Buffer, uploadUrl: string, fileSize: number): Promise<boolean> {
  console.log("📤 Using standard upload with 100 retries...");
  
  for (let attempt = 0; attempt < 100; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(20000 * attempt, 600000); // Up to 10 minutes
      console.log(`⏳ Retry ${attempt}/99 after ${(delay/1000).toFixed(0)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      console.log(`📤 Attempt ${attempt + 1}/100...`);
      const startTime = Date.now();

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/zip',
          'x-upsert': 'true',
          'Cache-Control': '3600',
        },
        body: fileBuffer,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (response.ok) {
        console.log(`✅ Upload succeeded in ${elapsed}s!`);
        return true;
      }

      const errorText = await response.text();
      console.log(`❌ HTTP ${response.status}: ${errorText.substring(0, 200)}`);

      if (response.status >= 500 || response.status === 408) {
        continue; // Retry on server errors
      }

      return false;
    } catch (err: any) {
      console.log(`❌ Exception: ${err.message || String(err)}`);
      if (err.message?.includes('timeout') ||
          err.message?.includes('connection') ||
          err.message?.includes('socket')) {
        continue;
      }
      return false;
    }
  }

  return false;
}

uploadWithTUS().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

