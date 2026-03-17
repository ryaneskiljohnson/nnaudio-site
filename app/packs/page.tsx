/**
 * @fileoverview Server-rendered packs catalog page with an interactive client
 * search and sort layer.
 * @module app/packs/page
 */

import { Metadata } from "next";
import CatalogPageClient from "@/components/products/CatalogPageClient";
import { getActiveProductsByCategories } from "@/utils/catalog";

export const metadata: Metadata = {
  title: "Packs | NNAud.io",
  description:
    "Browse MIDI packs and sample packs from NNAud.io, including free entry offers and bundle-ready production assets.",
};

/**
 * @brief Loads the public packs catalog.
 * @returns Server-rendered packs page.
 */
export default async function PacksPage() {
  const products = await getActiveProductsByCategories(["pack"]);

  return (
    <CatalogPageClient
      eyebrow="Packs Catalog"
      title="MIDI and sample packs built for faster ideas"
      subtitle="Explore melodic inspiration, rhythmic building blocks, and session-ready packs designed to keep the workflow moving."
      helperText="Start with free MIDI or go deeper into premium packs and bundles when you want more range, more speed, and more options."
      initialProducts={products}
    />
  );
}

