/**
 * @fileoverview One-time recalculation of file_size for all product downloads.
 * @module scripts/backfill-product-download-file-sizes
 *
 * Fetches file size from each download path (Supabase storage or URL) and
 * updates products.downloads so stored sizes match the current link. Run once
 * to ensure all download fields are accurate.
 *
 * Run with: bun run scripts/backfill-product-download-file-sizes.ts
 */

import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { getDownloadFileSize } from "@/utils/product-downloads";
import { resolve } from "path";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

interface DownloadEntry {
  path?: string;
  url?: string;
  name?: string;
  type?: string;
  version?: string;
  file_size?: number | null;
  [k: string]: unknown;
}

async function main() {
  console.log("🔧 Recalculating file_size for all product downloads (one-time accuracy pass)\n");
  console.log("=".repeat(60));

  const supabase = await createSupabaseServiceRole();

  const { data: products, error } = await (supabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
    .from("products")
    .select("id, name, slug, downloads")
    .not("downloads", "is", null);

  if (error) {
    console.error("❌ Error fetching products:", error);
    process.exit(1);
  }

  let updatedCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const product of products || []) {
    const downloads = (product.downloads as DownloadEntry[]) || [];
    if (downloads.length === 0) continue;

    let hasChanges = false;
    const updatedDownloads: DownloadEntry[] = [];

    for (const download of downloads) {
      const pathOrUrl = (download.path || download.url)?.trim();
      if (!pathOrUrl) {
        updatedDownloads.push(download);
        skipCount++;
        continue;
      }

      const fileSize = await getDownloadFileSize(pathOrUrl, supabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>);
      if (fileSize != null) {
        const prevSize = download.file_size;
        if (prevSize !== fileSize) {
          hasChanges = true;
          updatedCount++;
        }
        const displayPath = pathOrUrl.startsWith("http") ? pathOrUrl.slice(0, 50) + "…" : path.basename(pathOrUrl);
        console.log(
          `  ✅ ${product.name}: ${displayPath} -> ${(fileSize / 1024 / 1024).toFixed(2)} MB`
        );
        updatedDownloads.push({ ...download, file_size: fileSize });
      } else {
        console.log(`  ⚠️  ${product.name}: Could not get size for ${pathOrUrl.startsWith("http") ? pathOrUrl.slice(0, 60) + "…" : pathOrUrl}`);
        updatedDownloads.push(download);
        failCount++;
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
  console.log(`✅ Done: ${updatedCount} download file_size values updated/verified`);
  if (skipCount > 0) console.log(`   (${skipCount} entries had no path/URL)`);
  if (failCount > 0) console.log(`   (${failCount} could not resolve size)`);
}

main().catch(console.error);
