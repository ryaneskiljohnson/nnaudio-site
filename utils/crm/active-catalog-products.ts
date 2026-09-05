/**
 * @fileoverview Shared active-catalog lookup so CRM product counts match the products dialog.
 * @module utils/crm/active-catalog-products
 */

import { chunkIds } from "@/utils/supabase/in-chunks";

/**
 * @brief Product row shown in the admin owned-products dialog.
 */
export type ActiveCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  featured_image_url: string | null;
};

/**
 * @brief Loads active catalog rows for the given product ids.
 * @param supabase Service-role (or admin) client.
 * @param productIds Owned product ids (grants + purchases, bundles already expanded).
 * @returns Active catalog products only, matching GET /api/admin/user-products.
 * @example
 * const products = await fetchActiveCatalogProducts(supabase, [...productIds]);
 */
export async function fetchActiveCatalogProducts(
  supabase: { from: (table: string) => any },
  productIds: Iterable<string>
): Promise<ActiveCatalogProduct[]> {
  const ids = [...new Set(Array.from(productIds).filter(Boolean))];
  if (ids.length === 0) {
    return [];
  }

  const rows: ActiveCatalogProduct[] = [];
  for (const chunk of chunkIds(ids)) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, featured_image_url")
      .in("id", chunk)
      .eq("status", "active");
    if (error) {
      throw new Error(error.message || "Failed to fetch active catalog products");
    }
    if (data?.length) {
      rows.push(...data);
    }
  }
  return rows;
}
