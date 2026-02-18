/**
 * @fileoverview Bulk import users and product grants from WooCommerce export data
 * @module scripts/import-users-and-grants
 *
 * Imports users (auth.users + profiles) and product_grants from:
 * - db/exports/import_customers_high_quality.csv (users with names)
 * - db/exports/import_product_grants.csv (email -> product_id grants)
 *
 * Run: npx tsx scripts/import-users-and-grants.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import { parse } from "csv-parse/sync";

config({ path: resolve(process.cwd(), ".env.local") });

const BATCH_SIZE_GRANTS = 500;
const BATCH_SIZE_USERS = 100;

/**
 * Generate a temporary password for bulk-imported users.
 * They can use "Forgot password" to set their own.
 */
function generateTempPassword(): string {
  const part = Math.random().toString(36).slice(2, 10);
  return `TempPass${part}!`;
}

async function loadGrantsByEmail(
  grantsPath: string
): Promise<Map<string, string[]>> {
  const grantsByEmail = new Map<string, string[]>();
  const content = fs.readFileSync(grantsPath, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true });
  for (const row of records) {
    const email = (row.email ?? "").trim().toLowerCase();
    const productId = (row.product_id ?? "").trim();
    if (!email || !productId) continue;
    const arr = grantsByEmail.get(email) ?? [];
    if (!arr.includes(productId)) arr.push(productId);
    grantsByEmail.set(email, arr);
  }
  return grantsByEmail;
}

async function loadCustomers(
  customersPath: string
): Promise<{ email: string; first_name: string; last_name: string }[]> {
  const content = fs.readFileSync(customersPath, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true });
  return records
    .filter((r: { email?: string }) => (r.email ?? "").trim())
    .map((r: { email?: string; first_name?: string; last_name?: string }) => ({
      email: (r.email ?? "").trim().toLowerCase(),
      first_name: (r.first_name ?? "").replace(/"/g, "").trim(),
      last_name: (r.last_name ?? "").replace(/"/g, "").trim(),
    }));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const exportsDir = resolve(process.cwd(), "db/exports");
  const grantsPath = resolve(exportsDir, "import_product_grants.csv");
  const customersPath = resolve(exportsDir, "import_customers_high_quality.csv");

  if (!fs.existsSync(grantsPath) || !fs.existsSync(customersPath)) {
    console.error("Missing import_product_grants.csv or import_customers_high_quality.csv in db/exports");
    process.exit(1);
  }

  console.log("Loading grants and customers...");
  const grantsByEmail = await loadGrantsByEmail(grantsPath);
  const customers = await loadCustomers(customersPath);
  const customerEmails = new Set(customers.map((c) => c.email));
  const customerMap = new Map(customers.map((c) => [c.email, c]));

  const emailsWithGrants = new Set(grantsByEmail.keys());
  const customersToImport = customers.filter((c) => grantsByEmail.has(c.email));
  const totalGrants = [...grantsByEmail.values()].reduce((s, arr) => s + arr.length, 0);

  console.log(`\nImport plan:`);
  console.log(`  Customers with grants: ${customersToImport.length}`);
  console.log(`  Total product grants: ${totalGrants}`);
  console.log(`  Unique emails with grants: ${emailsWithGrants.size}`);

  const usersOnly = process.argv.includes("--users-only");

  let grantsInserted = 0;
  if (!usersOnly) {
    // Phase 1: Product grants (batch insert)
    console.log("\n--- Phase 1: Product grants ---");
    const grantRows: { user_email: string; product_id: string; notes: string }[] = [];
    for (const [email, productIds] of grantsByEmail) {
      if (!customerEmails.has(email)) continue;
      for (const pid of productIds) {
        grantRows.push({ user_email: email, product_id: pid, notes: "Migrated from WooCommerce" });
      }
    }
    for (let i = 0; i < grantRows.length; i += BATCH_SIZE_GRANTS) {
      const batch = grantRows.slice(i, i + BATCH_SIZE_GRANTS);
      const { error } = await supabase.from("product_grants").upsert(batch, {
        onConflict: "user_email,product_id",
        ignoreDuplicates: true,
      });
      if (error) {
        console.error(`Grants batch ${i / BATCH_SIZE_GRANTS + 1} error:`, error.message);
      } else {
        grantsInserted += batch.length;
        process.stdout.write(`\r  Grants: ${grantsInserted}/${grantRows.length}`);
      }
    }
    console.log(`\n  Done. Inserted/updated ${grantsInserted} grants.`);
  } else {
    console.log("\n--- Skipping Phase 1 (--users-only) ---");
  }

  // Phase 2: Users via Auth Admin API with email_confirm: true (no verification email)
  console.log("\n--- Phase 2: Users (auth.users + profiles, email auto-confirmed) ---");
  const toCreate = customersToImport;
  console.log(`  Users to import: ${toCreate.length}`);

  let totalInserted = 0;
  let totalSkipped = 0;
  for (let i = 0; i < toCreate.length; i++) {
    const c = toCreate[i];
    const first_name = c.first_name || "User";
    const last_name = c.last_name || "";
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: c.email,
      password: generateTempPassword(),
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });
    if (error) {
      if (error.message?.toLowerCase().includes("already") || error.message?.toLowerCase().includes("registered")) {
        totalSkipped += 1;
      } else {
        console.error(`  Error creating ${c.email}:`, error.message);
      }
    } else if (user?.user) {
      const id = user.user.id;
      const full_name = `${first_name} ${last_name}`.trim();
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id,
          email: c.email,
          first_name,
          last_name,
          full_name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (profileError) {
        console.error(`  Profile upsert for ${c.email}:`, profileError.message);
      }
      totalInserted += 1;
    }
    if ((i + 1) % 10 === 0 || i === toCreate.length - 1) {
      process.stdout.write(`\r  Users: ${totalInserted} created, ${totalSkipped} skipped (${i + 1}/${toCreate.length})`);
    }
  }
  console.log(`\n  Done. Created ${totalInserted} users, skipped ${totalSkipped} (already exist).`);

  console.log("\n--- Import complete ---");
  console.log(`  Product grants: ${grantsInserted}`);
  console.log(`  Users created: ${totalInserted}`);
  console.log(`  Users can reset password via "Forgot password" to set their own.`);
}

main().catch(console.error);
