/**
 * @fileoverview Client-safe homepage catalog seed types and helpers. No
 * Supabase imports — safe for homepage client islands and unit tests.
 * @module lib/homepage-hero-seed
 */

/** Slugs that are named in the hero copy and must not inflate the count. */
export const HERO_CATALOG_SKIP = new Set([
  "cymasynth",
  "cymasphere",
  "nnaudio-access",
]);

/**
 * @brief Shuffles catalog moons, then pins active shop-promotion
 * products first. Perpetual sale prices do not count.
 * @param nodes Interleaved hero moons (CymaSynth already removed).
 * @param random Injected RNG for tests.
 */
export function orderHeroTourCatalog<T extends { promoted?: boolean }>(
  nodes: T[],
  random: () => number = Math.random
): T[] {
  const shuffled = [...nodes];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = swap as T;
  }
  shuffled.sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)));
  return shuffled;
}

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

/** Effects tile cover: Crystal Ball product slugs. */
export const EFFECTS_COVER_SLUGS = [
  "crystal-ball",
  "crystalball",
] as const;

/** Bundles tile cover: Ultimate Bundle (featured art, not mosaic). */
export const BUNDLES_COVER_SLUGS = ["ultimate-bundle"] as const;

/** Count + first four artwork URLs for one category tile. */
export interface HomepageCategorySeed {
  count: number;
  thumbs: string[];
}

/** Public NNAudio Access art when the product row has no image. */
export const NNAUDIO_ACCESS_COVER =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/product-images/nnaudio-access.png";

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
  bundles: HomepageCategorySeed;
  /** NNAudio Access tile — always one product manager. */
  access: HomepageCategorySeed;
  cymasphere: {
    price?: number;
    salePrice?: number | null;
  };
  featured: HomepageFeaturedSeed[];
  /** Category catalogs for EcosystemHero / CircuitNetwork on first paint. */
  heroTour: HomepageHeroTourSeed;
  /** Cymasphere record for the sun credit card when the client fetch lags. */
  cymasphereProduct: HomepageProductRow | null;
  /** Free-tools row so the homepage does not refetch `?free=true`. */
  freeProducts: HomepageProductRow[];
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
  /** True when this row is a target of the active shop promotion. */
  shopPromoted?: boolean;
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
 * @brief Best rectangular cover for a catalog tile.
 * Prefers featured / mosaic / background art over logos so the image
 * can fill the box without a tiny mark stretching.
 * @param row Artwork fields from a product or bundle.
 * @returns Cover URL, or empty when none.
 */
export function coverImageFromRow(row: {
  featured_image_url?: string | null;
  mosaic_image_url?: string | null;
  background_image_url?: string | null;
  logo_url?: string | null;
}): string {
  return (
    row.mosaic_image_url ||
    row.featured_image_url ||
    row.background_image_url ||
    row.logo_url ||
    ""
  );
}

/** Artwork row used when picking catalog tile covers. */
export type CatalogCoverRow = {
  slug?: string | null;
  featured_image_url?: string | null;
  mosaic_image_url?: string | null;
  background_image_url?: string | null;
  logo_url?: string | null;
};

/**
 * @brief First four cover URLs from a slim product or bundle list.
 * `preferSlugs` win, then curated bestsellers, so tiles can pin a
 * specific cover (Crystal Ball, Ultimate Bundle).
 * @param products Rows with optional slug and image fields.
 * @param opts Slug priority and whether mosaic art is allowed.
 * @returns Up to four unique non-empty URLs.
 */
export function thumbsFromProducts(
  products: CatalogCoverRow[],
  opts?: {
    preferSlugs?: readonly string[];
    /** When false, skip mosaic so the featured product/bundle art is used. */
    allowMosaic?: boolean;
  }
): string[] {
  const preferred = opts?.preferSlugs ?? [];
  const curated = [...CURATED_FEATURED_ORDER, ...FEATURED_BUNDLE_SLUGS];
  const rankOf = (slug: string) => {
    const prefer = preferred.findIndex(
      (key) => slug === key || slug.includes(key)
    );
    if (prefer !== -1) return prefer;
    const curatedIndex = curated.indexOf(slug);
    return curatedIndex === -1 ? Number.MAX_SAFE_INTEGER : curated.length + curatedIndex;
  };
  const pickCover = (row: CatalogCoverRow) =>
    opts?.allowMosaic === false
      ? row.featured_image_url ||
        row.background_image_url ||
        row.logo_url ||
        ""
      : coverImageFromRow(row);
  const ranked = [...products].sort((a, b) => {
    return rankOf(String(a.slug || "").toLowerCase()) -
      rankOf(String(b.slug || "").toLowerCase());
  });
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of ranked) {
    const src = pickCover(row);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
    if (urls.length >= 4) break;
  }
  return urls;
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
    bundles: { count: 0, thumbs: [] },
    access: { count: 1, thumbs: [NNAUDIO_ACCESS_COVER] },
    cymasphere: {},
    featured: [],
    heroTour: {
      instruments: [],
      effects: [],
      midiFx: [],
      packs: [],
    },
    cymasphereProduct: null,
    freeProducts: [],
  };
}

/** Card shape shared by the hero, free row, and category thumbs. */
export interface HomepageCard {
  id: string | number;
  name: string;
  slug: string;
  tagline: string;
  short_description?: string | null;
  description?: string | null;
  category: string;
  image: string;
  featured_image_url?: string | null;
  logo_url?: string | null;
  backgroundImage: string;
  price: number;
  sale_price?: number | null;
  /** True when this card is a target of the active shop promotion. */
  shopPromoted?: boolean;
}

/** Category tile data for the server-rendered catalog grid. */
export interface HomepageCategoryTile {
  key: string;
  label: string;
  href: string;
  count: number;
  blurb?: string;
  images?: string[];
  alwaysShow?: boolean;
}

/**
 * @brief Splits a flat product list into the hero tour buckets.
 * @param products Active catalog rows.
 * @returns Category lists plus the Cymasphere row when present.
 * @example
 * partitionHeroTourProducts([{ slug: "cymasynth", category: "instrument-plugin" }])
 *   .instruments[0].slug // "cymasynth"
 */
export function partitionHeroTourProducts(products: HomepageProductRow[]): {
  instruments: HomepageProductRow[];
  effects: HomepageProductRow[];
  packs: HomepageProductRow[];
  midiFx: HomepageProductRow[];
  cymasphere: HomepageProductRow | null;
} {
  const instruments: HomepageProductRow[] = [];
  const effects: HomepageProductRow[] = [];
  const packs: HomepageProductRow[] = [];
  const midiFx: HomepageProductRow[] = [];
  let cymasphere: HomepageProductRow | null = null;
  for (const row of products) {
    const slug = (row.slug || "").toLowerCase();
    if (slug === "cymasphere") cymasphere = row;
    const category = row.category || "";
    if (category === "instrument-plugin") instruments.push(row);
    else if (category === "audio-fx-plugin") effects.push(row);
    else if (category === "midi-fx-plugin") midiFx.push(row);
    else if (category === "pack") packs.push(row);
  }
  return { instruments, effects, packs, midiFx, cymasphere };
}

/**
 * @brief Maps a server seed row to the card shape used by the hero and
 * free collection.
 * @param row Slim product from the homepage catalog seed.
 * @returns Card-shaped product.
 */
export function seedRowToCard(row: HomepageProductRow): HomepageCard {
  return {
    id: row.id ?? row.slug ?? "",
    name: row.name ?? "",
    slug: row.slug ?? "",
    tagline: row.tagline || row.short_description || "",
    short_description: row.short_description,
    description: row.description,
    category: row.category || "plugin",
    image: row.featured_image_url || row.logo_url || "",
    featured_image_url: row.featured_image_url,
    logo_url: row.logo_url,
    backgroundImage:
      row.background_image_url || row.background_video_url || "",
    price: typeof row.price === "number" ? row.price : 0,
    sale_price: row.sale_price,
    shopPromoted: Boolean(row.shopPromoted),
  };
}

/**
 * @brief Category tiles for the homepage catalog grid, from the seed.
 * @param seed Server catalog snapshot.
 * @returns Tiles including NNAudio Access.
 */
export function homepageCategoryTiles(
  seed: HomepageCatalogSeed
): HomepageCategoryTile[] {
  return [
    {
      key: "instruments",
      label: "Instruments",
      href: "/products?category=instrument-plugin",
      count: seed.instruments.count,
      blurb: "Synths, texture engines, and sound generators.",
      images: seed.instruments.thumbs,
    },
    {
      key: "effects",
      label: "Effects",
      href: "/products?category=audio-fx-plugin",
      count: seed.effects.count,
      blurb: "Color, space, and motion for any source.",
      images: seed.effects.thumbs,
    },
    {
      key: "midi-fx",
      label: "MIDI FX",
      href: "/products?category=midi-fx-plugin",
      count: seed.midiFx.count,
      blurb: "Writing tools that plug into your DAW.",
      images: seed.midiFx.thumbs,
    },
    {
      key: "packs",
      label: "MIDI & Sample Packs",
      href: "/packs",
      count: seed.packs.count,
      blurb: "Drop-in phrases, kits, and sounds.",
      images: seed.packs.thumbs,
    },
    {
      key: "bundles",
      label: "Bundles",
      href: "/bundles",
      count: seed.bundles.count,
      blurb: "More products, one better price.",
      images: seed.bundles.thumbs,
    },
    {
      key: "free",
      label: "Free Tools",
      href: "/free-tools",
      count: seed.free.count,
      blurb: "Start producing without spending a dime.",
      images: seed.free.thumbs,
    },
    {
      key: "access",
      label: "Product Manager",
      href: "/product/nnaudio-access",
      count: seed.access.count || 1,
      alwaysShow: true,
      blurb: "NNAudio Access — install and update everything you own.",
      images: seed.access.thumbs,
    },
  ];
}
