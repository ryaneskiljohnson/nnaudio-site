/**
 * @fileoverview Dedicated free tools landing page for acquisition campaigns and
 * free-to-paid email/retargeting flows.
 * @module app/free-tools/page
 */

import { Metadata } from "next";
import FreeToolsLandingPage from "@/components/pages/FreeToolsLandingPage";
import { getFreeProducts } from "@/utils/catalog";

export const metadata: Metadata = {
  title: "Free Tools | NNAud.io",
  description:
    "Claim free plugins, free MIDI packs, and NNAudio Access from NNAud.io. Start with free tools, then grow into bundles and premium products.",
  openGraph: {
    title: "Free Tools | NNAud.io",
    description:
      "Claim free plugins, free MIDI packs, and NNAudio Access. Start with free tools, then grow into bundles and premium products.",
  },
};

/**
 * @brief Loads the free-tools acquisition page.
 * @returns Server-rendered free tools catalog page.
 */
export default async function FreeToolsPage() {
  const products = await getFreeProducts();

  return <FreeToolsLandingPage products={products} />;
}
