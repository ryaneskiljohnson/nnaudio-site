/**
 * @fileoverview NN Audio homepage. Short product storefront: Cymasphere,
 * named free plugins, live catalog SKUs, quiet Access line.
 * @module app/page
 */

import StorefrontHome, {
  type StorefrontCatalogItem,
} from "@/components/sections/StorefrontHome";
import { isCymasphereSlug } from "@/lib/cymasphere-sales";
import {
  NNAUD_FREE_PLUGIN_HREFS,
  NNAUD_FREE_PLUGIN_NAMES,
} from "@/lib/free-tools";
import { PLUGIN_CATEGORIES } from "@/utils/catalog-taxonomy";
import {
  getActiveProductsByCategories,
  getFreeProducts,
  type CatalogProduct,
} from "@/utils/catalog";
import { getPublicProductBySlug } from "@/utils/products/get-public-product-by-slug";
import {
  applyCymasphereOfferPrices,
  getPublicOfferDisplay,
} from "@/utils/products/public-offer-display";

const NAMED_FREE_SLUGS = new Set(
  Object.values(NNAUD_FREE_PLUGIN_HREFS).map((href) =>
    href.slice("/product/".length)
  )
);

const SHOP_LIMIT = 8;

function isNamedFreeProduct(product: CatalogProduct): boolean {
  if (product.slug && NAMED_FREE_SLUGS.has(product.slug)) return true;
  const name = product.name.toLowerCase();
  return NNAUD_FREE_PLUGIN_NAMES.some((item) =>
    name.includes(item.toLowerCase())
  );
}

function toShopItems(products: CatalogProduct[]): StorefrontCatalogItem[] {
  const items: StorefrontCatalogItem[] = [];
  for (const product of products) {
    if (!product.slug || isCymasphereSlug(product.slug)) continue;
    if (isNamedFreeProduct(product)) continue;
    const offer = getPublicOfferDisplay(applyCymasphereOfferPrices(product));
    if (offer.isFree || offer.amount <= 0) continue;
    items.push({
      name: product.name,
      href: `/product/${product.slug}`,
      imageUrl: product.featured_image_url || product.logo_url,
      priceLabel: `$${offer.amount}`,
    });
    if (items.length >= SHOP_LIMIT) break;
  }
  return items;
}

/**
 * @brief Loads live catalog rows for the homepage storefront.
 */
export default async function Home() {
  let cymasphereImageUrl: string | undefined;
  let freeProducts: CatalogProduct[] = [];
  let catalogProducts: StorefrontCatalogItem[] = [];

  try {
    const [cymasphere, free, shopSource] = await Promise.all([
      getPublicProductBySlug("cymasphere"),
      getFreeProducts(),
      getActiveProductsByCategories([...PLUGIN_CATEGORIES, "pack"]),
    ]);
    cymasphereImageUrl =
      cymasphere?.featured_image_url || cymasphere?.logo_url || undefined;
    freeProducts = free;
    catalogProducts = toShopItems(shopSource);
  } catch {
    cymasphereImageUrl = undefined;
    freeProducts = [];
    catalogProducts = [];
  }

  return (
    <StorefrontHome
      cymasphereImageUrl={cymasphereImageUrl}
      freeProducts={freeProducts}
      catalogProducts={catalogProducts}
    />
  );
}
