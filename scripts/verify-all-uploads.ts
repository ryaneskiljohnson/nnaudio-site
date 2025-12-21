#!/usr/bin/env tsx

/**
 * Script to verify ALL sample libraries are uploaded to Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";

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

const SAMPLE_ZIPS_DIR = path.join(process.cwd(), "sample-zips");

// Manual mapping for folders that don't match product slugs exactly
const FOLDER_TO_SLUG_MAPPING: Record<string, string> = {
  'albanju-middle-eastern-banjo': 'albanju',
  'apache-native-american-flute': 'apache-flute',
  'bakers-dozen-bundle': 'bakers-dozen',
  'blaque-dark-electric-guitar': 'blaque',
  'curio-sample-archive': 'curio-texture-generator',
  'digitaldreamsacpe-sample-archive': 'digitaldreamscape-quad-rompler',
  'evanescent-baby-grand-pianio': 'evanescent-baby-grand-piano',
  'game-boi-sample-archive': 'game-boi-retro-sounds-free-plugin',
  'go-to-work-modern-song-constructions': 'go-to-work-modern-song-constructions',
  'jay-harp-sample-archive': 'cowboy-harp-free-jaw-harp-plugin',
  'mandolele-mandolin-and-ukulele': 'mandolele-mandolin-ukulele',
  'mesosphere-samples-archive': 'mesosphere',
  'natura-sampled-analog-instrument': 'natura',
  'noker-drum-and-bass': 'noker',
  'numb-dark-acoustic-guitar': 'numb',
  'obscura-sample-archive': 'obscura-tortured-orchestral-box',
  'perc-gadget-sample-archive': 'perc-gadget',
  'prodigious-samples-archive': 'prodigious',
  'quoir-mixed-vocal-choir': 'quoir',
  'reiya-sample-archive': 'reiya',
  'rompl-workstation-sample-archive': 'rompl-workstation',
  'strange-tingz-samples-archive': 'strange-tingz-free-80s-plugin',
  'subflux-sample-archive': 'subflux-bass-module',
  'tactures-sample-archive': 'tactures',
  'tetrad-guitars-sample-archive': 'tetrad-series',
  'tetrad-keys-samples-archive': 'tetrad-series',
  'tetrad-winds-sample-archive': 'tetrad-series',
};

async function checkFileInStorage(storagePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from("product-downloads")
      .list(path.dirname(storagePath));

    if (error) {
      return false;
    }

    const fileName = path.basename(storagePath);
    return data?.some(file => file.name === fileName) || false;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log("🔍 Verifying ALL Sample Library Uploads\n");
  console.log("=".repeat(70));

  // Get all ZIP files
  const files = fs.readdirSync(SAMPLE_ZIPS_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('samples_'))
    .map(file => path.join(SAMPLE_ZIPS_DIR, file))
    .sort();

  console.log(`\n📦 Found ${files.length} sample ZIP files locally\n`);

  const results: Array<{
    fileName: string;
    productSlug: string;
    storagePath: string;
    exists: boolean;
    size: number;
  }> = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const slugMatch = fileName.match(/^samples_(.+)\.zip$/);
    
    if (!slugMatch) continue;

    const folderSlug = slugMatch[1];
    const productSlug = FOLDER_TO_SLUG_MAPPING[folderSlug] || folderSlug;
    
    const sanitizedSlug = productSlug
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let storagePath: string;
    if (productSlug === 'tetrad-series') {
      const componentMatch = folderSlug.match(/tetrad-(guitars|keys|winds)/);
      if (componentMatch) {
        storagePath = `products/${sanitizedSlug}/samples-${componentMatch[1]}.zip`;
      } else {
        storagePath = `products/${sanitizedSlug}/samples.zip`;
      }
    } else {
      storagePath = `products/${sanitizedSlug}/samples.zip`;
    }

    const stats = fs.statSync(filePath);
    const exists = await checkFileInStorage(storagePath);

    results.push({
      fileName,
      productSlug,
      storagePath,
      exists,
      size: stats.size,
    });
  }

  // Summary
  const uploaded = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);

  console.log("\n📊 Verification Results:\n");
  console.log(`✅ Uploaded: ${uploaded.length}/${results.length}`);
  console.log(`❌ Missing: ${missing.length}/${results.length}\n`);

  if (missing.length > 0) {
    console.log("❌ MISSING FILES:\n");
    missing.forEach(r => {
      console.log(`   - ${r.fileName}`);
      console.log(`     Product: ${r.productSlug}`);
      console.log(`     Expected: ${r.storagePath}`);
      console.log(`     Size: ${(r.size / 1024 / 1024).toFixed(2)} MB\n`);
    });
  } else {
    console.log("✅ ALL FILES VERIFIED IN SUPABASE STORAGE!\n");
  }

  // Also check database associations
  console.log("\n🔍 Checking database associations...\n");
  
  const productsWithSamples = new Set<string>();
  for (const result of results) {
    if (result.exists) {
      productsWithSamples.add(result.productSlug);
    }
  }

  let dbCheckCount = 0;
  for (const slug of productsWithSamples) {
    const { data: product } = await supabase
      .from("products")
      .select("id, name, slug, downloads")
      .eq("slug", slug)
      .single();

    if (product) {
      const downloads = (product.downloads as any[]) || [];
      const hasSamples = downloads.some((d: any) => d.type === "samples");
      
      if (hasSamples) {
        dbCheckCount++;
      } else {
        console.log(`⚠️  ${product.name} (${slug}) - File uploaded but not in database downloads`);
      }
    }
  }

  console.log(`\n✅ Database associations: ${dbCheckCount}/${productsWithSamples.size} products have sample downloads\n`);

  if (missing.length === 0 && dbCheckCount === productsWithSamples.size) {
    console.log("🎉 ALL SAMPLE LIBRARIES ARE UPLOADED AND ASSOCIATED!\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some files need to be uploaded or associated.\n");
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

