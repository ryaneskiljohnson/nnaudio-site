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
import Stripe from "stripe";
import {
  getUserProductCache,
  setUserProductCache,
  type ProductFullResponse,
  type ProductFullItem,
  type DownloadItem,
} from "@/lib/product-cache";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

async function validateToken(
  token: string
): Promise<{ valid: boolean; userId?: string }> {
  try {
    if (!token) return { valid: false };

    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll(_cookiesToSet) {},
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { valid: false };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("[Token Validation] Error:", error);
    return { valid: false };
  }
}

/**
 * @brief Fetches all product IDs the user has access to
 * Uses same logic as /api/nnaudio-access/products
 */
async function getAccessibleProductIds(
  userId: string,
  profile: { customer_id?: string | null; email?: string | null }
): Promise<{
  productIds: Set<string>;
  productToBundleMap: Map<string, string>;
}> {
  const productIds = new Set<string>();
  const productToBundleMap = new Map<string, string>();
  const adminSupabase = await createSupabaseServiceRole();

  // Check individual product grants
  if (profile?.email) {
    const { data: productGrants } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
      .from("product_grants")
      .select("product_id")
      .eq("user_email", profile.email.toLowerCase());

    if (productGrants && Array.isArray(productGrants)) {
      productGrants.forEach((grant: { product_id: string }) => {
        if (grant.product_id) productIds.add(grant.product_id);
      });
    }
  }

  // Check NFR license and subscription (match product route for full access)
  const { data: profileFull } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
    .from("profiles")
    .select("subscription, email")
    .eq("id", userId)
    .single();

  const hasActiveSubscription =
    profileFull?.subscription && profileFull.subscription !== "none";

  if (profileFull?.email) {
    const { data: nfrData } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
      .from("user_management")
      .select("pro")
      .eq("user_email", profileFull.email.toLowerCase())
      .single();

    if (nfrData?.pro) {
      const { data: allProducts } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
        .from("products")
        .select("id")
        .eq("status", "active");
      if (allProducts) {
        allProducts.forEach((p: { id: string }) => productIds.add(p.id));
      }
    }
  }

  if (hasActiveSubscription) {
    const { data: allProducts } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
      .from("products")
      .select("id")
      .eq("status", "active");
    if (allProducts) {
      allProducts.forEach((p: { id: string }) => productIds.add(p.id));
    }
  }

  // Get Stripe purchases
  const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();
  const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  };

  const stripePromises: Promise<unknown>[] = [];

  if (profile?.customer_id) {
    stripePromises.push(
      withTimeout(
        stripe.paymentIntents.list({
          customer: profile.customer_id,
          limit: 100,
        }),
        5000
      )
        .then((result) => {
          result.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
        })
        .catch(() => {})
    );
  }

  stripePromises.push(
    withTimeout(
      stripe.paymentIntents.search({
        query: `metadata['user_id']:'${userId}'`,
        limit: 100,
      }),
      5000
    )
      .then((result) => {
        result.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
      })
      .catch(() => {})
  );

  if (profile?.email) {
    stripePromises.push(
      withTimeout(
        stripe.customers.list({ email: profile.email, limit: 10 }),
        5000
      )
        .then((customers) => {
          const customerPromises = customers.data.map((customer) =>
            withTimeout(
              stripe.paymentIntents.list({
                customer: customer.id,
                limit: 100,
              }),
              5000
            ).then((customerPayments) => {
              customerPayments.data.forEach((pi) =>
                allPaymentIntents.set(pi.id, pi)
              );
            })
          );
          return Promise.allSettled(customerPromises);
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(stripePromises);

  const successfulPayments = Array.from(allPaymentIntents.values()).filter(
    (pi) => pi.status === "succeeded"
  );

  const refundChecks = successfulPayments.map(async (pi) => {
    if (!pi.latest_charge) return { pi, isRefunded: false };
    try {
      const charge = await withTimeout(
        stripe.charges.retrieve(
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge.id
        ),
        3000
      );
      return {
        pi,
        isRefunded: charge.refunded || charge.amount_refunded === charge.amount,
      };
    } catch {
      return { pi, isRefunded: false };
    }
  });

  const refundResults = await Promise.allSettled(refundChecks);
  for (const result of refundResults) {
    if (result.status === "rejected") continue;
    const { pi, isRefunded } = result.value;
    if (isRefunded) continue;

    try {
      const cartItemsStr = pi.metadata?.cart_items;
      if (cartItemsStr) {
        const items = JSON.parse(cartItemsStr);
        for (const item of items) {
          if (item.id) productIds.add(item.id);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  const productIdsArray = Array.from(productIds);
  if (productIdsArray.length === 0) {
    return { productIds, productToBundleMap };
  }

  // Exclude bundle products, expand to individual products
  const { data: allProductsCheck } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
    .from("products")
    .select("id, slug, category")
    .in("id", productIdsArray)
    .eq("status", "active");

  const bundleProductIdsToExclude = new Set<string>();
  const bundleSlugs = new Set<string>();

  (allProductsCheck || []).forEach(
    (product: { id: string; category?: string; slug?: string }) => {
      if (product.category === "bundle") {
        bundleProductIdsToExclude.add(product.id);
        if (product.slug) bundleSlugs.add(product.slug);
      }
    }
  );

  if (bundleSlugs.size > 0) {
    const { data: bundles } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
      .from("bundles")
      .select("id, slug, name")
      .in("slug", Array.from(bundleSlugs))
      .eq("status", "active");

    if (bundles) {
      for (const bundle of bundles) {
        const { data: bundleProducts } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
          .from("bundle_products")
          .select("product_id")
          .eq("bundle_id", (bundle as { id: string }).id);

        if (bundleProducts) {
          bundleProducts.forEach((bp: { product_id?: string }) => {
            if (bp.product_id) {
              productIds.add(bp.product_id);
              productToBundleMap.set(
                bp.product_id,
                (bundle as { name: string }).name
              );
            }
          });
        }
      }
    }
  }

  // Remove bundle product IDs from the set
  bundleProductIdsToExclude.forEach((id) => productIds.delete(id));

  return { productIds, productToBundleMap };
}

/**
 * @brief POST handler - returns all user products with full details in one response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const token = body.get("token")?.toString() || "";

    const { valid, userId } = await validateToken(token);
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    // Check cache first
    const cached = getUserProductCache(userId);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", userId)
      .single();

    const { productIds, productToBundleMap } = await getAccessibleProductIds(
      userId,
      profile || {}
    );

    const productIdsArray = Array.from(productIds);
    if (productIdsArray.length === 0) {
      const response: ProductFullResponse = {
        success: true,
        products: [],
        cache_version: Date.now().toString(),
      };
      setUserProductCache(userId, response);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const adminSupabase = await createSupabaseServiceRole();

    const { data: products, error: productsError } = await (adminSupabase as Awaited<ReturnType<typeof createSupabaseServiceRole>>)
      .from("products")
      .select(
        "id, name, slug, featured_image_url, legacy_product_id, downloads, download_version"
      )
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError || !products) {
      console.error("[products-full] Error fetching products:", productsError);
      return new Response(formatError("Unable to fetch products"), {
        status: 500,
      });
    }

    const formattedProducts: ProductFullItem[] = [];

    for (const product of products as ProductRow[]) {
      const downloadsWithUrls: DownloadItem[] = [];

      if (product.downloads && Array.isArray(product.downloads)) {
        for (const download of product.downloads) {
          let fileUrl = download.path || download.url || "";
          if (download.path && !download.path.startsWith("http")) {
            try {
              const { data: signedUrlData } = await adminSupabase.storage
                .from("product-downloads")
                .createSignedUrl(download.path, 3600);
              fileUrl = signedUrlData?.signedUrl || download.path;
            } catch {
              // Fallback to path
            }
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

      formattedProducts.push({
        product_id: product.legacy_product_id || product.id,
        product_uuid: product.id,
        product_name: product.name,
        image_url: product.featured_image_url || null,
        version,
        bundle_name: productToBundleMap.get(product.id) || null,
        downloads: downloadsWithUrls,
      });
    }

    const response: ProductFullResponse = {
      success: true,
      products: formattedProducts,
      cache_version: Date.now().toString(),
    };

    setUserProductCache(userId, response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[products-full] Error:", error);
    return new Response(formatError("Unable to handle request"), {
      status: 500,
    });
  }
}

interface ProductRow {
  id: string;
  name: string;
  slug?: string;
  featured_image_url?: string | null;
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
