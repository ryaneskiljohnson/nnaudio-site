/**
 * @fileoverview Shared NNAudio Access authorization logic
 * Product grants + one-time Stripe purchases (individual products or bundles).
 * Bundles are expanded to constituent products.
 * @module utils/nnaudio-access/access
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- product_grants, products, bundles, bundle_products not in database.types.ts */

import { createSupabaseServiceRole } from "@/utils/supabase/service";
import Stripe from "stripe";

export interface AccessibleProductsResult {
  productIds: Set<string>;
  productToBundleMap: Map<string, string>;
}

export interface NnaudioAccessProfile {
  customer_id?: string | null;
  email?: string | null;
}

export interface GetAccessibleProductIdsOptions {
  /** Optional array to collect timing metrics (for products-full debugging) */
  timings?: { phase: string; ms: number }[];
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

function elapsed(start: number): number {
  return Math.round(Date.now() - start);
}

function pushTiming(
  timings: GetAccessibleProductIdsOptions["timings"],
  phase: string,
  start: number
): void {
  if (timings) timings.push({ phase, ms: elapsed(start) });
}

/**
 * @brief Validates Supabase auth token and returns user ID
 * @param token - JWT from Authorization header or form body
 * @returns { valid, userId } or { valid: false }
 */
export async function validateToken(
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
          getAll: () => [],
          setAll: () => {},
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return { valid: false };
    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("[NNAudio Access] Token validation error:", error);
    return { valid: false };
  }
}

/**
 * @brief Fetches all product IDs the user has access to
 * Sources: product grants + one-time Stripe purchases (individual or bundles).
 * Bundle purchases are expanded to constituent products.
 * @param userId - Supabase auth user ID
 * @param profile - User profile with customer_id and email
 * @param options - Optional timings array for performance debugging
 */
export async function getAccessibleProductIds(
  userId: string,
  profile: NnaudioAccessProfile,
  options?: GetAccessibleProductIdsOptions
): Promise<AccessibleProductsResult> {
  const timings = options?.timings;
  const productIds = new Set<string>();
  const productToBundleMap = new Map<string, string>();

  let t0 = Date.now();
  const adminSupabase = await createSupabaseServiceRole();
  pushTiming(timings, "createSupabaseServiceRole", t0);

  // Product grants (product_grants not in database.types.ts)
  t0 = Date.now();
  if (profile?.email) {
    const { data: productGrants } = await (adminSupabase as any)
      .from("product_grants")
      .select("product_id")
      .eq("user_email", profile.email.toLowerCase());

    (productGrants || []).forEach((g: { product_id: string }) => {
      if (g.product_id) productIds.add(g.product_id);
    });
  }
  pushTiming(timings, "product_grants", t0);

  // Stripe one-time purchases
  t0 = Date.now();
  const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();
  const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);

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
        .then((r) => r.data.forEach((pi) => allPaymentIntents.set(pi.id, pi)))
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
      .then((r) => r.data.forEach((pi) => allPaymentIntents.set(pi.id, pi)))
      .catch(() => {})
  );

  if (profile?.email) {
    stripePromises.push(
      withTimeout(stripe.customers.list({ email: profile.email, limit: 10 }), 5000)
        .then((customers) =>
          Promise.allSettled(
            customers.data.map((c) =>
              withTimeout(
                stripe.paymentIntents.list({ customer: c.id, limit: 100 }),
                5000
              ).then((r) =>
                r.data.forEach((pi) => allPaymentIntents.set(pi.id, pi))
              )
            )
          )
        )
        .catch(() => {})
    );
  }

  await Promise.allSettled(stripePromises);
  pushTiming(timings, "stripe_payment_intents", t0);

  const successfulPayments = Array.from(allPaymentIntents.values()).filter(
    (pi) => pi.status === "succeeded"
  );

  t0 = Date.now();
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
        isRefunded:
          charge.refunded || charge.amount_refunded === charge.amount,
      };
    } catch {
      return { pi, isRefunded: false };
    }
  });

  const refundResults = await Promise.allSettled(refundChecks);
  pushTiming(timings, "stripe_refund_checks", t0);

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

  // Expand bundles to individual products
  t0 = Date.now();
  const { data: allProductsCheck } = await (adminSupabase as any)
    .from("products")
    .select("id, slug, category")
    .in("id", productIdsArray)
    .eq("status", "active");

  const bundleProductIdsToExclude = new Set<string>();
  const bundleSlugs = new Set<string>();

  (allProductsCheck || []).forEach(
    (p: { id: string; category?: string; slug?: string }) => {
      if (p.category === "bundle") {
        bundleProductIdsToExclude.add(p.id);
        if (p.slug) bundleSlugs.add(p.slug);
      }
    }
  );

  if (bundleSlugs.size > 0) {
    const { data: bundles } = await (adminSupabase as any)
      .from("bundles")
      .select("id, slug, name")
      .in("slug", Array.from(bundleSlugs))
      .eq("status", "active");

    if (bundles?.length) {
      const bundleIds = bundles.map((b: { id: string }) => b.id);
      const bundleIdToName = new Map(
        bundles.map((b: { id: string; name: string }) => [b.id, b.name])
      );

      const { data: allBundleProducts } = await (adminSupabase as any)
        .from("bundle_products")
        .select("product_id, bundle_id")
        .in("bundle_id", bundleIds);

      (allBundleProducts || []).forEach(
        (bp: { product_id?: string; bundle_id?: string }) => {
          if (bp.product_id && bp.bundle_id) {
            productIds.add(bp.product_id);
            const name = bundleIdToName.get(bp.bundle_id);
            if (name) productToBundleMap.set(bp.product_id, name);
          }
        }
      );
    }
  }

  bundleProductIdsToExclude.forEach((id) => productIds.delete(id));
  pushTiming(timings, "bundles_expansion", t0);

  return { productIds, productToBundleMap };
}

type SupabaseClientLike = Awaited<ReturnType<typeof createSupabaseServiceRole>>;

/**
 * @brief Resolves product ID (UUID or legacy_product_id) to product UUID
 * @param supabase - Supabase client (anon or service role)
 * @param productId - UUID or legacy_product_id string
 * @returns Resolved UUID or null if not found
 */
export async function resolveProductId(
  supabase: SupabaseClientLike,
  productId: string
): Promise<string | null> {
  const client = supabase as any;
  const { data: byId } = await client
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("status", "active")
    .single();

  if (byId?.id) return byId.id;

  const { data: byLegacy } = await client
    .from("products")
    .select("id")
    .eq("legacy_product_id", productId)
    .eq("status", "active")
    .single();

  return byLegacy?.id ?? null;
}
