/**
 * @fileoverview Helpers for which `products` rows are shown in shop and commerce pickers.
 * @module lib/shopProductFilters
 */

/**
 * @brief Slug for the free NNAudio Access app — not sold; omit from default shop/reseller lists. Admin grant flows pass `include_nnaudio_access_product` on `/api/products` to include it.
 * @param row - Min product shape
 * @returns True if this is the NNAudio Access app product
 */
export function isNnaudioAccessProduct(row: { slug?: string | null; name?: string | null }): boolean {
  const s = (row.slug || "").toLowerCase();
  if (s === "nnaudio-access" || s.includes("nnaudio-access")) {
    return true;
  }
  const n = (row.name || "").toLowerCase();
  return n.includes("nnaudio access");
}

/**
 * @brief Drop the NNAudio Access app from catalog / picker lists
 * @param items - List of products
 * @returns New array without the non-sale app row
 */
export function excludeNnaudioAccessForCommerce<T extends { slug?: string | null; name?: string | null }>(
  items: T[]
): T[] {
  return items.filter((p) => !isNnaudioAccessProduct(p));
}
