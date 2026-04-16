/**
 * @fileoverview Shared NNAudio Access authorization logic
 * Product grants + one-time Stripe purchases (individual products or bundles).
 * Bundles are expanded to constituent products.
 * @module utils/nnaudio-access/access
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- product_grants, products, bundles, bundle_products not in database.types.ts */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/client";

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
 * @param token - JWT access token from the desktop app or plugin
 * @returns `{ valid, userId }` or `{ valid: false }`
 * @note Passes the JWT into `getUser(jwt)` so validation does not depend on a custom
 *   Authorization header + session (SSR clients may not treat that as a session).
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
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return { valid: false };
    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("[NNAudio Access] Token validation error:", error);
    return { valid: false };
  }
}

/**
 * @brief Resolves lowercase email for `product_grants.user_email` when `profiles.email` is empty.
 * @param adminSupabase Service-role client (for `auth.admin.getUserById`)
 * @param userId Supabase auth user id
 * @param profileEmail `profiles.email` when already loaded
 * @returns Normalized email or null
 */
export async function resolveGrantEmail(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  profileEmail: string | null | undefined
): Promise<string | null> {
  const fromProfile = profileEmail?.trim().toLowerCase();
  if (fromProfile) return fromProfile;

  const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  const e = data.user.email.trim().toLowerCase();
  return e.length > 0 ? e : null;
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

  const grantEmail = await resolveGrantEmail(
    adminSupabase,
    userId,
    profile?.email
  );

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

  // Run product_grants and Stripe in parallel (they don't depend on each other)
  const productGrantsPromise =
    grantEmail !== null
      ? (adminSupabase as any)
          .from("product_grants")
          .select("product_id")
          .eq("user_email", grantEmail)
      : Promise.resolve({ data: [] });

  // Single Stripe call: search by user_id in metadata (filters succeeded server-side)
  // All our payment flows set user_id when creating payment intents
  t0 = Date.now();
  const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();
  const stripeSearchPromise = withTimeout(
    stripe.paymentIntents.search({
      query: `status:'succeeded' AND metadata['user_id']:'${userId}'`,
      limit: 100,
      expand: ["data.latest_charge"],
    }),
    8000
  )
    .then((r) => r.data.forEach((pi) => allPaymentIntents.set(pi.id, pi)))
    .catch(() => {});

  const [productGrantsResult] = await Promise.all([
    productGrantsPromise,
    stripeSearchPromise,
  ]);
  pushTiming(timings, "product_grants", t0);
  pushTiming(timings, "stripe_payment_intents", t0);

  const { data: productGrants } = await productGrantsResult;
  (productGrants || []).forEach((g: { product_id: string }) => {
    if (g.product_id) productIds.add(g.product_id);
  });

  const successfulPayments = Array.from(allPaymentIntents.values()).filter(
    (pi) => pi.status === "succeeded"
  );

  t0 = Date.now();
  const refundChecks = successfulPayments.map(async (pi) => {
    const charge = pi.latest_charge;
    if (!charge) return { pi, isRefunded: false };
    const chargeObj =
      typeof charge === "object" && charge !== null ? charge : null;
    if (chargeObj) {
      return {
        pi,
        isRefunded:
          chargeObj.refunded || chargeObj.amount_refunded === chargeObj.amount,
      };
    }
    try {
      const retrieved = await withTimeout(
        stripe.charges.retrieve(typeof charge === "string" ? charge : charge.id),
        3000
      );
      return {
        pi,
        isRefunded:
          retrieved.refunded || retrieved.amount_refunded === retrieved.amount,
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
      const bundleIdToName = new Map<string, string>(
        (bundles as { id: string; name: string }[])
          .filter((b) => typeof b.name === "string")
          .map((b) => [b.id, b.name])
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
            if (typeof name === "string") {
              productToBundleMap.set(bp.product_id, name);
            }
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
