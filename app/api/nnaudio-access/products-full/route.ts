/**
 * @fileoverview NNAudio Access products-full API endpoint
 * Returns all user-accessible products with full details (downloads, images, versions)
 * in a single request to eliminate N+1 query pattern from the desktop app.
 * @module nnaudio-access/products-full
 */

"use server";

import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import {
  getUserProductCache,
  setUserProductCache,
  type ProductFullResponse,
  type ProductFullItem,
  type DownloadItem,
} from "@/lib/product-cache";
import {
  validateToken,
  getAccessibleProductIds,
} from "@/utils/nnaudio-access/access";

function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

/**
 * @brief Maps product category (DB enum) to human-readable display name for filter UI
 * @param category - Raw category from products table (e.g. instrument-plugin, audio-fx-plugin)
 * @returns Human-readable label for NNAudio Access filter dropdown
 */
function categoryToDisplayName(category: string | null | undefined): string | null {
  if (!category || typeof category !== "string") return null;
  const map: Record<string, string> = {
    "instrument-plugin": "Instrument Plugins",
    "audio-fx-plugin": "FX Plugins",
    "midi-fx-plugin": "MIDI FX Plugins",
    pack: "Packs",
    application: "Applications",
    plugin: "Plugins",
    bundle: "Bundles",
  };
  return map[category] ?? category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @brief Returns elapsed ms since start, for timing logs */
function elapsed(start: number): number {
  return Math.round(Date.now() - start);
}

/**
 * @brief POST handler - returns all user products with full details in one response
 */
export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  const timings: { phase: string; ms: number }[] = [];

  try {
    const body = await request.formData();
    const token = body.get("token")?.toString() || "";

    let t0 = Date.now();
    const { valid, userId } = await validateToken(token);
    timings.push({ phase: "validateToken", ms: elapsed(t0) });
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    // Check cache first
    const cached = getUserProductCache(userId);
    if (cached) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[products-full] CACHE HIT total=${elapsed(requestStart)}ms`
        );
      }
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    t0 = Date.now();
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", userId)
      .single();
    timings.push({ phase: "profile_fetch", ms: elapsed(t0) });

    t0 = Date.now();
    const { productIds, productToBundleMap } = await getAccessibleProductIds(
      userId,
      profile || {},
      { timings }
    );
    timings.push({ phase: "getAccessibleProductIds_total", ms: elapsed(t0) });

    const productIdsArray = Array.from(productIds);
    if (productIdsArray.length === 0) {
      const response: ProductFullResponse = {
        success: true,
        products: [],
        cache_version: Date.now().toString(),
      };
      setUserProductCache(userId, response);
      const timingStr = timings
        .map((t) => `${t.phase}=${t.ms}ms`)
        .join(" | ");
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[products-full] CACHE MISS (0 products) total=${elapsed(requestStart)}ms | ${timingStr}`
        );
      }
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    t0 = Date.now();
    const adminSupabase = await createSupabaseServiceRole();
    // products table not in generated database.types - use type assertion (matches other routes)
    type ProductsQueryResult = { data: ProductRow[] | null; error: unknown };
    type ProductsClient = {
      from: (t: string) => {
        select: (s: string) => {
          in: (c: string, v: string[]) => {
            eq: (c: string, v: string) => Promise<ProductsQueryResult>;
          };
        };
      };
    };
    const { data: products, error: productsError } = await (
      adminSupabase as unknown as ProductsClient
    )
      .from("products")
      .select(
        "id, name, slug, featured_image_url, featured_image_url_png, legacy_product_id, downloads, download_version, category, tagline, short_description"
      )
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError || !products) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products-full] Error fetching products:", productsError);
      }
      return new Response(formatError("Unable to fetch products"), {
        status: 500,
      });
    }
    timings.push({ phase: "products_fetch", ms: elapsed(t0) });

    // Collect unique storage paths that need signed URLs (single batch call)
    const pathsToSign = Array.from(
      new Set(
        (products ?? []).flatMap((product) =>
          (product.downloads || [])
            .map((d) => d.path)
            .filter(
              (path): path is string =>
                !!path && !path.startsWith("http")
            )
        )
      )
    );

    // Single batch call instead of N sequential createSignedUrl calls
    const pathToSignedUrl = new Map<string, string>();
    t0 = Date.now();
    if (pathsToSign.length > 0) {
      try {
        const { data: signedResults } = await adminSupabase.storage
          .from("product-downloads")
          .createSignedUrls(pathsToSign, 3600);

        if (signedResults && Array.isArray(signedResults)) {
          for (const result of signedResults) {
            if (
              result?.path &&
              result.signedUrl &&
              !result.error
            ) {
              pathToSignedUrl.set(result.path, result.signedUrl);
            }
          }
        }
      } catch {
        // Fallback: individual downloads will use path; client may need to retry
      }
    }
    timings.push({
      phase: `createSignedUrls(${pathsToSign.length} paths)`,
      ms: elapsed(t0),
    });

    const formattedProducts: ProductFullItem[] = [];

    for (const product of products ?? []) {
      const downloadsWithUrls: DownloadItem[] = [];

      if (product.downloads && Array.isArray(product.downloads)) {
        for (const download of product.downloads) {
          let fileUrl = download.path || download.url || "";
          if (download.path && !download.path.startsWith("http")) {
            fileUrl = pathToSignedUrl.get(download.path) || download.path;
          }

          downloadsWithUrls.push({
            file: fileUrl,
            name: download.name || product.name,
            type: download.type || "plugin",
            version: download.version || product.download_version || null,
            file_size: download.file_size ?? null,
          });
        }
      }

      const version =
        downloadsWithUrls[0]?.version || product.download_version || null;

      // Use PNG for NNAudio Access (macOS doesn't support WebP); fallback to webp/jpg
      const imageUrl =
        product.featured_image_url_png || product.featured_image_url || null;
      const bundleName = productToBundleMap.get(product.id) || null;
      // product_type: for filter UI - always from product.category, never bundle name or fallbacks
      const productType = categoryToDisplayName(product.category) || null;
      formattedProducts.push({
        product_id: product.legacy_product_id || product.id,
        product_uuid: product.id,
        product_name: product.name,
        image_url: imageUrl,
        version,
        bundle_name: bundleName,
        product_type: productType,
        tagline: (product as { tagline?: string | null; short_description?: string | null }).tagline ?? (product as { short_description?: string | null }).short_description ?? null,
        downloads: downloadsWithUrls,
      });
    }

    const response: ProductFullResponse = {
      success: true,
      products: formattedProducts,
      cache_version: Date.now().toString(),
    };

    setUserProductCache(userId, response);

    const totalMs = elapsed(requestStart);
    const timingStr = timings
      .map((t) => `${t.phase}=${t.ms}ms`)
      .join(" | ");
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[products-full] CACHE MISS total=${totalMs}ms | ${timingStr}`
      );
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[products-full] Error:", error);
    }
    return new Response(formatError("Unable to handle request"), {
      status: 500,
    });
  }
}

interface ProductRow {
  id: string;
  name: string;
  slug?: string;
  category?: string | null;
  featured_image_url?: string | null;
  featured_image_url_png?: string | null;
  legacy_product_id?: string | null;
  downloads?: Array<{
    path?: string;
    url?: string;
    name?: string;
    type?: string;
    version?: string;
    file_size?: number;
  }>;
  download_version?: string | null;
}
