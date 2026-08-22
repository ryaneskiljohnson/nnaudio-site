/**
 * @fileoverview Shared catalog count for the homepage hero support line.
 * The count excludes Cymasphere, CymaSynth, and NNAudio Access so the
 * sentence matches the orbiting products, not the sun or the desktop app.
 * @module lib/homepage-hero-count
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

/** Slugs that are named in the hero copy and must not inflate the count. */
export const HERO_CATALOG_SKIP = new Set([
  "cymasynth",
  "cymasphere",
  "nnaudio-access",
]);

/** Categories that feed the hero orbit and the "instruments, effects, and packs" line. */
type ProductCategory = Database["public"]["Enums"]["product_category"];

const HERO_CATALOG_CATEGORIES: ProductCategory[] = [
  "instrument-plugin",
  "audio-fx-plugin",
  "midi-fx-plugin",
  "pack",
];

/**
 * @brief Unique catalog size from already-fetched product lists.
 * @param products Products from the homepage category fetches.
 * @returns Distinct slugs after skipping the named hero bodies.
 * @example
 * countHeroCatalogProducts([{ slug: "reiya" }, { slug: "cymasynth" }]) // 1
 */
export function countHeroCatalogProducts(
  products: Array<{ slug?: string | null }>
): number {
  return new Set(
    products
      .map((p) => String(p.slug || "").toLowerCase())
      .filter((slug) => slug && !HERO_CATALOG_SKIP.has(slug))
  ).size;
}

/**
 * @brief Active catalog size for the hero sentence, for first HTML paint.
 * @returns Distinct matching slugs, or 0 when the query fails.
 * @note Uses the anon key (RLS) and does not read cookies, so the homepage
 * can stay statically cached.
 * @example
 * const n = await getHomepageHeroProductCount();
 */
export async function getHomepageHeroProductCount(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return 0;

  const supabase = createClient<Database>(url, key);
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "active")
    .in("category", HERO_CATALOG_CATEGORIES);

  if (error || !data) {
    console.error("Homepage hero product count failed:", error?.message);
    return 0;
  }

  return countHeroCatalogProducts(data);
}
