"use client";

/**
 * @fileoverview Public homepage that merchandises the NNAud.io growth ladder:
 * free tools, bundles, flagship products, pricing, and FAQ.
 * @module app/page
 */

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import NNAudHeroSection from "@/components/sections/NNAudHeroSection";
import StartHereSection from "@/components/sections/StartHereSection";
import ProofPointsSection from "@/components/sections/ProofPointsSection";
import ConversionCtaSection from "@/components/sections/ConversionCtaSection";
import PremiumSpotlightSection from "@/components/sections/PremiumSpotlightSection";
import {
  CYMASPHERE_PRICE_USD,
  isCymasphereSlug,
} from "@/lib/cymasphere-sales";
import FreeCollectionSection from "@/components/sections/FreeCollectionSection";
import LoadingComponent from "@/components/common/LoadingComponent";
import ProductsSectionSkeleton from "@/components/sections/ProductsSectionSkeleton";
import FeaturedProductsSectionSkeleton from "@/components/sections/FeaturedProductsSectionSkeleton";

// Lazy load product sections for better initial page load
// NOTE: loading fallbacks use skeleton components instead of null to prevent
// blank gaps when data arrives before the JS chunks have downloaded (first visit).
const ProductsSection = dynamic(
  () => import("@/components/sections/ProductsSection"),
  {
    ssr: true,
    loading: () => <ProductsSectionSkeleton />,
  }
);

const FeaturedProductsSection = dynamic(
  () => import("@/components/sections/FeaturedProductsSection"),
  {
    ssr: true,
    loading: () => <FeaturedProductsSectionSkeleton />,
  }
);

// Lazy load waveform transition for better initial page load
const WaveformTransition = dynamic(
  () => import("@/components/sections/WaveformTransition"),
  {
    ssr: false,
    loading: () => null,
  }
);

// Lazy load non-critical sections
const PricingSection = dynamic(
  () => import("@/components/sections/PricingSection"),
  {
    ssr: true,
    loading: () => <LoadingComponent text="Loading pricing..." />,
  }
);

const NNAudioAccessHighlightSection = dynamic(
  () => import("@/components/sections/NNAudioAccessHighlightSection"),
  { ssr: true }
);

const FAQSection = dynamic(() => import("@/components/sections/FAQSection"), {
  ssr: true,
  loading: () => <div style={{ minHeight: "600px", background: "#0a0a0a" }} />,
});

// Fallback static products (used if API fails)
const staticPlugins = [
  {
    id: 1,
    name: "Curio",
    description: "Advanced synthesizer with unique sound design capabilities",
    image: "/images/nnaud-io/Curio-LogoText.webp",
    backgroundImage: "/images/nnaud-io/Curio-BG-Motion.gif",
    price: "$49",
  },
  {
    id: 2,
    name: "PercGadget",
    description: "Powerful percussion sequencer and drum machine",
    image: "/images/nnaud-io/PercGadget-LogoTrans-600x150.webp",
    backgroundImage: "/images/nnaud-io/PercGadget-BG-Motion1.gif",
    price: "$39",
  },
  {
    id: 3,
    name: "CrystalBall",
    description: "Revolutionary effects processor with AI-powered modulation",
    image: "/images/nnaud-io/CrystalBall-Logo.webp",
    backgroundImage: "/images/nnaud-io/CrystalBall-Features-BG.gif",
    price: "$59",
  },
  {
    id: 4,
    name: "Time Zones",
    description: "Creative delay and time-based effects plugin",
    image: "/images/nnaud-io/Time-Zones-Logo-600x157.webp",
    price: "$29",
  },
  {
    id: 5,
    name: "Bakers Dozen",
    description: "Professional drum machine with 13 unique kits",
    image: "/images/nnaud-io/BakersDozenLogo-600x150.webp",
    backgroundImage: "/images/nnaud-io/BakersBackground.webp",
    price: "$34",
  },
  {
    id: 6,
    name: "Weaknd",
    description: "Analog-style synthesizer with vintage warmth",
    image: "/images/nnaud-io/WeakndLogo-600x150.webp",
    backgroundImage: "/images/nnaud-io/WeakndBG.webp",
    price: "$44",
  },
];

const staticPacks = [
  {
    id: 1,
    name: "GameBoi",
    description: "Retro gaming inspired sound pack with chiptune elements",
    image: "/images/nnaud-io/GameBoi-Art-600x600.webp",
    price: "$19",
  },
  {
    id: 2,
    name: "Toybox Retro",
    description: "Vintage toy sounds and nostalgic textures",
    image: "/images/nnaud-io/Toybox-Retro-Art-1000-600x600.webp",
    price: "$24",
  },
  {
    id: 3,
    name: "FreeQ",
    description: "Freeform frequency manipulation pack",
    image: "/images/nnaud-io/FreeQWebart-600x600.webp",
    price: "$29",
  },
  {
    id: 4,
    name: "Swiper",
    description: "Smooth transitions and cinematic sweeps",
    image: "/images/nnaud-io/Swiper-1000-600x600.webp",
    price: "$22",
  },
  {
    id: 5,
    name: "Apache",
    description: "Powerful drum and percussion samples",
    image: "/images/nnaud-io/Apache-1000-600x600.webp",
    price: "$27",
  },
  {
    id: 6,
    name: "MIDI Nerds Pads & Atmos",
    description: "Atmospheric pads and ambient textures",
    image: "/images/nnaud-io/MIDI-Nerds-1-Pads-Atmos-1000-600x600.webp",
    price: "$34",
  },
  {
    id: 7,
    name: "Rabbit Hole",
    description: "Experimental sounds and unique textures",
    image: "/images/nnaud-io/Rabbit-Hole-1000-600x600.webp",
    price: "$29",
  },
  {
    id: 8,
    name: "Cowboy Harp",
    description: "Western-inspired string and harp samples",
    image: "/images/nnaud-io/CowboyHarpArt-600x600.webp",
    price: "$24",
  },
];

// Static featured products (fallback)
const staticFeaturedProducts = [
  {
    id: 1,
    name: "Curio",
    tagline: "Unleash The Sorcery Within",
    logo: "/images/nnaud-io/Curio-LogoText.webp",
    thumbnail: "/images/nnaud-io/Curio-LogoText.webp",
    backgroundImage: "/images/nnaud-io/Curio-BG-Motion.gif",
    price: "$49",
  },
  {
    id: 2,
    name: "PercGadget",
    tagline: "Innovation And Rhythm Converge",
    logo: "/images/nnaud-io/PercGadget-LogoTrans-600x150.webp",
    thumbnail: "/images/nnaud-io/PercGadget-LogoTrans-600x150.webp",
    backgroundImage: "/images/nnaud-io/PercGadget-BG-Motion1.gif",
    price: "$39",
  },
  {
    id: 3,
    name: "CrystalBall",
    tagline: "Sculpt Your Sonic Reality",
    logo: "/images/nnaud-io/CrystalBall-Logo.webp",
    thumbnail: "/images/nnaud-io/CrystalBall-Logo.webp",
    backgroundImage: "/images/nnaud-io/CrystalBall-Features-BG.gif",
    price: "$59",
  },
  {
    id: 4,
    name: "Life Death",
    tagline: "Experience The Duality Of Sound",
    logo: "/images/nnaud-io/LifeDeathLogo-600x150.webp",
    thumbnail: "/images/nnaud-io/LifeDeathLogo-600x150.webp",
    backgroundImage: "/images/nnaud-io/LifeDeathBG-1.webp",
    price: "$44",
  },
  {
    id: 5,
    name: "Time Zones",
    tagline: "Creative Delay And Time-Based Effects",
    logo: "/images/nnaud-io/Time-Zones-Logo-600x157.webp",
    thumbnail: "/images/nnaud-io/Time-Zones-Logo-600x157.webp",
    backgroundImage: "/images/nnaud-io/Time-Zones-Logo-600x157.webp",
    price: "$29",
  },
  {
    id: 6,
    name: "Weaknd",
    tagline: "Analog-Style Synthesizer",
    logo: "/images/nnaud-io/WeakndLogo-600x150.webp",
    thumbnail: "/images/nnaud-io/WeakndLogo-600x150.webp",
    backgroundImage: "/images/nnaud-io/WeakndBG.webp",
    price: "$44",
  },
];

function isFreeProduct(product: { price?: number | null; sale_price?: number | null }) {
  return product.price === 0 || product.sale_price === 0;
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [instrumentPlugins, setInstrumentPlugins] = useState<any[]>([]);
  const [audioFxPlugins, setAudioFxPlugins] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [freeProducts, setFreeProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch ALL products in parallel for better performance.
        // Bundles come from /api/bundles for correct pricing and subscription vs one-time.
        const [featuredResponse, bundlesResponse, fxResponse, instrumentResponse, packsResponse, freeResponse] = await Promise.all([
          fetch('/api/products?featured=true&status=active&limit=6'),
          fetch('/api/bundles?status=active'),
          fetch('/api/products?category=audio-fx-plugin&status=active&limit=10000'),
          fetch('/api/products?category=instrument-plugin&status=active&limit=10000'),
          fetch('/api/products?category=pack&status=active&limit=10000'),
          fetch('/api/products?free=true&status=active&limit=10000'),
        ]);

        const [featuredData, bundlesData, fxData, instrumentData, packsData, freeData] = await Promise.all([
          featuredResponse.json(),
          bundlesResponse.json(),
          fxResponse.json(),
          instrumentResponse.json(),
          packsResponse.json(),
          freeResponse.json(),
        ]);
        
        // Map featured products
        if (featuredData.success && featuredData.products) {
          const bundleSlugs = ['ultimate-bundle', 'producers-arsenal', 'beat-lab'];
          const mappedFeatured = featuredData.products
            .filter((p: any) => p)
            .map((p: any) => {
              const isBundle = bundleSlugs.includes(p.slug);
              const productImage = p.featured_image_url || '';
              const logoOrProduct = p.logo_url || productImage || '';
              const useProductImageOnly = (p.slug || '').toLowerCase() === 'cymasphere';
              return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                tagline: p.tagline || p.short_description || '',
                description: p.description,
                logo: useProductImageOnly ? productImage : logoOrProduct,
                thumbnail: useProductImageOnly ? productImage : (productImage || p.logo_url || ''),
                backgroundImage: p.background_image_url || p.background_video_url || '',
                price: `$${
                  isCymasphereSlug(p.slug)
                    ? CYMASPHERE_PRICE_USD
                    : p.sale_price || p.price
                }`,
                hasMultiplePricing: isBundle || p.category === 'bundle',
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
              const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
              const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
              return normalizedA - normalizedB;
            })
            .slice(0, 5);
          setFeaturedProducts(sortedFeatured || []);
        } else {
          setFeaturedProducts([]);
        }

        // Map bundles from /api/bundles: correct pricing, images (bundle or first product), totalValue for strikethrough
        if (bundlesData.success && bundlesData.bundles) {
          const eliteBundleSlugs = ['ultimate-bundle', 'producers-arsenal', 'beat-lab'];
          const mappedBundles = bundlesData.bundles
            .filter((b: any) => eliteBundleSlugs.includes((b.slug || '').toLowerCase()))
            .map((b: any) => {
            const isSub = !!b.isSubscriptionBundle;
            const lifetime = b.pricing?.lifetime;
            const price = isSub ? 0 : (lifetime?.sale_price ?? lifetime?.price ?? 0);
            const salePrice = isSub ? null : (lifetime?.sale_price ?? null);
            const imageUrl = (b.featured_image_url || b.logo_url || '').trim() || undefined;
            return {
              id: b.id,
              name: b.name,
              slug: b.slug,
              tagline: b.tagline || b.short_description || '',
              short_description: b.short_description ?? b.description ?? '',
              description: b.description ?? '',
              category: 'bundle',
              image: imageUrl ?? '',
              featured_image_url: imageUrl,
              logo_url: imageUrl,
              backgroundImage: b.background_image_url || b.background_video_url || '',
              price: typeof price === 'number' ? price : 0,
              sale_price: salePrice,
              hasMultiplePricing: isSub,
              compareAtPrice: !isSub && typeof b.totalValue === 'number' && b.totalValue > 0 ? b.totalValue : undefined,
            };
          });
          setBundles(mappedBundles);
        }

        // Map instrument plugins
        if (instrumentData.success) {
          const mappedInstrumentPlugins = instrumentData.products
            .filter((p: any) => !isFreeProduct(p))
            .map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category || 'plugin',
            image: p.logo_url || p.featured_image_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setInstrumentPlugins(mappedInstrumentPlugins);
        }

        // Map audio FX plugins (include free so section has enough for slider + arrows)
        if (fxData.success) {
          const mappedFxPlugins = fxData.products
            .map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category || 'plugin',
            image: p.logo_url || p.featured_image_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setAudioFxPlugins(mappedFxPlugins);
        }

        // Map packs
        if (packsData.success) {
          const mappedPacks = packsData.products
            .filter((p: any) => !isFreeProduct(p))
            .map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category || 'pack',
            image: p.featured_image_url || p.logo_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setPacks(mappedPacks);
        }

        // Map free products
        if (freeData.success) {
          const mappedFree = freeData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category,
            image: p.logo_url || p.featured_image_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: typeof p.price === 'number' ? p.price : 0, // Preserve original price
            sale_price: p.sale_price,
          }));
          setFreeProducts(mappedFree);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fall back to hardcoded products if API fails
        setFeaturedProducts(staticFeaturedProducts);
        setBundles([]);
        setInstrumentPlugins(staticPlugins.filter((p: any) => p.name.includes('Curio') || p.name.includes('Weaknd')));
        setAudioFxPlugins(staticPlugins.filter((p: any) => !p.name.includes('Curio') && !p.name.includes('Weaknd')));
        setPacks(staticPacks);
        setFreeProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <>
      {/* Hero section */}
      <Suspense fallback={<LoadingComponent fullScreen />}>
        <div style={{ position: 'relative', overflow: 'visible' }}>
        <NNAudHeroSection />
          {!loading && (featuredProducts.length > 0 || bundles.length > 0 || instrumentPlugins.length > 0) && (
            <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#0a0a0a" />
          )}
        </div>
      </Suspense>

      <ProofPointsSection />
      <StartHereSection />

      {!loading && freeProducts.length > 0 ? (
        <FreeCollectionSection products={freeProducts} />
      ) : (
        <ProductsSectionSkeleton 
          title="Free Tools"
          subtitle="High-quality plugins and samples available at no cost"
          cardCount={4}
        />
      )}
      {!loading && <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#06070f" />}

      <PremiumSpotlightSection />

      {/* Featured Products section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && featuredProducts.length > 0 ? (
          <FeaturedProductsSection
            id="featured"
            eyebrow="Best Of NNAudio"
            title="Start with the ones producers come back to"
            subtitle="A few of the strongest ways into the catalog—whether you want to hear the NNAudio sound or build with the flagship composition workflow."
            footerNote="These are the products most likely to tell you quickly whether the NNAudio sound and workflow fit the way you create."
            products={featuredProducts}
          />
        ) : (
          <FeaturedProductsSectionSkeleton />
        )}
        {!loading && (bundles.length > 0 || instrumentPlugins.length > 0) && (
          <WaveformTransition barCount={150} topColor="#1a1a2e" bottomColor="#0a0a0a" />
        )}
      </div>
      
      {/* Bundles section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && bundles.length > 0 ? (
          <ProductsSection
            id="bundles"
            eyebrow="Elite Bundles"
            title="Own More In One Move"
            subtitle="When you already know the sound fits, this is the fastest way to build a deeper setup without piecing it together product by product."
            footerNote="The 3 elite bundles are the top-shelf ownership path when you want more range, more tools, and a bigger NNAudio setup in one move."
            products={bundles}
            maxCardsPerView={3}
            cardSize="large"
            browseAllHref="/bundles"
            browseAllLabel="Browse All Bundles"
          />
        ) : (
          <ProductsSectionSkeleton 
            title="Elite Bundles"
            subtitle="Complete collections of premium plugins and samples at unbeatable value"
            cardCount={3}
            cardWidth={400}
          />
        )}
        {!loading && instrumentPlugins.length > 0 && (
          <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#1a1a2e" />
        )}
      </div>
      
      {/* Instrument Plugins section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && instrumentPlugins.length > 0 ? (
          <ProductsSection
            id="instrument-plugins"
            eyebrow="Playable Color"
            title="Instruments"
            subtitle="Textures, keys, guitars, winds, and layered engines built to bring more character into real sessions."
            footerNote="When you want more playable identity and character, this is where the catalog opens up."
            products={instrumentPlugins}
            fetchAllUrl="/api/products?category=instrument-plugin&status=active&limit=10000"
            browseAllHref="/products?category=instrument-plugin"
            browseAllLabel="Browse All Instruments"
          />
        ) : (
          <ProductsSectionSkeleton 
            title="Instrument Plugins"
            subtitle="Powerful synthesizers and sampled instruments for your productions"
            cardCount={4}
          />
        )}
        {!loading && (audioFxPlugins.length > 0 || packs.length > 0) && (
          <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#1a1a2e" />
        )}
      </div>
      
      {/* Audio FX Plugins section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && audioFxPlugins.length > 0 ? (
          <ProductsSection
            id="audio-fx-plugins"
            eyebrow="Mix + Motion"
            title="Effects"
            subtitle="Creative processors for width, motion, depth, and the kind of finish that makes a track feel more alive."
            footerNote="These are the tools for movement, space, energy, and the kind of final detail that makes a track feel less flat."
            products={audioFxPlugins}
            maxCardsPerView={3}
            fetchAllUrl="/api/products?category=audio-fx-plugin&status=active&limit=10000"
            browseAllHref="/products?category=audio-fx-plugin"
            browseAllLabel="Browse All Effects"
          />
        ) : (
          <ProductsSectionSkeleton 
            title="Audio FX Plugins"
            subtitle="Professional effects processors to shape and enhance your sound"
            cardCount={4}
          />
        )}
        {!loading && packs.length > 0 && (
          <WaveformTransition barCount={150} topColor="#1a1a2e" bottomColor="#0a0a0a" />
        )}
      </div>
      
      {/* Packs section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && packs.length > 0 ? (
          <ProductsSection
            id="packs"
            eyebrow="Fast Inspiration"
            title="MIDI And Sample Packs"
            subtitle="Fast inspiration for producers who want stronger ideas without losing momentum hunting for them."
            footerNote="When the hardest part is getting started, these packs are built to get you moving faster."
            products={packs}
            fetchAllUrl="/api/products?category=pack&status=active&limit=10000"
            browseAllHref="/packs"
            browseAllLabel="Browse All Packs"
          />
        ) : (
          <ProductsSectionSkeleton 
            title="Sample Packs"
            subtitle="Curated collections of high-quality sounds and samples"
            cardCount={4}
          />
        )}
      </div>

      {/* NNAudio Access highlight - after the catalog story */}
      <NNAudioAccessHighlightSection />

      <ConversionCtaSection />

      {/* Pricing section - Always render */}
      <PricingSection />
      
      {/* FAQ section - bottom of landing page */}
      <FAQSection />
    </>
  );
}
