"use client";

/**
 * @fileoverview Viewport-lazy homepage sections below the catalog grid.
 * Featured/free hydrate ProductCard + cart only when near view. Pricing
 * mounts AuthProvider in the same window so useAuth cannot throw.
 * The waveform seam is desktop-only — phones skip that chunk so the
 * Cymasphere hero is not compositing 150 animated bars.
 * @module components/sections/HomeBelowFold
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ViewportLazy from "@/components/common/ViewportLazy";
import type { HomepageCard, HomepageCatalogSeed } from "@/lib/homepage-hero-seed";

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

const FeaturedProductsSection = dynamic(
  () => import("@/components/sections/FeaturedProductsSection"),
  { ssr: false }
);

const FreeCollectionSection = dynamic(
  () => import("@/components/sections/FreeCollectionSection"),
  { ssr: false }
);

const PricingSection = dynamic(
  () => import("@/components/sections/PricingSection"),
  { ssr: false }
);

const FAQSection = dynamic(() => import("@/components/sections/FAQSection"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "600px", background: "#0a0a0a" }} />,
});

const HomepageCartIsland = dynamic(
  () => import("@/components/sections/HomepageCartIsland"),
  { ssr: false }
);

const HomepageAuthIsland = dynamic(
  () => import("@/components/sections/HomepageAuthIsland"),
  { ssr: false }
);

/**
 * @brief Deferred homepage body after the hero and catalog tiles.
 * @param seed Server catalog snapshot.
 * @param cymasynth CymaSynth card for the spotlight, if present.
 * @param freeProducts Free-tools cards.
 * @returns Lazy sections.
 */
export default function HomeBelowFold({
  seed,
  cymasynth,
  freeProducts,
}: {
  seed: HomepageCatalogSeed;
  cymasynth: HomepageCard | null;
  freeProducts: HomepageCard[];
}) {
  const hasCartSections =
    seed.featured.length > 0 || freeProducts.length > 0;
  const [showWaveform, setShowWaveform] = useState(false);
  useEffect(() => {
    setShowWaveform(
      !window.matchMedia("(max-width: 900px), (pointer: coarse)").matches
    );
  }, []);

  return (
    <>
      {showWaveform ? (
        <ViewportLazy minHeight={0} rootMargin="80px 0px">
          <WaveformTransition
            barCount={150}
            topColor="#080911"
            bottomColor="#080911"
          />
        </ViewportLazy>
      ) : null}

      <ViewportLazy minHeight={640}>
        <CymasphereSpotlight
          price={seed.cymasphere.price}
          salePrice={seed.cymasphere.salePrice}
        />
      </ViewportLazy>
      <ViewportLazy minHeight={640}>
        <CymasynthSpotlight product={cymasynth} />
      </ViewportLazy>

      {hasCartSections ? (
        <ViewportLazy minHeight={520}>
          <HomepageCartIsland>
            {seed.featured.length > 0 ? (
              <FeaturedProductsSection
                id="featured"
                eyebrow="Best Sellers"
                title="Where most people start"
                products={seed.featured}
              />
            ) : null}
            {freeProducts.length > 0 ? (
              <ViewportLazy minHeight={520}>
                <FreeCollectionSection products={freeProducts} />
              </ViewportLazy>
            ) : null}
          </HomepageCartIsland>
        </ViewportLazy>
      ) : null}

      <ViewportLazy minHeight={480}>
        <HomepageAuthIsland>
          <PricingSection />
        </HomepageAuthIsland>
      </ViewportLazy>
      <ViewportLazy minHeight={600}>
        <FAQSection />
      </ViewportLazy>
    </>
  );
}
