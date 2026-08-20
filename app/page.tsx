/**
 * @fileoverview Short NN Audio storefront. Three doors only. The Cymasphere
 * $199 lander lives at /product/cymasphere. Free tools live at /free-tools.
 * @module app/page
 */

import StorefrontHome from "@/components/sections/StorefrontHome";

/**
 * @brief Renders the three-door homepage with no manifesto or reprints.
 */
export default function Home() {
  return <StorefrontHome />;
}
