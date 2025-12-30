"use client";

// NNAud.io style landing page
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import NNAudHeroSection from "@/components/sections/NNAudHeroSection";
import LoadingComponent from "@/components/common/LoadingComponent";
import ProductsSectionSkeleton from "@/components/sections/ProductsSectionSkeleton";
import FeaturedProductsSectionSkeleton from "@/components/sections/FeaturedProductsSectionSkeleton";

// Lazy load product sections for better initial page load
const ProductsSection = dynamic(
  () => import("@/components/sections/ProductsSection"),
  {
    ssr: true,
    loading: () => null,
  }
);

const FeaturedProductsSection = dynamic(
  () => import("@/components/sections/FeaturedProductsSection"),
  {
    ssr: true,
    loading: () => null,
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

// const FAQSection = dynamic(() => import("@/components/sections/FAQSection"), {
//   ssr: true,
//   loading: () => <div style={{ minHeight: "600px", background: "#0a0a0a" }} />,
// });

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
    image: "/images/nnaud-io/CrystalBall-Logo.png",
    backgroundImage: "/images/nnaud-io/CrystalBall-Features-BG.gif",
    price: "$59",
  },
  {
    id: 4,
    name: "Time Zones",
    description: "Creative delay and time-based effects plugin",
    image: "/images/nnaud-io/Time-Zones-Logo-600x157.jpg",
    price: "$29",
  },
  {
    id: 5,
    name: "Bakers Dozen",
    description: "Professional drum machine with 13 unique kits",
    image: "/images/nnaud-io/BakersDozenLogo-600x150.jpg",
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
    logo: "/images/nnaud-io/CrystalBall-Logo.png",
    thumbnail: "/images/nnaud-io/CrystalBall-Logo.png",
    backgroundImage: "/images/nnaud-io/CrystalBall-Features-BG.gif",
    price: "$59",
  },
  {
    id: 4,
    name: "Life Death",
    tagline: "Experience the duality of sound",
    logo: "/images/nnaud-io/LifeDeathLogo-600x150.webp",
    thumbnail: "/images/nnaud-io/LifeDeathLogo-600x150.webp",
    backgroundImage: "/images/nnaud-io/LifeDeathBG-1.webp",
    price: "$44",
  },
  {
    id: 5,
    name: "Time Zones",
    tagline: "Creative delay and time-based effects",
    logo: "/images/nnaud-io/Time-Zones-Logo-600x157.jpg",
    thumbnail: "/images/nnaud-io/Time-Zones-Logo-600x157.jpg",
    backgroundImage: "/images/nnaud-io/Time-Zones-Logo-600x157.jpg",
    price: "$29",
  },
  {
    id: 6,
    name: "Weaknd",
    tagline: "Analog-style synthesizer",
    logo: "/images/nnaud-io/WeakndLogo-600x150.webp",
    thumbnail: "/images/nnaud-io/WeakndLogo-600x150.webp",
    backgroundImage: "/images/nnaud-io/WeakndBG.webp",
    price: "$44",
  },
];

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
        // Fetch ALL products in parallel for better performance
        const [featuredResponse, bundlesResponse, fxResponse, instrumentResponse, packsResponse, freeResponse] = await Promise.all([
          fetch('/api/products?featured=true&status=active&limit=6'),
          fetch('/api/products?category=bundle&status=active&limit=10000'),
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
        if (featuredData.success) {
          const bundleSlugs = ['ultimate-bundle', 'producers-arsenal', 'beat-lab'];
          const mappedFeatured = featuredData.products.map((p: any) => {
            const isBundle = bundleSlugs.includes(p.slug);
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              tagline: p.tagline || p.short_description || '',
              description: p.description,
              logo: p.logo_url || p.featured_image_url || '',
              thumbnail: p.featured_image_url || p.logo_url || '',
              backgroundImage: p.background_image_url || p.background_video_url || '',
              price: `$${p.sale_price || p.price}`,
              hasMultiplePricing: isBundle || p.category === 'bundle',
            };
          });
          setFeaturedProducts(mappedFeatured);
        }

        // Map bundles
        if (bundlesData.success) {
          const mappedBundles = bundlesData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category || 'bundle',
            image: p.logo_url || p.featured_image_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setBundles(mappedBundles);
        }

        // Map instrument plugins
        if (instrumentData.success) {
          const mappedInstrumentPlugins = instrumentData.products.map((p: any) => ({
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

        // Map audio FX plugins
        if (fxData.success) {
          const mappedFxPlugins = fxData.products.map((p: any) => ({
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
          const mappedPacks = packsData.products.map((p: any) => ({
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
      
      {/* Featured Products section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && featuredProducts.length > 0 ? (
          <FeaturedProductsSection
            id="featured"
            title="Spotlight"
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
            title="Elite Bundles"
            subtitle="Complete collections of premium plugins and samples at unbeatable value"
            products={bundles}
            fetchAllUrl="/api/products?category=bundle&status=active&limit=10000"
            maxCardsPerView={3}
            cardSize="large"
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
            title="Instrument Plugins"
            subtitle="Powerful synthesizers and sampled instruments for your productions"
            products={instrumentPlugins}
            fetchAllUrl="/api/products?category=instrument-plugin&status=active&limit=10000"
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
            title="Audio FX Plugins"
            subtitle="Professional effects processors to shape and enhance your sound"
            products={audioFxPlugins}
            fetchAllUrl="/api/products?category=audio-fx-plugin&status=active&limit=10000"
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
            title="Sample Packs"
            subtitle="Curated collections of high-quality sounds and samples"
            products={packs}
            fetchAllUrl="/api/products?category=pack&status=active&limit=10000"
          />
        ) : (
          <ProductsSectionSkeleton 
            title="Sample Packs"
            subtitle="Curated collections of high-quality sounds and samples"
            cardCount={4}
          />
        )}
        {!loading && freeProducts.length > 0 && (
          <WaveformTransition barCount={150} topColor="#1a1a2e" bottomColor="#06070f" />
        )}
      </div>
      
      {/* Free Products section */}
      <div style={{ position: 'relative', overflow: 'visible' }}>
        {!loading && freeProducts.length > 0 ? (
          <ProductsSection
            id="free-products"
            title="Free Tools"
            subtitle="High-quality plugins and samples available at no cost"
            products={freeProducts}
            fetchAllUrl="/api/products?free=true&status=active&limit=10000"
          />
        ) : (
          <ProductsSectionSkeleton 
            title="Free Tools"
            subtitle="High-quality plugins and samples available at no cost"
            cardCount={4}
          />
        )}
        {!loading && <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#06070f" />}
      </div>
      
      {/* Pricing section - Always render */}
      <PricingSection />
      
      {/* FAQ section */}
      {/* <FAQSection /> */}
    </>
  );
}
