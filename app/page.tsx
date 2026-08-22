/**
 * @fileoverview Homepage server entry. Seeds catalog counts, thumbs,
 * featured cards, and Cymasphere pricing so first HTML can paint the
 * hero line and category grid without waiting on client fetches.
 * @module app/page
 */

import HomePageClient from "./HomePageClient";
import { getHomepageCatalogSeed } from "@/lib/homepage-catalog-seed.server";

/** Refresh the painted catalog snapshot about once an hour. */
export const revalidate = 3600;

/**
 * @brief Renders the public homepage with a server-seeded catalog snapshot.
 * @returns The client homepage tree.
 */
export default async function Home() {
  const seed = await getHomepageCatalogSeed();
  return <HomePageClient seed={seed} />;
}
