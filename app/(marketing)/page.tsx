/**
 * @fileoverview Homepage server entry. Seeds the catalog and paints an
 * RSC page: hero client island, static category tiles, then viewport-lazy
 * shop sections.
 * @module app/(marketing)/page
 */

import EcosystemHero from "@/components/sections/EcosystemHero";
import HomeBelowFold from "@/components/sections/HomeBelowFold";
import MarketingCategoryGrid from "@/components/sections/MarketingCategoryGrid";
import { getHomepageCatalogSeed } from "@/lib/homepage-catalog-seed.server";
import {
  homepageCategoryTiles,
  seedRowToCard,
} from "@/lib/homepage-hero-seed";

/** Refresh the painted catalog snapshot about once an hour. */
export const revalidate = 3600;

/**
 * @brief Public homepage from the server catalog snapshot.
 * @returns RSC tree with a hero island.
 */
export default async function Home() {
  const seed = await getHomepageCatalogSeed();
  const instruments = seed.heroTour.instruments.map(seedRowToCard);
  const effects = seed.heroTour.effects.map(seedRowToCard);
  const packs = seed.heroTour.packs.map(seedRowToCard);
  const midiFx = seed.heroTour.midiFx.map(seedRowToCard);
  const freeProducts = seed.freeProducts.map(seedRowToCard);
  const cymasphereProduct = seed.cymasphereProduct
    ? seedRowToCard(seed.cymasphereProduct)
    : null;
  const cymasynth = instruments.find((p) => p.slug === "cymasynth") || null;

  return (
    <>
      <EcosystemHero
        cymasphere={cymasphereProduct}
        instruments={instruments}
        effects={effects}
        packs={packs}
        midiFx={midiFx}
        productCount={seed.productCount}
      />
      <MarketingCategoryGrid categories={homepageCategoryTiles(seed)} />
      <HomeBelowFold
        seed={seed}
        cymasynth={cymasynth}
        freeProducts={freeProducts}
      />
    </>
  );
}
