/**
 * @fileoverview Server-only homepage catalog seed: slim Supabase queries
 * and promotion-aware pricing for first HTML paint.
 * @module lib/homepage-catalog-seed.server
 */

import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import {
  countHeroCatalogProducts,
  emptyHomepageCatalogSeed,
  isFreeHomepageProduct,
  mapRawProductToFeaturedCard,
  sortFeaturedProducts,
  thumbsFromProducts,
  coverImageFromRow,
  BUNDLES_COVER_SLUGS,
  EFFECTS_COVER_SLUGS,
  NNAUDIO_ACCESS_COVER,
  type HomepageCatalogSeed,
  type HomepageCategorySeed,
  type HomepageProductRow,
} from "@/lib/homepage-hero-seed";
import {
  fetchActiveShopPromotion,
  withShopPromotionPrices,
} from "@/utils/promotions/active-shop-promotion";
import { withTimeout } from "@/utils/with-timeout";

type ProductCategory = Database["public"]["Enums"]["product_category"];

const HERO_CATALOG_CATEGORIES: ProductCategory[] = [
  "instrument-plugin",
  "audio-fx-plugin",
  "midi-fx-plugin",
  "pack",
];

const FEATURED_SELECT =
  "id, slug, name, category, tagline, short_description, featured_image_url, logo_url, background_image_url, background_video_url, price, sale_price";

const HERO_TOUR_SELECT =
  "id, slug, name, tagline, short_description, featured_image_url, logo_url, background_image_url, price, sale_price";

const HERO_TOUR_LIMIT = 24;
/** Soft deadline so a hung Supabase query cannot stick the document. */
const SEED_TIMEOUT_MS = 4000;

const FREE_SELECT =
  "id, slug, name, category, tagline, short_description, featured_image_url, logo_url, price, sale_price";

type ShopPromotion = Awaited<ReturnType<typeof fetchActiveShopPromotion>>;

/**
 * @brief Count, thumbs, and tour rows for one active category bucket.
 * @param supabase Anon Supabase client.
 * @param category Product category enum value.
 * @param shopPromotion Active shop promotion for price fields.
 * @param preferSlugs Slugs that should supply the tile cover first.
 * @returns Category tile seed data plus hero tour rows.
 */
async function fetchCategoryBucket(
  supabase: ReturnType<typeof createClient<Database>>,
  category: ProductCategory,
  shopPromotion: ShopPromotion,
  preferSlugs?: readonly string[]
): Promise<HomepageCategorySeed & { products: HomepageProductRow[] }> {
  const [countRes, productsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("category", category),
    supabase
      .from("products")
      .select(HERO_TOUR_SELECT)
      .eq("status", "active")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .limit(HERO_TOUR_LIMIT),
  ]);

  const products = withShopPromotionPrices(
    productsRes.data ?? [],
    shopPromotion
  );

  return {
    count: countRes.count ?? 0,
    thumbs: thumbsFromProducts(products, { preferSlugs }),
    products,
  };
}

/**
 * @brief Free-tools bucket: zero-price products excluding NNAudio Access.
 * @param supabase Anon Supabase client.
 * @returns Free category tile seed data plus rows for the free collection.
 */
async function fetchFreeBucket(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<HomepageCategorySeed & { products: HomepageProductRow[] }> {
  const { data, error } = await supabase
    .from("products")
    .select(FREE_SELECT)
    .eq("status", "active")
    .or("price.eq.0,sale_price.eq.0");

  if (error) {
    console.error("Homepage free bucket failed:", error.message);
    return { count: 0, thumbs: [], products: [] };
  }

  const free = (data ?? []).filter(isFreeHomepageProduct);
  return {
    count: free.length,
    thumbs: thumbsFromProducts(free),
    products: free,
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
 * Cached for a minute so repeat loads (and HMR refreshes) do not wait
 * on a dozen Supabase queries. Times out so a hung query cannot stick
 * the document on "loading". Late query failures after timeout are logged
 * instead of becoming unhandled rejections.
 * @returns Counts, thumbs, featured cards, free rows, Cymasphere prices,
 * bundle count, and hero-tour product lists.
 */
export async function getHomepageCatalogSeed(): Promise<HomepageCatalogSeed> {
  const empty = emptyHomepageCatalogSeed();
  const load = unstable_cache(loadHomepageCatalogSeed, ["homepage-catalog-seed"], {
    revalidate: 60,
    tags: ["homepage-catalog"],
  })().catch((error: unknown) => {
    console.error(
      "Homepage catalog seed failed:",
      error instanceof Error ? error.message : error
    );
    return empty;
  });

  return withTimeout(load, SEED_TIMEOUT_MS, empty, {
    onTimeout: () => {
      console.warn(
        `Homepage catalog seed timed out after ${SEED_TIMEOUT_MS}ms; using empty snapshot`
      );
    },
    onLateError: (error) => {
      console.error(
        "Homepage catalog seed failed after timeout:",
        error instanceof Error ? error.message : error
      );
    },
  });
}

/**
 * @brief Uncached Supabase snapshot used by {@link getHomepageCatalogSeed}.
 * @returns Fresh seed or the empty snapshot when env is missing.
 */
async function loadHomepageCatalogSeed(): Promise<HomepageCatalogSeed> {
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
    accessRes,
    featuredRes,
    cymasphereRes,
    cymasphereProductRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("slug")
      .eq("status", "active")
      .in("category", HERO_CATALOG_CATEGORIES),
    fetchCategoryBucket(supabase, "instrument-plugin", shopPromotion),
    fetchCategoryBucket(
      supabase,
      "audio-fx-plugin",
      shopPromotion,
      EFFECTS_COVER_SLUGS
    ),
    fetchCategoryBucket(supabase, "midi-fx-plugin", shopPromotion),
    fetchCategoryBucket(supabase, "pack", shopPromotion),
    fetchFreeBucket(supabase),
    supabase
      .from("bundles")
      .select(
        "slug, featured_image_url, mosaic_image_url, background_image_url, logo_url",
        { count: "exact" }
      )
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(8),
    supabase
      .from("products")
      .select("featured_image_url, logo_url, background_image_url")
      .eq("status", "active")
      .eq("slug", "nnaudio-access")
      .limit(1),
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
    supabase
      .from("products")
      .select(FEATURED_SELECT)
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
  if (accessRes.error) {
    console.error(
      "Homepage catalog seed access failed:",
      accessRes.error.message
    );
  }
  if (cymasphereRes.error) {
    console.error(
      "Homepage Cymasphere seed failed:",
      cymasphereRes.error.message
    );
  }
  if (cymasphereProductRes.error) {
    console.error(
      "Homepage Cymasphere product seed failed:",
      cymasphereProductRes.error.message
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

  const promotedCymasphereProduct = cymasphereProductRes.data?.[0]
    ? withShopPromotionPrices(
        [cymasphereProductRes.data[0]],
        shopPromotion
      )[0]
    : null;

  return {
    productCount: countHeroCatalogProducts(heroSlugsRes.data ?? []),
    instruments: {
      count: instruments.count,
      thumbs: instruments.thumbs,
    },
    effects: {
      count: effects.count,
      thumbs: effects.thumbs,
    },
    midiFx: {
      count: midiFx.count,
      thumbs: midiFx.thumbs,
    },
    packs: {
      count: packs.count,
      thumbs: packs.thumbs,
    },
    free: {
      count: free.count,
      thumbs: free.thumbs,
    },
    bundles: {
      count: bundlesRes.count ?? 0,
      thumbs: thumbsFromProducts(bundlesRes.data ?? [], {
        preferSlugs: BUNDLES_COVER_SLUGS,
        allowMosaic: false,
      }),
    },
    access: {
      count: 1,
      thumbs: [
        coverImageFromRow(accessRes.data?.[0] ?? {}) || NNAUDIO_ACCESS_COVER,
      ],
    },
    cymasphere: promotedCymasphere
      ? {
          price: promotedCymasphere.price,
          salePrice: promotedCymasphere.sale_price ?? null,
        }
      : {},
    featured,
    heroTour: {
      instruments: instruments.products,
      effects: effects.products,
      midiFx: midiFx.products,
      packs: packs.products,
    },
    cymasphereProduct: promotedCymasphereProduct ?? null,
    freeProducts: free.products,
  };
}
