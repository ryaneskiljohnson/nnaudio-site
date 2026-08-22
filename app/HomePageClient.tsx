"use client";

/**
 * @fileoverview Public homepage built around the Cymasphere ecosystem story:
 * a PCB-network hero with Cymasphere at the center, flagship spotlights for
 * Cymasphere and CymaSynth, a compact category grid, then featured and free
 * product rows with pricing and FAQ.
 * @module app/HomePageClient
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  countHeroCatalogProducts,
  emptyHomepageCatalogSeed,
  mapRawProductToFeaturedCard,
  sortFeaturedProducts,
  type HomepageCatalogSeed,
} from "@/lib/homepage-hero-seed";
import EcosystemHero from "@/components/sections/EcosystemHero";
import CymasphereSpotlight from "@/components/sections/CymasphereSpotlight";
import CymasynthSpotlight from "@/components/sections/CymasynthSpotlight";
import CategoryGrid, {
  CategoryTile,
} from "@/components/sections/CategoryGrid";
import FreeCollectionSection from "@/components/sections/FreeCollectionSection";
import LoadingComponent from "@/components/common/LoadingComponent";
import FeaturedProductsSectionSkeleton from "@/components/sections/FeaturedProductsSectionSkeleton";
import FreeCollectionSectionSkeleton from "@/components/sections/FreeCollectionSectionSkeleton";

// Lazy load below-the-fold sections for better initial page load.
const FeaturedProductsSection = dynamic(
  () => import("@/components/sections/FeaturedProductsSection"),
  {
    ssr: true,
    loading: () => <FeaturedProductsSectionSkeleton />,
  }
);

const WaveformTransition = dynamic(
  () => import("@/components/sections/WaveformTransition"),
  { ssr: false, loading: () => null }
);

const PricingSection = dynamic(
  () => import("@/components/sections/PricingSection"),
  {
    ssr: true,
    loading: () => <LoadingComponent text="Loading pricing..." />,
  }
);

const FAQSection = dynamic(() => import("@/components/sections/FAQSection"), {
  ssr: true,
  loading: () => <div style={{ minHeight: "600px", background: "#0a0a0a" }} />,
});

/** Raw product fields consumed from the catalog API. */
interface ApiProduct {
  id: string | number;
  name: string;
  slug: string;
  tagline?: string;
  short_description?: string;
  description?: string;
  category?: string;
  featured_image_url?: string;
  logo_url?: string;
  background_image_url?: string;
  background_video_url?: string;
  price?: number;
  sale_price?: number | null;
}

/**
 * @brief Maps a raw API product to the card shape shared by the homepage
 * sections (hero board, free row).
 * @param p Raw product from /api/products.
 * @returns Card-shaped product.
 */
function toCard(p: ApiProduct) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    tagline: p.tagline || p.short_description || "",
    short_description: p.short_description,
    description: p.description,
    category: p.category || "plugin",
    image: p.featured_image_url || p.logo_url || "",
    featured_image_url: p.featured_image_url,
    logo_url: p.logo_url,
    backgroundImage: p.background_image_url || p.background_video_url || "",
    price: typeof p.price === "number" ? p.price : 0,
    sale_price: p.sale_price,
  };
}

/**
 * @brief Client homepage; `seed` is painted in the first HTML so the hero
 * count and category grid do not pop in after the catalog fetches.
 * @param seed Server-counted orbit catalog snapshot.
 * @returns Homepage sections.
 */
export default function HomePageClient({
  seed = emptyHomepageCatalogSeed(),
}: {
  seed?: HomepageCatalogSeed;
}) {
  const [featuredProducts, setFeaturedProducts] = useState(seed.featured);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [effects, setEffects] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [midiFx, setMidiFx] = useState<any[]>([]);
  const [freeProducts, setFreeProducts] = useState<any[]>([]);
  const [bundleCount, setBundleCount] = useState(seed.bundleCount);
  const [cymaspherePricing, setCymaspherePricing] = useState<{
    price?: number;
    salePrice?: number | null;
  }>(seed.cymasphere);
  const [cymasphereProduct, setCymasphereProduct] = useState<ReturnType<
    typeof toCard
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchProducts = async () => {
      try {
        // All homepage data in parallel: featured row, category lists for the
        // circuit board + counts, free row, bundle count, and Cymasphere
        // pricing by slug (not coupled to the featured list).
        const [
          featuredRes,
          bundlesRes,
          fxRes,
          instrumentRes,
          midiFxRes,
          packsRes,
          freeRes,
          cymasphereRes,
        ] = await Promise.all([
          fetch("/api/products?featured=true&status=active&limit=6", { signal }),
          fetch("/api/bundles?status=active", { signal }),
          fetch("/api/products?category=audio-fx-plugin&status=active&limit=10000", { signal }),
          fetch("/api/products?category=instrument-plugin&status=active&limit=10000", { signal }),
          fetch("/api/products?category=midi-fx-plugin&status=active&limit=10000", { signal }),
          fetch("/api/products?category=pack&status=active&limit=10000", { signal }),
          fetch("/api/products?free=true&status=active&limit=10000", { signal }),
          fetch("/api/products?slug=cymasphere&status=active&limit=1", { signal }),
        ]);

        const [
          featuredData,
          bundlesData,
          fxData,
          instrumentData,
          midiFxData,
          packsData,
          freeData,
          cymasphereData,
        ] = await Promise.all([
          featuredRes.json(),
          bundlesRes.json(),
          fxRes.json(),
          instrumentRes.json(),
          midiFxRes.json(),
          packsRes.json(),
          freeRes.json(),
          cymasphereRes.json(),
        ]);

        if (cymasphereData.success && Array.isArray(cymasphereData.products)) {
          const cymasphere = cymasphereData.products.find(
            (p: ApiProduct) => p?.slug === "cymasphere"
          );
          if (cymasphere) {
            setCymasphereProduct(toCard(cymasphere));
            setCymaspherePricing({
              price: cymasphere.price,
              salePrice: cymasphere.sale_price ?? null,
            });
          }
        }

        // Featured row: same mapper + sort as the server seed for stable prices.
        if (featuredData.success && featuredData.products) {
          const mappedFeatured = featuredData.products
            .filter((p: ApiProduct) => p)
            .map((p: ApiProduct) => mapRawProductToFeaturedCard(p));
          setFeaturedProducts(sortFeaturedProducts(mappedFeatured));
        }

        if (bundlesData.success && bundlesData.bundles) {
          setBundleCount(bundlesData.bundles.length);
        }
        if (instrumentData.success) {
          setInstruments(instrumentData.products.map(toCard));
        }
        if (fxData.success) {
          setEffects(fxData.products.map(toCard));
        }
        if (midiFxData.success) {
          setMidiFx(midiFxData.products.map(toCard));
        }
        if (packsData.success) {
          setPacks(packsData.products.map(toCard));
        }
        if (freeData.success) {
          setFreeProducts(freeData.products.map(toCard));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Error fetching products:", error);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, []);

  const cymasynth = instruments.find((p) => p.slug === "cymasynth") || null;
  const liveCount = countHeroCatalogProducts([
    ...instruments,
    ...effects,
    ...packs,
    ...midiFx,
  ]);
  const productCount = liveCount > 0 ? liveCount : seed.productCount;

  /**
   * @brief First few artwork URLs from a product list, for the catalog
   * grid's orbiting thumbnail clusters.
   * @param list Card-shaped products.
   * @returns Up to four artwork URLs.
   */
  const catThumbs = (list: ReturnType<typeof toCard>[]): string[] =>
    list
      .map((p) => p.featured_image_url || p.image || p.logo_url || "")
      .filter(Boolean)
      .slice(0, 4);

  const categories: CategoryTile[] = [
    {
      key: "instruments",
      label: "Instruments",
      href: "/products?category=instrument-plugin",
      count: instruments.length || seed.instruments.count,
      blurb: "Synths, texture engines, and sound generators.",
      images: instruments.length
        ? catThumbs(instruments)
        : seed.instruments.thumbs,
    },
    {
      key: "effects",
      label: "Effects",
      href: "/products?category=audio-fx-plugin",
      count: effects.length || seed.effects.count,
      blurb: "Color, space, and motion for any source.",
      images: effects.length ? catThumbs(effects) : seed.effects.thumbs,
    },
    {
      key: "midi-fx",
      label: "MIDI FX",
      href: "/products?category=midi-fx-plugin",
      count: midiFx.length || seed.midiFx.count,
      blurb: "Writing tools that plug into your DAW.",
      images: midiFx.length ? catThumbs(midiFx) : seed.midiFx.thumbs,
    },
    {
      key: "packs",
      label: "MIDI & Sample Packs",
      href: "/packs",
      count: packs.length || seed.packs.count,
      blurb: "Drop-in phrases, kits, and sounds.",
      images: packs.length ? catThumbs(packs) : seed.packs.thumbs,
    },
    {
      key: "bundles",
      label: "Bundles",
      href: "/bundles",
      count: bundleCount,
      blurb: "More products, one better price.",
    },
    {
      key: "free",
      label: "Free Tools",
      href: "/free-tools",
      count: freeProducts.length || seed.free.count,
      blurb: "Start producing without spending a dime.",
      images: freeProducts.length ? catThumbs(freeProducts) : seed.free.thumbs,
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
      {/* Ecosystem hero: Cymasphere as the brain of the catalog */}
      <div style={{ position: "relative", overflow: "visible" }}>
        <EcosystemHero
          cymasphere={cymasphereProduct}
          instruments={instruments}
          effects={effects}
          packs={packs}
          midiFx={midiFx}
          productCount={productCount}
        />
        {!loading && (
          <WaveformTransition
            barCount={150}
            topColor="#080911"
            bottomColor="#080911"
          />
        )}
      </div>

      {/* Flagship spotlights */}
      <CymasphereSpotlight
        price={cymaspherePricing.price}
        salePrice={cymaspherePricing.salePrice}
      />
      <CymasynthSpotlight product={cymasynth} />

      {/* Catalog breadth at a glance */}
      <CategoryGrid categories={categories} />

      {/* Featured row: seed paints first; skeleton only if seed was empty. */}
      {featuredProducts.length > 0 ? (
        <FeaturedProductsSection
          id="featured"
          eyebrow="Best Sellers"
          title="Where most people start"
          products={featuredProducts}
        />
      ) : (
        loading && <FeaturedProductsSectionSkeleton />
      )}

      {/* Free row: reserve height until the client catalog arrives. */}
      {freeProducts.length > 0 ? (
        <FreeCollectionSection products={freeProducts} />
      ) : (
        loading && <FreeCollectionSectionSkeleton />
      )}

      {/* Pricing + FAQ */}
      <PricingSection />
      <FAQSection />
    </>
  );
}
