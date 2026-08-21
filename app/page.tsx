"use client";

/**
 * @fileoverview Public homepage built around the Cymasphere ecosystem story:
 * a PCB-network hero with Cymasphere at the center, flagship spotlights for
 * Cymasphere and CymaSynth, a compact category grid, then featured and free
 * product rows with pricing and FAQ.
 * @module app/page
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import EcosystemHero from "@/components/sections/EcosystemHero";
import CymasphereSpotlight from "@/components/sections/CymasphereSpotlight";
import CymasynthSpotlight from "@/components/sections/CymasynthSpotlight";
import CategoryGrid, {
  CategoryTile,
} from "@/components/sections/CategoryGrid";
import FreeCollectionSection from "@/components/sections/FreeCollectionSection";
import LoadingComponent from "@/components/common/LoadingComponent";
import FeaturedProductsSectionSkeleton from "@/components/sections/FeaturedProductsSectionSkeleton";

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

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [effects, setEffects] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [midiFx, setMidiFx] = useState<any[]>([]);
  const [freeProducts, setFreeProducts] = useState<any[]>([]);
  const [bundleCount, setBundleCount] = useState(0);
  const [cymaspherePricing, setCymaspherePricing] = useState<{
    price?: number;
    salePrice?: number | null;
  }>({});
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

        // Featured row: curated order for the best-sellers strip.
        if (featuredData.success && featuredData.products) {
          const bundleSlugs = [
            "ultimate-bundle",
            "producers-arsenal",
            "beat-lab",
          ];
          const mappedFeatured = featuredData.products
            .filter((p: any) => p)
            .map((p: any) => {
              const isBundle = bundleSlugs.includes(p.slug);
              const productImage = p.featured_image_url || "";
              const logoOrProduct = p.logo_url || productImage || "";
              const useProductImageOnly =
                (p.slug || "").toLowerCase() === "cymasphere";
              return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                tagline: p.tagline || p.short_description || "",
                description: p.description,
                logo: useProductImageOnly ? productImage : logoOrProduct,
                thumbnail: useProductImageOnly
                  ? productImage
                  : productImage || p.logo_url || "",
                backgroundImage:
                  p.background_image_url || p.background_video_url || "",
                price: `$${p.sale_price || p.price}`,
                hasMultiplePricing: isBundle || p.category === "bundle",
              };
            });
          const curatedFeaturedOrder = [
            "ultimate-bundle",
            "cymasphere",
            "curio-texture-generator",
            "reiya",
            "obscura-tortured-orchestral-box",
          ];
          const sortedFeatured = mappedFeatured
            .sort((a: any, b: any) => {
              const aIndex = curatedFeaturedOrder.indexOf(a.slug);
              const bIndex = curatedFeaturedOrder.indexOf(b.slug);
              const normalizedA =
                aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
              const normalizedB =
                bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
              return normalizedA - normalizedB;
            })
            .slice(0, 5);
          setFeaturedProducts(sortedFeatured || []);
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
  const HERO_SKIP = new Set(["cymasynth", "cymasphere", "nnaudio-access"]);
  const productCount = new Set(
    [...instruments, ...effects, ...packs, ...midiFx]
      .map((p) => String(p.slug || "").toLowerCase())
      .filter((slug) => slug && !HERO_SKIP.has(slug))
  ).size;

  const categories: CategoryTile[] = [
    {
      key: "instruments",
      label: "Instruments",
      href: "/products?category=instrument-plugin",
      count: instruments.length,
    },
    {
      key: "effects",
      label: "Effects",
      href: "/products?category=audio-fx-plugin",
      count: effects.length,
    },
    {
      key: "midi-fx",
      label: "MIDI FX",
      href: "/products?category=midi-fx-plugin",
      count: midiFx.length,
    },
    {
      key: "packs",
      label: "MIDI & Sample Packs",
      href: "/packs",
      count: packs.length,
    },
    {
      key: "bundles",
      label: "Bundles",
      href: "/bundles",
      count: bundleCount,
    },
    {
      key: "free",
      label: "Free Tools",
      href: "/free-tools",
      count: freeProducts.length,
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

      {/* Featured row */}
      {!loading && featuredProducts.length > 0 && (
        <FeaturedProductsSection
          id="featured"
          eyebrow="Best Sellers"
          title="Where most people start"
          products={featuredProducts}
        />
      )}

      {/* Free row */}
      {!loading && freeProducts.length > 0 && (
        <FreeCollectionSection products={freeProducts} />
      )}

      {/* Pricing + FAQ */}
      <PricingSection />
      <FAQSection />
    </>
  );
}
