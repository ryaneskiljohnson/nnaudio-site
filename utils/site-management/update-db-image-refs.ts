/**
 * @fileoverview Updates image URL references in the database (products, bundles).
 * @module utils/site-management/update-db-image-refs
 *
 * Can replace .png/.jpg/.jpeg -> .webp (only safe when .webp files exist) or
 * .webp -> .png to revert broken links when storage still has .png.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_EXT_REGEX = /\.(png|jpeg|jpg)$/i;
const WEBP_EXT_REGEX = /\.webp$/i;

/**
 * Replaces .png/.jpg/.jpeg with .webp in a URL string.
 */
function toWebpUrl(url: string | null | undefined): string | null | undefined {
  if (url == null || typeof url !== "string") return url;
  if (!IMAGE_EXT_REGEX.test(url)) return url;
  return url.replace(IMAGE_EXT_REGEX, ".webp");
}

/**
 * Reverts .webp back to .png so links point at files that exist in storage.
 */
function toPngUrl(url: string | null | undefined): string | null | undefined {
  if (url == null || typeof url !== "string") return url;
  if (!WEBP_EXT_REGEX.test(url)) return url;
  return url.replace(WEBP_EXT_REGEX, ".png");
}

function transformUrl(
  url: string | null | undefined,
  revert: boolean
): string | null | undefined {
  return revert ? toPngUrl(url) : toWebpUrl(url);
}

/**
 * Recursively replace image extensions (direction depends on revert).
 */
function transformValue(
  value: string | string[] | null | undefined,
  revert: boolean
): string | string[] | null | undefined {
  if (value == null) return value;
  const fn = revert ? toPngUrl : toWebpUrl;
  if (Array.isArray(value)) {
    const out = value.map((item) =>
      typeof item === "string" ? (fn(item) ?? item) : item
    );
    return out.some((v, i) => v !== value[i]) ? out : value;
  }
  if (typeof value === "string") return fn(value) ?? value;
  return value;
}

export interface UpdateDbImageRefsResult {
  productsUpdated: number;
  bundlesUpdated: number;
  errors: string[];
}

/**
 * Updates all image URL columns in products and bundles.
 * @param supabase - Supabase client (service role recommended).
 * @param options.dryRun - If true, no rows are updated.
 * @param options.revert - If true, replace .webp -> .png (fix broken links when storage has .png).
 *                         If false, replace .png/.jpg/.jpeg -> .webp (only when .webp files exist).
 * @returns Counts of rows updated and any errors.
 */
export async function updateDbImageRefs(
  supabase: SupabaseClient,
  options: { dryRun?: boolean; revert?: boolean } = {}
): Promise<UpdateDbImageRefsResult> {
  const { dryRun = false, revert = false } = options;
  const result: UpdateDbImageRefsResult = {
    productsUpdated: 0,
    bundlesUpdated: 0,
    errors: [],
  };

  const client = supabase as any;

  try {
    const { data: products, error: productsError } = await client
      .from("products")
      .select("id, featured_image_url, logo_url, background_image_url, gallery_images");

    if (productsError) {
      result.errors.push(`products fetch: ${productsError.message}`);
      return result;
    }

    if (products && Array.isArray(products)) {
      for (const row of products) {
        const featured = transformUrl(row.featured_image_url, revert);
        const logo = transformUrl(row.logo_url, revert);
        const background = transformUrl(row.background_image_url, revert);
        const gallery = transformValue(row.gallery_images, revert);

        const changed =
          featured !== row.featured_image_url ||
          logo !== row.logo_url ||
          background !== row.background_image_url ||
          (Array.isArray(gallery) &&
            Array.isArray(row.gallery_images) &&
            gallery.some((v, i) => v !== row.gallery_images[i]));

        if (!changed) continue;

        result.productsUpdated++;

        if (!dryRun) {
          const updates: Record<string, unknown> = {};
          if (featured !== row.featured_image_url) updates.featured_image_url = featured;
          if (logo !== row.logo_url) updates.logo_url = logo;
          if (background !== row.background_image_url) updates.background_image_url = background;
          if (gallery !== row.gallery_images) updates.gallery_images = gallery;

          const { error: updateError } = await client
            .from("products")
            .update(updates)
            .eq("id", row.id);

          if (updateError) {
            result.errors.push(`products ${row.id}: ${updateError.message}`);
          }
        }
      }
    }

    const { data: bundles, error: bundlesError } = await client
      .from("bundles")
      .select("id, featured_image_url, logo_url, background_image_url, mosaic_image_url");

    if (bundlesError) {
      result.errors.push(`bundles fetch: ${bundlesError.message}`);
      return result;
    }

    if (bundles && Array.isArray(bundles)) {
      for (const row of bundles) {
        const featured = transformUrl(row.featured_image_url, revert);
        const logo = transformUrl(row.logo_url, revert);
        const background = transformUrl(row.background_image_url, revert);
        const mosaic = transformUrl(row.mosaic_image_url, revert);

        const changed =
          featured !== row.featured_image_url ||
          logo !== row.logo_url ||
          background !== row.background_image_url ||
          mosaic !== row.mosaic_image_url;

        if (!changed) continue;

        result.bundlesUpdated++;

        if (!dryRun) {
          const updates: Record<string, unknown> = {};
          if (featured !== row.featured_image_url) updates.featured_image_url = featured;
          if (logo !== row.logo_url) updates.logo_url = logo;
          if (background !== row.background_image_url) updates.background_image_url = background;
          if (mosaic !== row.mosaic_image_url) updates.mosaic_image_url = mosaic;

          const { error: updateError } = await client
            .from("bundles")
            .update(updates)
            .eq("id", row.id);

          if (updateError) {
            result.errors.push(`bundles ${row.id}: ${updateError.message}`);
          }
        }
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    return result;
  }
}
