/**
 * @fileoverview Shared public catalog queries for server-rendered category and
 * landing pages.
 * @module utils/catalog
 */

"use server";

import { createAdminClient } from "@/utils/supabase/service";

/**
 * @brief Product shape used by public catalog pages.
 */
export interface CatalogProduct {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  sale_price: number | null;
  featured_image_url: string | null;
  logo_url: string | null;
  created_at: string | null;
  average_rating?: number;
}

const PUBLIC_PRODUCT_SELECT = `
  id,
  name,
  slug,
  tagline,
  short_description,
  description,
  category,
  price,
  sale_price,
  featured_image_url,
  logo_url,
  created_at
`;

/**
 * @brief Loads active public products by category.
 * @param categories - Product categories to include.
 * @returns Array of active catalog products.
 */
export async function getActiveProductsByCategories(
  categories: string[]
): Promise<CatalogProduct[]> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await (supabase as any)
      .from("products")
      .select(PUBLIC_PRODUCT_SELECT)
      .eq("status", "active")
      .in("category", categories)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading category products:", error);
      return [];
    }

    return (data ?? []) as CatalogProduct[];
  } catch (error) {
    console.error("Error loading category products:", error);
    return [];
  }
}

/**
 * @brief Loads all active free products used for top-of-funnel acquisition.
 * @returns Array of free active products.
 */
export async function getFreeProducts(): Promise<CatalogProduct[]> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await (supabase as any)
      .from("products")
      .select(PUBLIC_PRODUCT_SELECT)
      .eq("status", "active")
      .or("price.eq.0,sale_price.eq.0")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading free products:", error);
      return [];
    }

    return (data ?? []) as CatalogProduct[];
  } catch (error) {
    console.error("Error loading free products:", error);
    return [];
  }
}
