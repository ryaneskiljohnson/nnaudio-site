/**
 * @fileoverview Backfills file_size for product downloads that are missing it
 * Fetches file metadata from Supabase storage and updates the products.downloads JSONB
 * Run with: bun run scripts/backfill-product-download-file-sizes.ts
 * @module scripts/backfill-product-download-file-sizes
 */

import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { resolve } from "path";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

interface DownloadEntry {
  path?: string;
  url?: string;
  name?: string;
  type?: string;
  version?: string;
  file_size?: number | null;
}

async function getFileSizeFromStorage(
  storagePath: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>
): Promise<number | null> {
  try {
    const dirPath = path.dirname(storagePath);
    const fileName = path.basename(storagePath);

    const { data, error } = await supabase.storage
      .from("product-downloads")
      .list(dirPath);

    if (error || !data) return null;

    const fileInfo = data.find((f) => f.name === fileName);
    if (!fileInfo?.metadata?.size) return null;

    return fileInfo.metadata.size as number;
  } catch {
    return null;
  }
}

async function main() {
  console.log("🔧 Backfilling file_size for product downloads\n");
  console.log("=".repeat(60));

  const supabase = await createSupabaseServiceRole();

  const { data: products, error } = await (supabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
    .from("products")
    .select("id, name, slug, downloads")
    .eq("status", "active")
    .not("downloads", "is", null);

  if (error) {
    console.error("❌ Error fetching products:", error);
    process.exit(1);
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of products || []) {
    const downloads = (product.downloads as DownloadEntry[]) || [];
    if (downloads.length === 0) continue;

    let hasChanges = false;
    const updatedDownloads: DownloadEntry[] = [];

    for (const download of downloads) {
      const storagePath = download.path || download.url;
      if (!storagePath || storagePath.startsWith("http")) {
        skippedCount++;
        updatedDownloads.push(download);
        continue;
      }

      if (download.file_size != null && download.file_size > 0) {
        updatedDownloads.push(download);
        continue;
      }

      const fileSize = await getFileSizeFromStorage(storagePath, supabase);
      if (fileSize != null) {
        hasChanges = true;
        updatedCount++;
        console.log(
          `  ✅ ${product.name}: ${path.basename(storagePath)} -> ${(fileSize / 1024 / 1024).toFixed(2)} MB`
        );
        updatedDownloads.push({ ...download, file_size: fileSize });
      } else {
        console.log(`  ⚠️  ${product.name}: Could not get size for ${storagePath}`);
        updatedDownloads.push(download);
      }
    }

    if (hasChanges) {
      const { error: updateError } = await (supabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
        .from("products")
        .update({ downloads: updatedDownloads })
        .eq("id", product.id);

      if (updateError) {
        console.error(`❌ Error updating ${product.name}:`, updateError);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Backfill complete: ${updatedCount} downloads updated`);
  if (skippedCount > 0) {
    console.log(`   (${skippedCount} skipped - external URLs or already have size)`);
  }
}

main().catch(console.error);
