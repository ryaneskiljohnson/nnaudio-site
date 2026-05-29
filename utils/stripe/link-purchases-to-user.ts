/**
 * @fileoverview Links Stripe purchase history to a Supabase user by exact email match.
 * @module utils/stripe/link-purchases-to-user
 */

import type Stripe from "stripe";
import { invalidateUserProductCache } from "@/lib/product-cache";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { stripe } from "@/utils/stripe/client";

export interface LinkPurchasesToUserByEmailParams {
  /** Supabase auth / profiles id */
  userId: string;
  /** Account email (must match purchase email for auto-link) */
  email: string;
  /** Stripe customer id from signup metadata, when already resolved */
  preferredCustomerId?: string | null;
}

export interface LinkPurchasesToUserByEmailResult {
  linked: boolean;
  canonicalCustomerId: string | null;
  matchedCustomerCount: number;
  paymentIntentsUpdated: number;
  grantsUpdated: number;
  reviewFollowupsUpdated: number;
}

/**
 * @brief Normalizes an email for purchase ↔ account matching.
 * @param email Raw email string.
 * @returns Lowercase trimmed email or empty string.
 */
export function normalizePurchaseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * @brief Returns Stripe customers whose email exactly matches (case-insensitive).
 * @param normalizedEmail Already normalized email.
 * @returns Stripe customers with matching email.
 */
async function listStripeCustomersByExactEmail(
  normalizedEmail: string
): Promise<Stripe.Customer[]> {
  const list = await stripe.customers.list({ email: normalizedEmail, limit: 10 });
  return list.data.filter(
    (c) => normalizePurchaseEmail(c.email ?? "") === normalizedEmail
  );
}

/**
 * @brief Counts succeeded payment intents for a Stripe customer.
 * @param customerId Stripe customer id.
 * @returns Number of succeeded payment intents (capped at list limit).
 */
async function countSucceededPaymentIntents(customerId: string): Promise<number> {
  const result = await stripe.paymentIntents.list({
    customer: customerId,
    limit: 100,
  });
  return result.data.filter((pi) => pi.status === "succeeded").length;
}

/**
 * @brief Picks the canonical Stripe customer for a user among email-matched customers.
 * @param matchedCustomers Customers with exact email match.
 * @param preferredCustomerId Signup-resolved customer id, if any.
 * @param existingProfileCustomerId Current profiles.customer_id, if any.
 * @returns Canonical Stripe customer id or null.
 */
async function pickCanonicalCustomerId(
  matchedCustomers: Stripe.Customer[],
  preferredCustomerId: string | null | undefined,
  existingProfileCustomerId: string | null | undefined
): Promise<string | null> {
  if (matchedCustomers.length === 0) {
    return preferredCustomerId ?? null;
  }

  const ids = new Set(matchedCustomers.map((c) => c.id));

  if (preferredCustomerId && ids.has(preferredCustomerId)) {
    return preferredCustomerId;
  }

  if (existingProfileCustomerId && ids.has(existingProfileCustomerId)) {
    return existingProfileCustomerId;
  }

  let bestId = matchedCustomers[0].id;
  let bestCount = await countSucceededPaymentIntents(bestId);

  for (const customer of matchedCustomers.slice(1)) {
    const count = await countSucceededPaymentIntents(customer.id);
    if (count > bestCount) {
      bestCount = count;
      bestId = customer.id;
    }
  }

  return bestId;
}

/**
 * @brief Backfills PaymentIntent metadata.user_id for email-matched customers.
 * @param userId Supabase user id.
 * @param customerIds Stripe customer ids to scan.
 * @returns Count of payment intents updated.
 */
async function backfillPaymentIntentUserIds(
  userId: string,
  customerIds: string[]
): Promise<number> {
  let updated = 0;

  for (const customerId of customerIds) {
    const list = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    for (const pi of list.data) {
      const current = pi.metadata?.user_id;
      if (current && current !== "anonymous") {
        continue;
      }

      await stripe.paymentIntents.update(pi.id, {
        metadata: {
          ...pi.metadata,
          user_id: userId,
        },
      });
      updated += 1;
    }
  }

  return updated;
}

/**
 * @brief Links Stripe customers and purchase history to a user account by email.
 * @param params User id, email, and optional preferred Stripe customer id.
 * @returns Summary of linking actions performed.
 * @note Idempotent — safe to call on signup, email confirm, and login.
 * @example
 * await linkPurchasesToUserByEmail({
 *   userId: "uuid",
 *   email: "buyer@example.com",
 *   preferredCustomerId: "cus_123",
 * });
 */
export async function linkPurchasesToUserByEmail(
  params: LinkPurchasesToUserByEmailParams
): Promise<LinkPurchasesToUserByEmailResult> {
  const normalizedEmail = normalizePurchaseEmail(params.email);
  const emptyResult: LinkPurchasesToUserByEmailResult = {
    linked: false,
    canonicalCustomerId: null,
    matchedCustomerCount: 0,
    paymentIntentsUpdated: 0,
    grantsUpdated: 0,
    reviewFollowupsUpdated: 0,
  };

  if (!normalizedEmail || !params.userId) {
    return emptyResult;
  }

  const adminSupabase = await createSupabaseServiceRole();

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("customer_id")
    .eq("id", params.userId)
    .maybeSingle();

  let matchedCustomers = await listStripeCustomersByExactEmail(normalizedEmail);

  if (params.preferredCustomerId) {
    const preferredInList = matchedCustomers.some(
      (c) => c.id === params.preferredCustomerId
    );
    if (!preferredInList) {
      try {
        const preferred = await stripe.customers.retrieve(params.preferredCustomerId);
        if (
          typeof preferred === "object" &&
          !preferred.deleted &&
          normalizePurchaseEmail(preferred.email ?? "") === normalizedEmail
        ) {
          matchedCustomers = [...matchedCustomers, preferred];
        }
      } catch {
        // ignore invalid preferred id
      }
    }
  }

  const canonicalCustomerId = await pickCanonicalCustomerId(
    matchedCustomers,
    params.preferredCustomerId,
    profile?.customer_id ?? null
  );

  if (!canonicalCustomerId) {
    return emptyResult;
  }

  if (!profile?.customer_id) {
    await adminSupabase
      .from("profiles")
      .update({ customer_id: canonicalCustomerId, updated_at: new Date().toISOString() })
      .eq("id", params.userId);
  }

  try {
    const canonical = await stripe.customers.retrieve(canonicalCustomerId);
    if (typeof canonical === "object" && !canonical.deleted) {
      await stripe.customers.update(canonicalCustomerId, {
        metadata: {
          ...canonical.metadata,
          user_id: params.userId,
        },
      });
    }
  } catch (error) {
    console.error("[linkPurchasesToUserByEmail] Failed to update customer metadata:", error);
  }

  const customerIds = [
    ...new Set([
      ...matchedCustomers.map((c) => c.id),
      canonicalCustomerId,
    ]),
  ];

  const paymentIntentsUpdated = await backfillPaymentIntentUserIds(
    params.userId,
    customerIds
  );

  const { data: grantRows } = await (adminSupabase as any)
    .from("product_grants")
    .update({
      user_id: params.userId,
      updated_at: new Date().toISOString(),
    })
    .is("user_id", null)
    .ilike("user_email", normalizedEmail)
    .select("id");

  const grantsUpdated = grantRows?.length ?? 0;

  const { data: followupRows } = await (adminSupabase as any)
    .from("review_followups")
    .update({
      user_id: params.userId,
      updated_at: new Date().toISOString(),
    })
    .is("user_id", null)
    .ilike("customer_email", normalizedEmail)
    .select("id");

  const reviewFollowupsUpdated = followupRows?.length ?? 0;

  invalidateUserProductCache(params.userId);

  return {
    linked: true,
    canonicalCustomerId,
    matchedCustomerCount: matchedCustomers.length,
    paymentIntentsUpdated,
    grantsUpdated,
    reviewFollowupsUpdated,
  };
}
