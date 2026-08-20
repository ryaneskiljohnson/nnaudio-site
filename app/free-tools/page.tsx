/**
 * @fileoverview Dedicated free tools landing page for acquisition campaigns and
 * free-to-paid email/retargeting flows.
 * @module app/free-tools/page
 */

import { Metadata } from "next";
import FreeToolsLandingPage from "@/components/pages/FreeToolsLandingPage";
import { getFreeProducts } from "@/utils/catalog";

export const metadata: Metadata = {
  title: "Free tools. In the session today. | NN Audio",
  description:
    "FreeQ, Freelay, Freeverb, Sterfreeo, Cowboy Harp. No card. NNAudio Access: download, install, update, library.",
  openGraph: {
    title: "Free tools. In the session today. | NN Audio",
    description:
      "FreeQ, Freelay, Freeverb, Sterfreeo, Cowboy Harp. No card. NNAudio Access: download, install, update, library.",
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
