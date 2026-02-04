#!/usr/bin/env tsx
/**
 * @fileoverview Associates MIDI files in products/midi storage with products
 * @module scripts/associate-midi-downloads
 *
 * 1:1 mapping: each file maps to exactly one product, each product gets exactly one MIDI download.
 * Updates products.downloads JSONB - replaces all midi entries with the single mapped file.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 1:1 mapping: filename -> product slug.
 * Every file in products/midi maps to exactly one product.
 * Every product gets exactly one MIDI download.
 */
const FILENAME_TO_SLUG: Record<string, string> = {
  "Alice Serum & Cthulhu - New Nation .zip": "alice-cthulhu",
  "Bakers Delight MIDI Collection - New Nation.zip": "bakers-delight-midi",
  "Bakers Dozen Bundle.zip": "bakers-dozen",
  "Blossom MIDI Collection - New Nation.zip": "blossom-midi",
  "Broken MIDI Collection - New Nation.zip": "broken-midi",
  "Cryptic Tales MIDI Collection - New Nation.zip": "cryptic-tales-midi",
  "Cthulhu Godz 1 - New Nation.zip": "cthulhu-godz-1",
  "Cthulhu Godz 2 - New Nation.zip": "cthulhu-godz-2",
  "Demented Wisdom MIDI Collection - New Nation.zip": "demented-wisdom-midi",
  "Element Cthulhu - New Nation.zip": "element-cthulhu",
  "Flower Cthulhu - New Nation.zip": "flower-cthulhu",
  "Go To Work - Modern Song Constructions.zip": "go-to-work-modern-song-constructions",
  "La Fleur MIDI Collection.zip": "la-fleur-midi",
  "Life & Death MIDI Collection.zip": "life-death-midi",
  "Lofi Jamz Sample Pack - New Nation.zip": "lofi-jamz",
  "MIDI Apache FREE Pack - New Nation.zip": "apache-free-midi",
  "MIDI Library 1.zip": "midi-library-1",
  "MIDI Library 2.zip": "midi-library-2",
  "MIDI Library 3.zip": "midi-library-3",
  "MIDI Library 4.zip": "midi-library-4",
  "MIDI Rabbit Hole FREE Pack - New Nation.zip": "rabbit-hole-free-midi",
  "MIDI Swiper FREE Pack - New Nation.zip": "swiper-midi-free",
  "Modern Cthulhu 1 - New Nation.zip": "modern-cthulhu-1",
  "Modern Cthulhu 2 - New Nation.zip": "modern-cthulhu-2",
  "Mutahad - Prototype Pack - New Nation.zip": "mutahad-prototype",
  "Mutahad Premium Sample Pack - New Nation.zip": "mutahad-sample-library",
  "Ooze MIDI Collection - New Nation.zip": "ooze-midi",
  "Primal Cthulhu - New Nation.zip": "primal-cthulhu",
  "Reflection Cthulhu - New Nation.zip": "reflection-cthulhu",
  "Ride Away - Modern Song Constructions.zip": "ride-away-modern-song-constructions",
  "So Far Gone MIDI Collection.zip": "so-far-gone-midi",
  "Sun Goes Down MIDI Collection - New Nation.zip": "sun-goes-down-midi",
  "The Code - Modern Song Constructions.zip": "the-code-modern-song-constructions",
  "Time Zones MIDI Collection - New Nation.zip": "time-zones-midi",
  "Trapsoul MIDI Collection - New Nation.zip": "trapsoul-midi",
  "Ultimate 808 Bundle - New Nation.zip": "ultimate-808-bundle",
  "Ultimate Drums & Percs 1 - New Nation.zip": "ultimate-drums-percs-1",
  "Ultimate Drums & Percs 2 - New Nation.zip": "ultimate-drums-percs-2",
  "Ultimate MIDI Collection 1 - New Nation.zip": "ultimate-midi-collection-1",
  "Ultimate MIDI Collection 2 - New Nation.zip": "ultimate-midi-collection-2",
  "Ultimate MIDI Collection 3 - New Nation.zip": "ultimate-midi-collection-3",
  "Ultimate MIDI Collection 4 - New Nation.zip": "ultimate-midi-collection-4",
  "Ultimate MIDI Collection 5 - New Nation.zip": "ultimate-midi-collection-5",
  "Ultimate MIDI Collection 6 - New Nation.zip": "ultimate-midi-collection-6",
  "Weaknd Cthulhu - New Nation.zip": "weaknd-cthulhu",
  "Yonkers Cthulhu - New Nation.zip": "yonkers-cthulhu",
};

interface StorageFile {
  name: string;
  metadata?: { size?: number };
}

/**
 * Sets exactly one MIDI download for the product.
 * Removes all existing midi entries, adds only this file.
 */
async function setSingleMidiDownload(
  fileName: string,
  productSlug: string,
  fileSize: number
): Promise<boolean> {
  const storagePath = `products/midi/${fileName}`;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, downloads")
    .eq("slug", productSlug)
    .eq("status", "active")
    .single();

  if (productError || !product) {
    console.error(`  ❌ Product not found: ${productSlug}`);
    return false;
  }

  const midiLabel = product.name.toLowerCase().includes("midi") ? "" : " MIDI";
  const downloadObject = {
    path: storagePath,
    name: `${product.name}${midiLabel}`,
    type: "midi",
    version: null,
    file_size: fileSize,
  };

  const currentDownloads = (product.downloads as any[]) || [];
  const otherDownloads = currentDownloads.filter((d: any) => d.type !== "midi");
  const updatedDownloads = [...otherDownloads, downloadObject];

  const { error: updateError } = await supabase
    .from("products")
    .update({ downloads: updatedDownloads })
    .eq("id", product.id);

  if (updateError) {
    console.error(`  ❌ Update error: ${updateError.message}`);
    return false;
  }

  console.log(`  ✅ ${product.name} (${productSlug})`);
  return true;
}

async function main() {
  console.log("🔗 Associating MIDI Downloads (1:1 mapping, single per product)\n");
  console.log("=".repeat(70));

  const { data: files, error } = await supabase.storage
    .from("product-downloads")
    .list("products/midi", { limit: 500 });

  if (error) {
    console.error("❌ Error listing storage:", error);
    process.exit(1);
  }

  const storageFiles = (files || []) as StorageFile[];
  const zipFiles = storageFiles.filter((f) => f.name.endsWith(".zip"));
  console.log(`\n📦 Found ${zipFiles.length} ZIP files in products/midi\n`);

  const unmapped: string[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const file of zipFiles) {
    const productSlug = FILENAME_TO_SLUG[file.name];
    if (!productSlug) {
      unmapped.push(file.name);
      failCount++;
      continue;
    }

    const fileSize = file.metadata?.size ?? 0;
    console.log(`\n📄 ${file.name}`);
    const success = await setSingleMidiDownload(file.name, productSlug, fileSize);
    if (success) successCount++;
    else failCount++;
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary\n");
  console.log(`✅ Associated: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  if (unmapped.length > 0) {
    console.log(`\n⚠️  Unmapped files (add to FILENAME_TO_SLUG):`);
    unmapped.forEach((f) => console.log(`   - ${f}`));
  }
  console.log("\n✅ Complete!");
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});
