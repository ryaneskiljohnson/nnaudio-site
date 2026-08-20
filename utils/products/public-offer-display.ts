/**
 * @fileoverview Public catalog price display. Cymasphere is a locked $149
 * one-time offer — never advertise the CMS $499 list as a strikethrough.
 * @module utils/products/public-offer-display
 */

import {
  CYMASPHERE_PRICE_USD,
  isCymasphereSlug,
} from "@/lib/cymasphere-sales";

export interface PublicOfferProduct {
  slug?: string | null;
  price?: number | null;
  sale_price?: number | null;
  compareAtPrice?: number | null;
}

export interface PublicOfferDisplay {
  amount: number;
  compareAt: number | null;
  isFree: boolean;
}

function asMoney(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @brief Resolves the storefront price a visitor should see.
 * @returns Paid amount, optional compare-at, and free flag.
 */
export function getPublicOfferDisplay(
  product: PublicOfferProduct
): PublicOfferDisplay {
  if (isCymasphereSlug(product.slug)) {
    return {
      amount: CYMASPHERE_PRICE_USD,
      compareAt: null,
      isFree: false,
    };
  }

  const list = asMoney(product.price);
  const sale = product.sale_price;
  const saleSet = sale !== null && sale !== undefined;
  const saleAmount = saleSet ? asMoney(sale) : null;
  const isFree = saleAmount === 0 || (list === 0 && !saleSet);
  const amount = saleSet ? saleAmount! : list;

  const bundleCompare =
    product.compareAtPrice != null &&
    product.compareAtPrice > 0 &&
    product.compareAtPrice > amount
      ? product.compareAtPrice
      : null;

  const saleCompare =
    saleAmount != null && saleAmount > 0 && saleAmount < list ? list : null;

  const freeCompare = isFree && list > 0 ? list : null;

  return {
    amount,
    compareAt: bundleCompare ?? saleCompare ?? freeCompare,
    isFree,
  };
}
