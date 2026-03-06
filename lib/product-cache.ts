/**
 * @fileoverview In-memory cache for NNAudio Access user products
 * Used by products-full endpoint. Exposes invalidation for webhooks.
 * @module lib/product-cache
 */

export interface ProductFullResponse {
  success: boolean;
  products: ProductFullItem[];
  cache_version: string;
}

export interface ProductFullItem {
  product_id: string;
  product_uuid: string;
  product_name: string;
  image_url: string | null;
  version: string | null;
  bundle_name: string | null;
  /** Plugin bundle name (no extension) for Application Support/AppData folder; used by NNAudio Access for sample library linking */
  plugin_bundle_name: string | null;
  /** For NNAudio Access filter UI: product category (Instrument Plugins, Packs, etc.) - never bundle name */
  product_type: string | null;
  /** Short product tagline for display in product list/card */
  tagline: string | null;
  downloads: DownloadItem[];
}

export interface DownloadItem {
  file: string;
  name: string;
  type: string;
  version: string | null;
  file_size: number | null;
}

const userProductCache = new Map<
  string,
  { data: ProductFullResponse; expires: number }
>();
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * @brief Get cached products for a user
 * @returns Cached data if valid, null if miss or expired
 */
export function getUserProductCache(
  userId: string
): ProductFullResponse | null {
  const cached = userProductCache.get(userId);
  if (!cached || cached.expires <= Date.now()) return null;
  return cached.data;
}

/**
 * @brief Set cached products for a user
 */
export function setUserProductCache(
  userId: string,
  data: ProductFullResponse
): void {
  userProductCache.set(userId, {
    data,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * @brief Invalidate cache for a user (e.g. after purchase or grant)
 * Call from Stripe webhook or product grant creation
 */
export function invalidateUserProductCache(userId: string): void {
  userProductCache.delete(userId);
}

/**
 * @brief Invalidate cache for user by email (looks up userId from profiles)
 * Use when only email is available (e.g. product grant creation)
 */
export async function invalidateUserProductCacheByEmail(
  email: string
): Promise<void> {
  const { createSupabaseServiceRole } = await import("@/utils/supabase/service");
  const supabase = await createSupabaseServiceRole();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();
  if (data?.id) {
    invalidateUserProductCache(data.id);
  }
}
