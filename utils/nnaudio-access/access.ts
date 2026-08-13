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
import { requireUuid } from "@/utils/validation";
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
  // Prefer the authoritative auth.users email over profiles.email, which is
  // user-writable and therefore must not be trusted for entitlement lookups.
  const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
  if (!error && data.user?.email) {
    const e = data.user.email.trim().toLowerCase();
    if (e.length > 0) return e;
  }

  // Fall back to profile email only if the auth lookup failed.
  const fromProfile = profileEmail?.trim().toLowerCase();
  return fromProfile && fromProfile.length > 0 ? fromProfile : null;
}

/**
 * @brief Loads product_ids from product_grants by `user_id` and/or normalized email (deduped).
 * @param adminSupabase Service-role Supabase client
 * @param userId Auth user id
 * @param grantEmail Normalized grant email or null
 * @returns Set of product UUIDs from grant rows
 */
export async function fetchProductGrantIdsForUser(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  grantEmail: string | null
): Promise<Set<string>> {
  const ids = new Set<string>();
  const client = adminSupabase as any;

  const [byUid, byEmail] = await Promise.all([
    client.from("product_grants").select("product_id").eq("user_id", userId),
    grantEmail
      ? client
          .from("product_grants")
          .select("product_id")
          .eq("user_email", grantEmail)
      : Promise.resolve({ data: [] as { product_id: string }[] }),
  ]);

  for (const row of [...(byUid.data ?? []), ...(byEmail.data ?? [])]) {
    if (row.product_id) ids.add(row.product_id);
  }
  return ids;
}

/**
 * @brief Loads payment intents from Stripe customers that match `grantEmail` with a trust check,
 *   and persists `profiles.customer_id` when the profile has none (self-heal).
 */
async function mergePaymentIntentsFromTrustedStripeCustomersByEmail(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  grantEmail: string,
  profileHasCustomerId: boolean,
  allPaymentIntents: Map<string, Stripe.PaymentIntent>,
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number) => Promise<T>
): Promise<void> {
  const list = await withTimeout(
    stripe.customers.list({ email: grantEmail, limit: 10 }),
    5000
  ).catch(() => ({ data: [] as Stripe.Customer[] }));

  const trusted = list.data.filter(
    (c) => c.email?.trim().toLowerCase() === grantEmail
  );

  if (trusted.length === 0) {
    return;
  }

  let wroteCustomerId = profileHasCustomerId;
  for (const chosen of trusted) {
    if (!wroteCustomerId && chosen.id) {
      const { error } = await adminSupabase
        .from("profiles")
        .update({ customer_id: chosen.id })
        .eq("id", userId);
      if (!error) {
        wroteCustomerId = true;
      }
    }

    const r = await withTimeout(
      stripe.paymentIntents.list({
        customer: chosen.id,
        limit: 100,
        expand: ["data.latest_charge"],
      }),
      5000
    ).catch(() => null);
    r?.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
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

  t0 = Date.now();
  const grantIdSet = await fetchProductGrantIdsForUser(
    adminSupabase,
    userId,
    grantEmail
  );
  grantIdSet.forEach((id) => productIds.add(id));
  pushTiming(timings, "product_grants", t0);

  // Stripe: merge payment intents from customer_id, metadata user_id, and customer email
  t0 = Date.now();
  const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();
  const safeUserId = requireUuid(userId);

  const stripeTasks: Promise<void>[] = [];

  if (profile?.customer_id) {
    stripeTasks.push(
      withTimeout(
        stripe.paymentIntents.list({
          customer: profile.customer_id,
          limit: 100,
          expand: ["data.latest_charge"],
        }),
        5000
      )
        .then((r) => {
          r.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
        })
        .catch(() => {})
    );
  }

  if (safeUserId) {
    stripeTasks.push(
      withTimeout(
        stripe.paymentIntents.search({
          query: `status:'succeeded' AND metadata['user_id']:'${safeUserId}'`,
          limit: 100,
          expand: ["data.latest_charge"],
        }),
        8000
      )
        .then((r) => {
          r.data.forEach((pi) => allPaymentIntents.set(pi.id, pi));
        })
        .catch(() => {})
    );
  }

  if (grantEmail) {
    stripeTasks.push(
      mergePaymentIntentsFromTrustedStripeCustomersByEmail(
        adminSupabase,
        userId,
        grantEmail,
        Boolean(profile?.customer_id),
        allPaymentIntents,
        withTimeout
      ).catch(() => {})
    );
  }

  await Promise.all(stripeTasks);
  pushTiming(timings, "stripe_payment_intents", t0);

  const successfulPayments = Array.from(allPaymentIntents.values()).filter(
    (pi) => pi.status === "succeeded"
  );

  t0 = Date.now();
  const refundChecks = successfulPayments.map(async (pi) => {
    const charge = pi.latest_charge;
    // Fail closed: if we cannot determine refund status, deny access rather
    // than grant it (a refunded/unknown charge must not unlock downloads).
    if (!charge) return { pi, isRefunded: true };
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
      // Could not verify refund status → fail closed (deny).
      return { pi, isRefunded: true };
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
    .in("id", productIdsArray);

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
      .in("slug", Array.from(bundleSlugs));

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
    .single();

  if (byId?.id) return byId.id;

  const { data: byLegacy } = await client
    .from("products")
    .select("id")
    .eq("legacy_product_id", productId)
    .single();

  return byLegacy?.id ?? null;
}
