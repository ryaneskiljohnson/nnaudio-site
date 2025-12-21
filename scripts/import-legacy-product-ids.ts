import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  ID: string;
  Name: string;
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length >= 2) {
      rows.push({
        ID: values[0],
        Name: values.slice(1).join(","), // Handle names with commas
      });
    }
  }
  
  return rows;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");
}

async function findProductByName(name: string): Promise<{ id: string; name: string } | null> {
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from("products")
    .select("id, name")
    .ilike("name", name)
    .limit(1)
    .single();

  if (exactMatch) {
    return exactMatch;
  }

  // Try normalized match
  const normalizedName = normalizeName(name);
  const { data: products } = await supabase
    .from("products")
    .select("id, name");

  if (!products) return null;

  for (const product of products) {
    if (normalizeName(product.name) === normalizedName) {
      return product;
    }
  }

  return null;
}

async function updateProductLegacyId(productId: string, legacyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("products")
    .update({ legacy_product_id: legacyId })
    .eq("id", productId);

  if (error) {
    console.error(`   ❌ Error updating product ${productId}:`, error.message);
    return false;
  }

  return true;
}

async function main() {
  const csvPath = process.argv[2] || "/Volumes/T7/Auth/product_list_simple.csv";

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log("📦 Importing Legacy Product IDs\n");
  console.log(`Reading CSV: ${csvPath}\n`);

  const csvRows = await parseCSV(csvPath);
  console.log(`Found ${csvRows.length} products in CSV\n`);

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  const notFound: Array<{ legacyId: string; name: string }> = [];

  for (const row of csvRows) {
    const legacyId = row.ID;
    const name = row.Name;

    if (!legacyId || !name) continue;

    console.log(`\n[${legacyId}] ${name}`);

    const product = await findProductByName(name);

    if (!product) {
      console.log(`   ⚠️  Product not found in database`);
      notFoundCount++;
      notFound.push({ legacyId, name });
      continue;
    }

    console.log(`   ✅ Found: ${product.name} (${product.id})`);

    const updated = await updateProductLegacyId(product.id, legacyId);
    if (updated) {
      console.log(`   ✅ Updated legacy_product_id: ${legacyId}`);
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Import Summary");
  console.log("=".repeat(60));
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`⚠️  Not found in database: ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (notFound.length > 0) {
    console.log("\n⚠️  Products not found in database:");
    notFound.forEach(({ legacyId, name }) => {
      console.log(`   - [${legacyId}] ${name}`);
    });
    console.log("\n💡 You may need to manually match these products.");
  }

  console.log("\n✅ Import complete!");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

