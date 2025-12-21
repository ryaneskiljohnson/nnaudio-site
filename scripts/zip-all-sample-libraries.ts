#!/usr/bin/env tsx

/**
 * Script to zip all sample library folders with samples_ prefix
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const SAMPLE_LIBRARIES_PATH = "/Volumes/T7/NNAudio Sample Libraries";
const OUTPUT_DIR = path.join(process.cwd(), "sample-zips");

// Normalize folder name to slug format
function normalizeToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function zipSampleLibrary(folderName: string): Promise<boolean> {
  const folderPath = path.join(SAMPLE_LIBRARIES_PATH, folderName);
  
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    return false;
  }

  // Create slug from folder name
  const slug = normalizeToSlug(folderName);
  const zipFileName = `samples_${slug}.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipFileName);

  try {
    // Remove existing ZIP if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    console.log(`📦 Zipping: ${folderName}`);
    console.log(`   → ${zipFileName}`);

    // Create ZIP using zip command
    // -r = recursive, -x = exclude macOS metadata
    const zipCommand = `cd "${SAMPLE_LIBRARIES_PATH}" && zip -r "${zipPath}" "${folderName}" -x "*.DS_Store" "*__MACOSX*" "*/.*"`;
    
    execSync(zipCommand, { stdio: 'inherit' });

    // Get file size
    const stats = fs.statSync(zipPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`   ✅ Created: ${zipFileName} (${fileSizeMB} MB)\n`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error creating ZIP for ${folderName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("📦 Zipping All Sample Libraries\n");
  console.log("=".repeat(70));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if sample libraries path exists
  if (!fs.existsSync(SAMPLE_LIBRARIES_PATH)) {
    console.error(`❌ Sample libraries path not found: ${SAMPLE_LIBRARIES_PATH}`);
    process.exit(1);
  }

  // Get all folders in the sample libraries directory
  const entries = fs.readdirSync(SAMPLE_LIBRARIES_PATH, { withFileTypes: true });
  const folders = entries
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !name.startsWith(".")); // Skip hidden folders

  console.log(`Found ${folders.length} sample library folders\n`);

  let successCount = 0;
  let failCount = 0;

  for (const folder of folders) {
    const success = await zipSampleLibrary(folder);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("=".repeat(70));
  console.log("\n📊 Summary\n");
  console.log(`✅ Successfully created: ${successCount} ZIP files`);
  console.log(`❌ Failed: ${failCount} ZIP files`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);

