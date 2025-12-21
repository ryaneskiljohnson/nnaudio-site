#!/usr/bin/env tsx

/**
 * Upload a single large file with maximum retries and patience
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const fileName = process.argv[2];
const storagePath = process.argv[3];

if (!fileName || !storagePath) {
  console.error("Usage: bun run scripts/upload-single-large-file.ts <local-file> <storage-path>");
  process.exit(1);
}

async function upload() {
  const filePath = path.resolve(fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  
  console.log(`📦 Uploading: ${path.basename(filePath)}`);
  console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`   Storage: ${storagePath}\n`);

  const fileBuffer = fs.readFileSync(filePath);
  const maxRetries = 20; // Very patient
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(5000 * attempt, 120000); // Up to 2 minutes
      console.log(`⏳ Retry ${attempt}/${maxRetries - 1} after ${delay/1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      console.log(`📤 Attempt ${attempt + 1}/${maxRetries}...`);
      const startTime = Date.now();
      
      const { data, error } = await supabase.storage
        .from("product-downloads")
        .upload(storagePath, fileBuffer, {
          contentType: "application/zip",
          upsert: true,
          cacheControl: "3600",
        });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (!error) {
        console.log(`✅ Upload succeeded in ${elapsed}s!`);
        process.exit(0);
      }
      
      console.log(`❌ Error: ${error.message}`);
      
      if (!error.message.includes('timeout') && 
          !error.message.includes('connection') &&
          !error.message.includes('socket') &&
          !error.message.includes('closed')) {
        process.exit(1);
      }
    } catch (err: any) {
      console.log(`❌ Exception: ${err.message || String(err)}`);
      if (!err.message?.includes('timeout') && 
          !err.message?.includes('connection') &&
          !err.message?.includes('socket')) {
        process.exit(1);
      }
    }
  }
  
  console.log(`\n❌ Failed after ${maxRetries} attempts`);
  process.exit(1);
}

upload();

