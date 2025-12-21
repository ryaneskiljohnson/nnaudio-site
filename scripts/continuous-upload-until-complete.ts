#!/usr/bin/env tsx

/**
 * Continuously retry uploading missing files until ALL are uploaded
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

const MISSING_FILES = [
  { file: 'sample-zips/samples_bakers-dozen-bundle.zip', path: 'products/bakers-dozen/samples.zip' },
  { file: 'sample-zips/samples_digitaldreamsacpe-sample-archive.zip', path: 'products/digitaldreamscape-quad-rompler/samples.zip' },
  { file: 'sample-zips/samples_obscura-sample-archive.zip', path: 'products/obscura-tortured-orchestral-box/samples.zip' },
];

async function checkFileExists(storagePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from("product-downloads")
      .list(path.dirname(storagePath));

    if (error) return false;
    const fileName = path.basename(storagePath);
    return data?.some(f => f.name === fileName) || false;
  } catch {
    return false;
  }
}

async function uploadFile(filePath: string, storagePath: string): Promise<boolean> {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`\n📦 Uploading: ${path.basename(filePath)} (${fileSizeMB.toFixed(2)} MB)`);

  for (let attempt = 0; attempt < 50; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(15000 * attempt, 300000); // Up to 5 minutes
      console.log(`⏳ Retry ${attempt}/49 after ${(delay/1000).toFixed(0)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      console.log(`📤 Attempt ${attempt + 1}/50...`);
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
        return true;
      }

      console.log(`❌ Error: ${error.message}`);

      if (!error.message.includes('timeout') &&
          !error.message.includes('connection') &&
          !error.message.includes('socket') &&
          !error.message.includes('closed')) {
        return false;
      }
    } catch (err: any) {
      console.log(`❌ Exception: ${err.message || String(err)}`);
      if (!err.message?.includes('timeout') &&
          !err.message?.includes('connection') &&
          !err.message?.includes('socket')) {
        return false;
      }
    }
  }

  return false;
}

async function main() {
  console.log("🔄 Continuous Upload Until Complete\n");
  console.log("=".repeat(70));

  let round = 0;

  while (true) {
    round++;
    console.log(`\n\n🔄 Round ${round} - $(new Date().toLocaleTimeString())`);
    console.log("=".repeat(70));

    const stillMissing: typeof MISSING_FILES = [];

    for (const { file, path: storagePath } of MISSING_FILES) {
      const exists = await checkFileExists(storagePath);
      if (exists) {
        console.log(`✅ ${path.basename(file)} - Already uploaded!`);
      } else {
        stillMissing.push({ file, path: storagePath });
      }
    }

    if (stillMissing.length === 0) {
      console.log("\n🎉🎉🎉 ALL FILES UPLOADED! 🎉🎉🎉\n");
      break;
    }

    console.log(`\n📋 Still missing: ${stillMissing.length} files\n`);

    for (const { file, path: storagePath } of stillMissing) {
      const success = await uploadFile(file, storagePath);
      if (success) {
        // Verify it's actually there
        await new Promise(resolve => setTimeout(resolve, 5000));
        const verified = await checkFileExists(storagePath);
        if (verified) {
          console.log(`✅ Verified: ${path.basename(file)} is in storage!`);
        }
      }
    }

    console.log(`\n⏳ Waiting 2 minutes before next round...`);
    await new Promise(resolve => setTimeout(resolve, 120000));
  }
}

main().catch(console.error);

