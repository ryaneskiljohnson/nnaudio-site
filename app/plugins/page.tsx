/**
 * @fileoverview Server-rendered plugins catalog page with an interactive client
 * search and sort layer.
 * @module app/plugins/page
 */

import { Metadata } from "next";
import CatalogPageClient from "@/components/products/CatalogPageClient";
import { getActiveProductsByCategories } from "@/utils/catalog";
import { PLUGIN_CATEGORIES } from "@/utils/catalog-taxonomy";

export const metadata: Metadata = {
  title: "Plugins | NNAud.io",
  description:
    "Browse NNAud.io plugins, from free utilities to flagship instruments and effects for modern producers.",
};

/**
 * @brief Loads the public plugins catalog (Audio FX, Instruments, MIDI FX, and legacy plugin).
 * @returns Server-rendered plugins page.
 */
export default async function PluginsPage() {
  const products = await getActiveProductsByCategories(PLUGIN_CATEGORIES);

  return (
    <CatalogPageClient
      eyebrow="Plugin Catalog"
      title="Plugins that earn a place in your sessions"
      subtitle="From quick creative utilities to deeper instruments and effects, this is the heart of the NNAudio plugin catalog."
      helperText="Browse free and premium plugins built for sound design, inspiration, workflow, and musical momentum."
      initialProducts={products}
    />
  );
}

