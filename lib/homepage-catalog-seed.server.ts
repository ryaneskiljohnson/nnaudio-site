/**
 * @fileoverview Server-only homepage catalog seed: slim Supabase queries
 * and promotion-aware pricing for first HTML paint.
 * @module lib/homepage-catalog-seed.server
 */

import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import {
  countHeroCatalogProducts,
  emptyHomepageCatalogSeed,
  isFreeHomepageProduct,
  mapRawProductToFeaturedCard,
  sortFeaturedProducts,
  thumbsFromProducts,
  type HomepageCatalogSeed,
  type HomepageCategorySeed,
} from "@/lib/homepage-hero-seed";
import {
  fetchActiveShopPromotion,
  withShopPromotionPrices,
} from "@/utils/promotions/active-shop-promotion";

type ProductCategory = Database["public"]["Enums"]["product_category"];

const HERO_CATALOG_CATEGORIES: ProductCategory[] = [
  "instrument-plugin",
  "audio-fx-plugin",
  "midi-fx-plugin",
  "pack",
];

const FEATURED_SELECT =
  "id, slug, name, category, tagline, short_description, featured_image_url, logo_url, background_image_url, background_video_url, price, sale_price";

const FREE_SELECT =
  "slug, name, price, sale_price, featured_image_url, logo_url";

/**
 * @brief Count and four thumbs for one active category bucket.
 * @param supabase Anon Supabase client.
 * @param category Product category enum value.
 * @returns Category tile seed data.
 */
async function fetchCategoryBucket(
  supabase: ReturnType<typeof createClient<Database>>,
  category: ProductCategory
): Promise<HomepageCategorySeed> {
  const [countRes, thumbsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("category", category),
    supabase
      .from("products")
      .select("featured_image_url, logo_url")
      .eq("status", "active")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  return {
    count: countRes.count ?? 0,
    thumbs: thumbsFromProducts(thumbsRes.data ?? []),
  };
}

/**
 * @brief Free-tools bucket: zero-price products excluding NNAudio Access.
 * @param supabase Anon Supabase client.
 * @returns Free category tile seed data.
 */
async function fetchFreeBucket(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<HomepageCategorySeed> {
  const { data, error } = await supabase
    .from("products")
    .select(FREE_SELECT)
    .eq("status", "active")
    .or("price.eq.0,sale_price.eq.0");

  if (error) {
    console.error("Homepage free bucket failed:", error.message);
    return { count: 0, thumbs: [] };
  }

  const free = (data ?? []).filter(isFreeHomepageProduct);
  return {
    count: free.length,
    thumbs: thumbsFromProducts(free),
  };
}

/**
 * @brief Active catalog size for the hero sentence, for first HTML paint.
 * @returns Distinct matching slugs, or 0 when the query fails.
 */
export async function getHomepageHeroProductCount(): Promise<number> {
  const seed = await getHomepageCatalogSeed();
  return seed.productCount;
}

/**
 * @brief Slim catalog snapshot for homepage first paint.
 * @returns Counts, thumbs, featured cards, Cymasphere prices, bundle count.
 * @note Uses the anon key (RLS) and does not read cookies, so the homepage
 * can stay statically cached. Does not return full category catalogs.
 */
export async function getHomepageCatalogSeed(): Promise<HomepageCatalogSeed> {
  const empty = emptyHomepageCatalogSeed();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return empty;

  const supabase = createClient<Database>(url, key);
  const shopPromotion = await fetchActiveShopPromotion(supabase);

  const [
    heroSlugsRes,
    instruments,
    effects,
    midiFx,
    packs,
    free,
    bundlesRes,
    featuredRes,
    cymasphereRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("slug")
      .eq("status", "active")
      .in("category", HERO_CATALOG_CATEGORIES),
    fetchCategoryBucket(supabase, "instrument-plugin"),
    fetchCategoryBucket(supabase, "audio-fx-plugin"),
    fetchCategoryBucket(supabase, "midi-fx-plugin"),
    fetchCategoryBucket(supabase, "pack"),
    fetchFreeBucket(supabase),
    supabase
      .from("bundles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("products")
      .select(FEATURED_SELECT)
      .eq("status", "active")
      .eq("is_featured", true),
    supabase
      .from("products")
      .select("id, price, sale_price")
      .eq("status", "active")
      .eq("slug", "cymasphere")
      .limit(1),
  ]);

  if (heroSlugsRes.error) {
    console.error(
      "Homepage hero slug query failed:",
      heroSlugsRes.error.message
    );
  }
  if (featuredRes.error) {
    console.error(
      "Homepage featured seed failed:",
      featuredRes.error.message
    );
  }
  if (bundlesRes.error) {
    console.error(
      "Homepage catalog seed bundles failed:",
      bundlesRes.error.message
    );
  }
  if (cymasphereRes.error) {
    console.error(
      "Homepage Cymasphere seed failed:",
      cymasphereRes.error.message
    );
  }

  const promotedFeatured = withShopPromotionPrices(
    featuredRes.data ?? [],
    shopPromotion
  );
  const featured = sortFeaturedProducts(
    promotedFeatured.map(mapRawProductToFeaturedCard)
  );

  const cymasphereRow = cymasphereRes.data?.[0];
  const promotedCymasphere = cymasphereRow
    ? withShopPromotionPrices([cymasphereRow], shopPromotion)[0]
    : null;

  return {
    productCount: countHeroCatalogProducts(heroSlugsRes.data ?? []),
    instruments,
    effects,
    midiFx,
    packs,
    free,
    bundleCount: bundlesRes.count ?? 0,
    cymasphere: promotedCymasphere
      ? {
          price: promotedCymasphere.price,
          salePrice: promotedCymasphere.sale_price ?? null,
        }
      : {},
    featured,
  };
}
