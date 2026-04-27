/**
 * @fileoverview For ADSR, delete unneeded reseller_codes rows so each product has at most 50, keeping
 *   the oldest rows (by `created_at`, then `id`) per product. Safe when `redeemed_at` is null.
 * @module scripts/cleanup-adsr-reseller-codes-cap50
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "node:path";

const ADSR = "2917f0f3-c5b5-413b-8122-b5cae8383a16";
const CAP = 50;

config({ path: join(process.cwd(), ".env.local") });

async function chunkIn<T>(supabase: ReturnType<typeof createClient>, ids: string[], label: string) {
  const chunk = 200;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { error } = await supabase.from("reseller_codes").delete().in("id", slice);
    if (error) {
      throw new Error(`${label}: ${error.message}`);
    }
    deleted += slice.length;
  }
  return deleted;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Need Supabase env");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { count: rCount, error: rErr } = await supabase
    .from("reseller_codes")
    .select("id", { count: "exact", head: true })
    .eq("reseller_id", ADSR)
    .not("redeemed_at", "is", null);
  if (rErr) throw rErr;
  if (rCount && rCount > 0) {
    throw new Error(`Refusing: ${rCount} ADSR code(s) already redeemed — cleanup manually.`);
  }

  const productIdSet = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data: page, error: pErr } = await supabase
      .from("reseller_codes")
      .select("product_id")
      .eq("reseller_id", ADSR)
      .range(from, from + 999);
    if (pErr) throw pErr;
    if (!page?.length) break;
    for (const r of page) {
      productIdSet.add(r.product_id);
    }
    if (page.length < 1000) break;
  }
  const productIds = [...productIdSet];
  const toDelete: string[] = [];

  for (const productId of productIds) {
    const { data: rows, error } = await supabase
      .from("reseller_codes")
      .select("id, created_at")
      .eq("reseller_id", ADSR)
      .eq("product_id", productId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length <= CAP) continue;
    for (let i = CAP; i < rows.length; i++) {
      toDelete.push(rows[i].id);
    }
  }

  console.log(`ADSR: deleting ${toDelete.length} excess rows (cap ${CAP} / product, keep oldest).`);
  if (toDelete.length) {
    const d = await chunkIn(supabase, toDelete, "delete");
    console.log("Deleted", d, "rows.");
  }
  const { count } = await supabase
    .from("reseller_codes")
    .select("id", { count: "exact", head: true })
    .eq("reseller_id", ADSR);
  console.log("ADSR code rows after cleanup:", count);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
