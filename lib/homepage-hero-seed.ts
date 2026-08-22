/**
 * @fileoverview Client-safe homepage catalog seed types and helpers. No
 * Supabase imports — safe for `HomePageClient` and unit tests.
 * @module lib/homepage-hero-seed
 */

/** Slugs that are named in the hero copy and must not inflate the count. */
export const HERO_CATALOG_SKIP = new Set([
  "cymasynth",
  "cymasphere",
  "nnaudio-access",
]);

/** Curated best-sellers order for the featured strip. */
export const CURATED_FEATURED_ORDER = [
  "ultimate-bundle",
  "cymasphere",
  "curio-texture-generator",
  "reiya",
  "obscura-tortured-orchestral-box",
];

/** Bundle slugs that use multi-tier pricing in the featured row. */
export const FEATURED_BUNDLE_SLUGS = [
  "ultimate-bundle",
  "producers-arsenal",
  "beat-lab",
];

/** Count + first four artwork URLs for one category tile. */
export interface HomepageCategorySeed {
  count: number;
  thumbs: string[];
}

/** Card shape consumed by FeaturedProductsSection. */
export interface HomepageFeaturedSeed {
  id: string | number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string;
  thumbnail: string;
  backgroundImage: string;
  price: string;
  hasMultiplePricing: boolean;
}

/** Slim rows for the hero tour so the circuit board is not empty on first paint. */
export interface HomepageHeroTourSeed {
  instruments: HomepageProductRow[];
  effects: HomepageProductRow[];
  midiFx: HomepageProductRow[];
  packs: HomepageProductRow[];
}

/** First-paint snapshot for the homepage client tree. */
export interface HomepageCatalogSeed {
  productCount: number;
  instruments: HomepageCategorySeed;
  effects: HomepageCategorySeed;
  midiFx: HomepageCategorySeed;
  packs: HomepageCategorySeed;
  free: HomepageCategorySeed;
  bundleCount: number;
  cymasphere: {
    price?: number;
    salePrice?: number | null;
  };
  featured: HomepageFeaturedSeed[];
  /** Category catalogs for EcosystemHero / CircuitNetwork on first paint. */
  heroTour: HomepageHeroTourSeed;
  /** Cymasphere record for the sun credit card when the client fetch lags. */
  cymasphereProduct: HomepageProductRow | null;
}

/** Slim product row used for featured mapping and free filtering. */
export type HomepageProductRow = {
  id?: string | number;
  slug?: string | null;
  name?: string | null;
  tagline?: string | null;
  short_description?: string | null;
  description?: string | null;
  category?: string | null;
  featured_image_url?: string | null;
  logo_url?: string | null;
  background_image_url?: string | null;
  background_video_url?: string | null;
  price?: number | null;
  sale_price?: number | null;
};

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
 * @brief First four artwork URLs from a slim product list.
 * @param products Rows with optional image fields.
 * @returns Up to four non-empty URLs.
 */
export function thumbsFromProducts(
  products: Array<{
    featured_image_url?: string | null;
    logo_url?: string | null;
  }>
): string[] {
  return products
    .map((p) => p.featured_image_url || p.logo_url || "")
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * @brief Whether a product belongs in the free-tools bucket (matches `/api/products?free=true`).
 * @param product Row with slug, name, and price fields.
 * @returns True when price or sale price is zero and not NNAudio Access.
 */
export function isFreeHomepageProduct(product: HomepageProductRow): boolean {
  const slug = (product.slug || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  if (slug.includes("nnaudio-access") || name.includes("nnaudio access")) {
    return false;
  }
  return product.price === 0 || product.sale_price === 0;
}

/**
 * @brief Display price string for featured cards (sale price when set).
 * @param salePrice Promotional or manual sale price.
 * @param regularPrice List price.
 * @returns Dollar string for the card.
 */
export function formatFeaturedDisplayPrice(
  salePrice?: number | null,
  regularPrice?: number | null
): string {
  const display = salePrice ?? regularPrice ?? 0;
  return `$${display}`;
}

/**
 * @brief Maps a slim product row to the featured carousel card shape.
 * @param product Row from the catalog API or server seed query.
 * @returns Card consumed by FeaturedProductsSection.
 */
export function mapRawProductToFeaturedCard(
  product: HomepageProductRow
): HomepageFeaturedSeed {
  const slug = product.slug || "";
  const isBundle =
    FEATURED_BUNDLE_SLUGS.includes(slug) || product.category === "bundle";
  const productImage = product.featured_image_url || "";
  const logoOrProduct = product.logo_url || productImage || "";
  const useProductImageOnly = slug.toLowerCase() === "cymasphere";

  return {
    id: product.id ?? product.slug ?? "",
    name: product.name || "",
    slug,
    tagline: product.tagline || product.short_description || "",
    description: product.description || "",
    logo: useProductImageOnly ? productImage : logoOrProduct,
    thumbnail: useProductImageOnly
      ? productImage
      : productImage || product.logo_url || "",
    backgroundImage:
      product.background_image_url || product.background_video_url || "",
    price: formatFeaturedDisplayPrice(product.sale_price, product.price),
    hasMultiplePricing: isBundle,
  };
}

/**
 * @brief Curated order for the homepage featured strip.
 * @param products Mapped featured cards.
 * @returns Up to five cards in best-sellers order.
 */
export function sortFeaturedProducts(
  products: HomepageFeaturedSeed[]
): HomepageFeaturedSeed[] {
  return [...products]
    .sort((a, b) => {
      const aIndex = CURATED_FEATURED_ORDER.indexOf(a.slug);
      const bIndex = CURATED_FEATURED_ORDER.indexOf(b.slug);
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return normalizedA - normalizedB;
    })
    .slice(0, 5);
}

/**
 * @brief Empty first-paint snapshot used when env or queries fail.
 * @returns Zeroed HomepageCatalogSeed with independent category buckets.
 */
export function emptyHomepageCatalogSeed(): HomepageCatalogSeed {
  return {
    productCount: 0,
    instruments: { count: 0, thumbs: [] },
    effects: { count: 0, thumbs: [] },
    midiFx: { count: 0, thumbs: [] },
    packs: { count: 0, thumbs: [] },
    free: { count: 0, thumbs: [] },
    bundleCount: 0,
    cymasphere: {},
    featured: [],
    heroTour: {
      instruments: [],
      effects: [],
      midiFx: [],
      packs: [],
    },
    cymasphereProduct: null,
  };
}
