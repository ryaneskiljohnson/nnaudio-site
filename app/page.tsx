"use client";

// NNAud.io style landing page
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import NNAudHeroSection from "@/components/sections/NNAudHeroSection";
import ProductsSection from "@/components/sections/ProductsSection";
import FeaturedProductsSection from "@/components/sections/FeaturedProductsSection";
import LoadingComponent from "@/components/common/LoadingComponent";
// Lazy load waveform transition for better initial page load
const WaveformTransition = dynamic(() => import("@/components/sections/WaveformTransition"), {
  ssr: false,
  loading: () => null, // No loading state needed - it's decorative
});

// Lazy load non-critical sections
const PricingSection = dynamic(() => import("@/components/sections/PricingSection"), {
  ssr: true,
  loading: () => <LoadingComponent text="Loading pricing..." />,
});

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
  const [plugins, setPlugins] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch featured products
        const featuredResponse = await fetch('/api/products?featured=true&status=active&limit=6');
        const featuredData = await featuredResponse.json();
        
        if (featuredData.success) {
          // Map to featured products format
          const mappedFeatured = featuredData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline || p.short_description || '', // Use tagline first (subtitle), not full description
            logo: p.logo_url || p.featured_image_url || '',
            thumbnail: p.featured_image_url || p.logo_url || '',
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: `$${p.sale_price || p.price}`,
          }));
          setFeaturedProducts(mappedFeatured);
        }

            // Fetch plugins (limit to 4 for mobile, will load all when "Show All" is clicked)
            // Fetch both plugin types
            const [fxResponse, instrumentResponse] = await Promise.all([
              fetch('/api/products?category=audio-fx-plugin&status=active&limit=4'),
              fetch('/api/products?category=instrument-plugin&status=active&limit=4'),
            ]);
            
            const fxData = await fxResponse.json();
            const instrumentData = await instrumentResponse.json();
            
            const allPlugins = [
              ...(fxData.success ? fxData.products : []),
              ...(instrumentData.success ? instrumentData.products : []),
            ];
            
            const pluginsData = { success: true, products: allPlugins };
        
        if (pluginsData.success) {
          const mappedPlugins = pluginsData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '', // Card subtitle - short text only
            short_description: p.short_description,
            description: p.description, // Full description for product pages
            category: p.category || 'plugin', // For fallback subtitle generation
            image: p.logo_url || p.featured_image_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setPlugins(mappedPlugins);
        }

            // Fetch packs (limit to 4 for mobile, will load all when "Show All" is clicked)
            const packsResponse = await fetch('/api/products?category=pack&status=active&limit=4');
        const packsData = await packsResponse.json();
        
        if (packsData.success) {
          const mappedPacks = packsData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '', // Card subtitle - short text only
            short_description: p.short_description,
            description: p.description, // Full description for product pages
            category: p.category || 'pack', // For fallback subtitle generation
            image: p.featured_image_url || p.logo_url || '',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setPacks(mappedPacks);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fall back to hardcoded products if API fails
        setFeaturedProducts(staticFeaturedProducts);
        setPlugins(staticPlugins);
        setPacks(staticPacks);
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
          {!loading && featuredProducts.length > 0 && (
            <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#0a0a0a" />
          )}
        </div>
      </Suspense>
      
      {loading ? (
        <LoadingComponent fullScreen text="Loading products..." />
      ) : (
        <>
          {/* Featured Products section */}
          {featuredProducts.length > 0 && (
            <div style={{ position: 'relative', overflow: 'visible' }}>
            <FeaturedProductsSection
              id="featured"
              title="Featured Products"
              products={featuredProducts}
            />
              {plugins.length > 0 && (
                <WaveformTransition barCount={150} topColor="#1a1a2e" bottomColor="#0a0a0a" />
              )}
            </div>
          )}
          
          {/* Plugins section */}
          {plugins.length > 0 && (
            <div style={{ position: 'relative', overflow: 'visible' }}>
            <ProductsSection
              id="plugins"
              title="Premium Plugins"
              subtitle="Professional-grade tools for modern music production"
              products={plugins}
                fetchAllUrl="/api/products?category=audio-fx-plugin,instrument-plugin&status=active&limit=100"
            />
              {packs.length > 0 && (
                <WaveformTransition barCount={150} topColor="#0a0a0a" bottomColor="#1a1a2e" />
              )}
            </div>
          )}
          
          {/* Packs section */}
          {packs.length > 0 && (
            <div style={{ position: 'relative', overflow: 'visible' }}>
            <ProductsSection
              id="packs"
              title="Sample Packs"
              subtitle="Curated collections of high-quality sounds and samples"
              products={packs}
                fetchAllUrl="/api/products?category=pack&status=active&limit=100"
            />
              <WaveformTransition barCount={150} topColor="#1a1a2e" bottomColor="#06070f" />
            </div>
          )}
        </>
      )}
      
      {/* Pricing section */}
      <PricingSection />
      
      {/* FAQ section */}
      {/* <FAQSection /> */}
    </>
  );
}
