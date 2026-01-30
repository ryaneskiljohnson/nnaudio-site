/**
 * @fileoverview Converts all PNG/JPEG images in public/ to WebP and updates all
 * codebase references from .png/.jpg/.jpeg to .webp. Uses shared logic from
 * utils/site-management/convert-to-webp (also used by admin API).
 * @module scripts/convert-png-jpeg-to-webp-and-update-refs
 *
 * Usage:
 *   bun run scripts/convert-png-jpeg-to-webp-and-update-refs.ts           # run conversion + ref updates
 *   bun run scripts/convert-png-jpeg-to-webp-and-update-refs.ts --dry-run # preview only
 *   bun run scripts/convert-png-jpeg-to-webp-and-update-refs.ts --refs-only # only update refs (assume webp exist)
 */

import { runConvertToWebP } from "@/utils/site-management/convert-to-webp";

const isDryRun = process.argv.includes("--dry-run");
const refsOnly = process.argv.includes("--refs-only");

async function main() {
  console.log(
    isDryRun
      ? "🔍 DRY RUN (no writes)\n"
      : refsOnly
        ? "📝 Refs-only mode (no conversion)\n"
        : "🖼️  Convert PNG/JPEG → WebP & update refs\n"
  );

  const result = await runConvertToWebP({ dryRun: isDryRun, refsOnly });

  console.log(`Found ${result.imageCount} PNG/JPEG file(s) in public/`);
  console.log(`Converted: ${result.converted}, Skipped (already WebP): ${result.skipped}`);
  if (result.skippedInvalid?.length > 0) {
    console.log(`\nSkipped (invalid/empty, not real images): ${result.skippedInvalid.length}`);
    result.skippedInvalid.forEach((e) => console.log(`  ⏭️  ${e}`));
  }
  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((e) => console.log(`  ❌ ${e}`));
  }
  console.log(`\nRefs updated: ${result.refsUpdated} in ${result.filesUpdated.length} file(s).`);
  if (result.filesUpdated.length > 0 && result.filesUpdated.length <= 30) {
    result.filesUpdated.forEach((f) => console.log(`  - ${f}`));
  } else if (result.filesUpdated.length > 30) {
    result.filesUpdated.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    console.log(`  ... and ${result.filesUpdated.length - 20} more`);
  }
  if (isDryRun && (result.imageCount > 0 || result.filesUpdated.length > 0)) {
    console.log("\nRun without --dry-run to apply changes.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
