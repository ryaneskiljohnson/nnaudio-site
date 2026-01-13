/**
 * @fileoverview Script to find and fix duplicate legacy_product_id values
 * @module scripts/fix-duplicate-legacy-product-ids
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @brief Find all products with duplicate legacy_product_id values
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function findDuplicates() {
  console.log("🔍 Finding duplicate legacy_product_id values...\n");

  // Query to find duplicates
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, legacy_product_id")
    .not("legacy_product_id", "is", null)
    .order("legacy_product_id");

  if (error) {
    console.error("❌ Error fetching products:", error);
    return [];
  }

  // Group by legacy_product_id
  const grouped = new Map<string, Array<{ id: string; name: string }>>();
  
  products?.forEach((product) => {
    if (product.legacy_product_id) {
      if (!grouped.has(product.legacy_product_id)) {
        grouped.set(product.legacy_product_id, []);
      }
      grouped.get(product.legacy_product_id)!.push({
        id: product.id,
        name: product.name,
      });
    }
  });

  // Find duplicates (groups with more than 1 product)
  const duplicates: Array<{
    legacy_product_id: string;
    products: Array<{ id: string; name: string }>;
  }> = [];

  grouped.forEach((products, legacyId) => {
    if (products.length > 1) {
      duplicates.push({
        legacy_product_id: legacyId,
        products,
      });
    }
  });

  return duplicates;
}

/**
 * @brief Fix duplicates by keeping the first product and clearing others
 * @param {Array} duplicates - Array of duplicate groups
 * @param {boolean} dryRun - If true, only show what would be changed
 */
async function fixDuplicates(
  duplicates: Array<{
    legacy_product_id: string;
    products: Array<{ id: string; name: string }>;
  }>,
  dryRun: boolean = true
) {
  if (duplicates.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }

  console.log(`\n📋 Found ${duplicates.length} duplicate legacy_product_id value(s):\n`);

  for (const duplicate of duplicates) {
    console.log(`\n🔴 Duplicate: legacy_product_id = "${duplicate.legacy_product_id}"`);
    console.log(`   Found in ${duplicate.products.length} product(s):`);
    
    duplicate.products.forEach((product, index) => {
      const marker = index === 0 ? "✅ KEEP" : "❌ CLEAR";
      console.log(`   ${marker} - ${product.name} (${product.id})`);
    });

    if (!dryRun) {
      // Keep the first product, clear legacy_product_id for the rest
      const productsToClear = duplicate.products.slice(1);
      
      for (const product of productsToClear) {
        const { error } = await supabase
          .from("products")
          .update({ legacy_product_id: null })
          .eq("id", product.id);

        if (error) {
          console.error(`   ❌ Error clearing legacy_product_id for ${product.name}:`, error.message);
        } else {
          console.log(`   ✅ Cleared legacy_product_id for ${product.name}`);
        }
      }
    }
  }

  if (dryRun) {
    console.log("\n\n⚠️  This was a DRY RUN. No changes were made.");
    console.log("   Run with --fix flag to apply changes: bun run scripts/fix-duplicate-legacy-product-ids.ts --fix");
  } else {
    console.log("\n\n✅ Duplicates fixed!");
  }
}

/**
 * @brief Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes("--fix") || args.includes("-f");

  console.log("🔧 Fix Duplicate Legacy Product IDs\n");
  console.log("=" .repeat(50));

  const duplicates = await findDuplicates();
  await fixDuplicates(duplicates, !shouldFix);

  console.log("\n" + "=".repeat(50));
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
