/**
 * @fileoverview CLI to run storage PNG/JPEG → WebP conversion (loads .env.local).
 * @module scripts/run-storage-convert-to-webp
 *
 * Usage: bun run scripts/run-storage-convert-to-webp.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { convertStorageToWebP } from "../utils/site-management/convert-storage-to-webp";
import { Database } from "../database.types";

dotenv.config({ path: path.join(import.meta.dir, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);
  console.log("Running storage conversion" + (dryRun ? " (dry run)" : "") + "...");
  const result = await convertStorageToWebP(supabase, {
    dryRun,
    supabaseUrl,
    serviceRoleKey,
  });
  console.log("Images converted (uploaded as .webp):", result.converted);
  console.log("Products updated:", result.productsUpdated);
  console.log("Bundles updated:", result.bundlesUpdated);
  console.log("Refs removed (missing in storage):", result.refsRemoved.length);
  console.log("Skipped:", result.skipped.length);
  if (result.refsRemoved.length > 0) {
    console.log("Removed URLs:");
    result.refsRemoved.forEach((u) => console.log(" ", u));
  }
  if (result.errors.length > 0) {
    console.log("Errors:");
    result.errors.forEach((e) => console.log(e));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
