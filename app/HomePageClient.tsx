"use client";

/**
 * @fileoverview Public homepage built around the Cymasphere ecosystem story:
 * a PCB-network hero with Cymasphere at the center, flagship spotlights for
 * Cymasphere and CymaSynth, a compact category grid, then featured and free
 * product rows with pricing and FAQ.
 * @module app/HomePageClient
 * @note Catalog data comes only from the server seed. The client does not
 * re-fetch category catalogs (those `limit=10000` calls were the main
 * homepage TBT source).
 */

import dynamic from "next/dynamic";
import {
  emptyHomepageCatalogSeed,
  type HomepageCatalogSeed,
  type HomepageProductRow,
} from "@/lib/homepage-hero-seed";
import EcosystemHero from "@/components/sections/EcosystemHero";
import type { CategoryTile } from "@/components/sections/CategoryGrid";
import ViewportLazy from "@/components/common/ViewportLazy";
import FeaturedProductsSectionSkeleton from "@/components/sections/FeaturedProductsSectionSkeleton";
import FreeCollectionSectionSkeleton from "@/components/sections/FreeCollectionSectionSkeleton";

const CategoryGrid = dynamic(() => import("@/components/sections/CategoryGrid"), {
  ssr: true,
});

const FreeCollectionSection = dynamic(
  () => import("@/components/sections/FreeCollectionSection"),
  {
    ssr: true,
    loading: () => <FreeCollectionSectionSkeleton />,
  }
);

const FeaturedProductsSection = dynamic(
  () => import("@/components/sections/FeaturedProductsSection"),
  {
    ssr: true,
    loading: () => <FeaturedProductsSectionSkeleton />,
  }
);

const CymasphereSpotlight = dynamic(
  () => import("@/components/sections/CymasphereSpotlight"),
  { ssr: false }
);

const CymasynthSpotlight = dynamic(
  () => import("@/components/sections/CymasynthSpotlight"),
  { ssr: false }
);

const WaveformTransition = dynamic(
  () => import("@/components/sections/WaveformTransition"),
  { ssr: false, loading: () => null }
);

const PricingSection = dynamic(
  () => import("@/components/sections/PricingSection"),
  { ssr: false }
);

const FAQSection = dynamic(() => import("@/components/sections/FAQSection"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "600px", background: "#0a0a0a" }} />,
});

/** Card shape shared by the hero, free row, and category thumbs. */
interface HomepageCard {
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
}

/**
 * @brief Maps a server seed row to the card shape shared by homepage
 * sections (hero board, free row).
 * @param row Slim product from the homepage catalog seed.
 * @returns Card-shaped product.
 */
function seedRowToCard(row: HomepageProductRow): HomepageCard {
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
  };
}

/**
 * @brief First few artwork URLs from a product list, for the catalog
 * grid's orbiting thumbnail clusters.
 * @param list Card-shaped products.
 * @returns Up to four artwork URLs.
 */
function catThumbs(list: HomepageCard[]): string[] {
  return list
    .map((p) => p.featured_image_url || p.image || p.logo_url || "")
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * @brief Client homepage painted entirely from the server catalog seed.
 * @param seed Server-counted orbit catalog snapshot.
 * @returns Homepage sections.
 */
export default function HomePageClient({
  seed = emptyHomepageCatalogSeed(),
}: {
  seed?: HomepageCatalogSeed;
}) {
  const instruments = seed.heroTour.instruments.map(seedRowToCard);
  const effects = seed.heroTour.effects.map(seedRowToCard);
  const packs = seed.heroTour.packs.map(seedRowToCard);
  const midiFx = seed.heroTour.midiFx.map(seedRowToCard);
  const freeProducts = seed.freeProducts.map(seedRowToCard);
  const cymasphereProduct = seed.cymasphereProduct
    ? seedRowToCard(seed.cymasphereProduct)
    : null;
  const cymasynth = instruments.find((p) => p.slug === "cymasynth") || null;

  const categories: CategoryTile[] = [
    {
      key: "instruments",
      label: "Instruments",
      href: "/products?category=instrument-plugin",
      count: seed.instruments.count,
      blurb: "Synths, texture engines, and sound generators.",
      images: seed.instruments.thumbs.length
        ? seed.instruments.thumbs
        : catThumbs(instruments),
    },
    {
      key: "effects",
      label: "Effects",
      href: "/products?category=audio-fx-plugin",
      count: seed.effects.count,
      blurb: "Color, space, and motion for any source.",
      images: seed.effects.thumbs.length
        ? seed.effects.thumbs
        : catThumbs(effects),
    },
    {
      key: "midi-fx",
      label: "MIDI FX",
      href: "/products?category=midi-fx-plugin",
      count: seed.midiFx.count,
      blurb: "Writing tools that plug into your DAW.",
      images: seed.midiFx.thumbs.length ? seed.midiFx.thumbs : catThumbs(midiFx),
    },
    {
      key: "packs",
      label: "MIDI & Sample Packs",
      href: "/packs",
      count: seed.packs.count,
      blurb: "Drop-in phrases, kits, and sounds.",
      images: seed.packs.thumbs.length ? seed.packs.thumbs : catThumbs(packs),
    },
    {
      key: "bundles",
      label: "Bundles",
      href: "/bundles",
      count: seed.bundleCount,
      blurb: "More products, one better price.",
    },
    {
      key: "free",
      label: "Free Tools",
      href: "/free-tools",
      count: seed.free.count,
      blurb: "Start producing without spending a dime.",
      images: seed.free.thumbs.length
        ? seed.free.thumbs
        : catThumbs(freeProducts),
    },
    {
      key: "access",
      label: "NNAudio Access",
      href: "/downloads",
      count: 1,
      alwaysShow: true,
      blurb: "One app to manage all your products.",
    },
  ];

  return (
    <>
      <div style={{ position: "relative", overflow: "visible" }}>
        <EcosystemHero
          cymasphere={cymasphereProduct}
          instruments={instruments}
          effects={effects}
          packs={packs}
          midiFx={midiFx}
          productCount={seed.productCount}
        />
        <ViewportLazy minHeight={0} rootMargin="80px 0px">
          <WaveformTransition
            barCount={150}
            topColor="#080911"
            bottomColor="#080911"
          />
        </ViewportLazy>
      </div>

      <ViewportLazy minHeight={640}>
        <CymasphereSpotlight
          price={seed.cymasphere.price}
          salePrice={seed.cymasphere.salePrice}
        />
      </ViewportLazy>
      <ViewportLazy minHeight={640}>
        <CymasynthSpotlight product={cymasynth} />
      </ViewportLazy>

      <CategoryGrid categories={categories} />

      {seed.featured.length > 0 ? (
        <FeaturedProductsSection
          id="featured"
          eyebrow="Best Sellers"
          title="Where most people start"
          products={seed.featured}
        />
      ) : null}

      {freeProducts.length > 0 ? (
        <FreeCollectionSection products={freeProducts} />
      ) : null}

      <ViewportLazy minHeight={480}>
        <PricingSection />
      </ViewportLazy>
      <ViewportLazy minHeight={600}>
        <FAQSection />
      </ViewportLazy>
    </>
  );
}
