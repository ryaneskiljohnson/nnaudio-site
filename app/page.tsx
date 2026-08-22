/**
 * @fileoverview Homepage server entry. Counts orbit catalog products so the
 * hero support line is already "73+" in the first HTML, then hydrates the
 * client homepage with that count.
 * @module app/page
 */

import HomePageClient from "./HomePageClient";
import { getHomepageHeroProductCount } from "@/lib/homepage-hero-count";

/** Refresh the painted catalog count about once an hour. */
export const revalidate = 3600;

/**
 * @brief Renders the public homepage with a server-seeded hero product count.
 * @returns The client homepage tree.
 */
export default async function Home() {
  const initialProductCount = await getHomepageHeroProductCount();
  return <HomePageClient initialProductCount={initialProductCount} />;
}
