/**
 * @fileoverview Fails the build if shared server-action barrels re-export heavy modules.
 * @module scripts/check-server-barrel-exports
 *
 * @note Prevents Vercel 250MB serverless failures: barrel `index.ts` files imported by
 * many routes must not export modules that depend on native stacks (sharp, canvas, etc.).
 *
 * @example bun run verify:barrels
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

/** Barrel file (repo-relative) → subpaths that must never appear in export-from lines. */
const BARREL_FORBIDDEN_EXPORTS: Record<string, string[]> = {
  "app/actions/email-campaigns/index.ts": ["./media"],
};

/**
 * @brief Detects `export ... from './x'` or `export ... from "./x"` for forbidden x.
 */
function barrelViolates(content: string, forbiddenRelative: string): boolean {
  const base = forbiddenRelative.replace(/^\.\//, "");
  const re = new RegExp(
    `export\\s+[^;]*?from\\s+['"]\\.\\/${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`,
    "m"
  );
  return re.test(content);
}

function main(): void {
  let failed = false;
  for (const [relPath, forbidden] of Object.entries(BARREL_FORBIDDEN_EXPORTS)) {
    const abs = join(ROOT, relPath);
    if (!existsSync(abs)) {
      console.error(`[verify:barrels] Missing barrel file: ${relPath}`);
      failed = true;
      continue;
    }
    const content = readFileSync(abs, "utf8");
    for (const sub of forbidden) {
      if (barrelViolates(content, sub)) {
        console.error(
          `[verify:barrels] ${relPath} must not re-export from ${sub} (pulls heavy deps into every importer). Import the module directly where needed.`
        );
        failed = true;
      }
    }
  }
  if (failed) {
    console.error("\nSee docs/VERCEL_250MB_LIMIT.md → Barrel exports.");
    process.exit(1);
  }
  console.log("[verify:barrels] OK");
}

main();
