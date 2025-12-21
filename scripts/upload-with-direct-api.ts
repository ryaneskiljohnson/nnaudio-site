#!/usr/bin/env tsx

/**
 * Upload large files using direct HTTP API calls with proper chunking
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
  console.error("Usage: bun run scripts/upload-with-direct-api.ts <local-file> <storage-path>");
  process.exit(1);
}

async function uploadWithDirectAPI() {
  const filePath = path.resolve(fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log(`📦 Uploading: ${path.basename(filePath)}`);
  console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`   Storage: ${storagePath}\n`);

  // Use direct HTTP API with proper headers
  const url = `${supabaseUrl}/storage/v1/object/product-downloads/${storagePath}`;
  
  const maxRetries = 30;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(10000 * attempt, 180000); // Up to 3 minutes
      console.log(`⏳ Retry ${attempt}/${maxRetries - 1} after ${delay/1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      console.log(`📤 Attempt ${attempt + 1}/${maxRetries}...`);
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/zip',
          'x-upsert': 'true',
          'Cache-Control': '3600',
        },
        body: fileBuffer,
        // @ts-ignore - AbortController for timeout
        signal: AbortSignal.timeout(600000), // 10 minute timeout
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Upload succeeded in ${elapsed}s!`);
        console.log(`   Response: ${JSON.stringify(data)}`);
        process.exit(0);
      }
      
      const errorText = await response.text();
      console.log(`❌ HTTP ${response.status}: ${errorText}`);
      
      if (response.status === 413) {
        console.log(`   File too large for API upload`);
        process.exit(1);
      }
      
      if (response.status >= 500) {
        // Server error, retry
        continue;
      }
      
      // Client error, don't retry
      process.exit(1);
    } catch (err: any) {
      const elapsed = ((Date.now() - Date.now()) / 1000).toFixed(1);
      console.log(`❌ Exception: ${err.message || String(err)}`);
      
      if (err.name === 'TimeoutError' || 
          err.message?.includes('timeout') ||
          err.message?.includes('connection') ||
          err.message?.includes('socket') ||
          err.message?.includes('closed')) {
        continue;
      }
      
      process.exit(1);
    }
  }
  
  console.log(`\n❌ Failed after ${maxRetries} attempts`);
  process.exit(1);
}

uploadWithDirectAPI();

