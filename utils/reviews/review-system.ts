/**
 * @fileoverview Shared review submission, follow-up, and reward helpers.
 * @module utils/reviews/review-system
 */

import crypto from "crypto";
import Stripe from "stripe";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { stripe } from "@/utils/stripe/client";
import { sendEmail } from "@/utils/email";
import { createOneTimeDiscountCode } from "@/utils/stripe/actions";
import {
  buildReviewInviteEmailHtml,
  buildReviewInviteEmailText,
  buildReviewRewardEmailHtml,
  buildReviewRewardEmailText,
  type ReviewEmailProduct,
} from "@/utils/reviews/review-emails";
import { getPublicSiteUrlForEmail } from "@/utils/public-site-url";

const REVIEW_REWARD_AMOUNT_CENTS = 1000;
const REVIEW_REWARD_AMOUNT_LABEL = "$10 off";
const REVIEW_REWARD_DELAY_DAYS = 7;
const REVIEW_REWARD_EXPIRATION_DAYS = 30;

export interface RewardIssuanceResult {
  granted: boolean;
  promotionCode?: string;
  followupId?: string;
}

interface CustomerIdentity {
  email: string | null;
  name: string | null;
  stripeCustomerId: string | null;
}

interface ReviewFollowupRow {
  id: string;
  customer_email: string;
  invite_sent_at: string | null;
  is_refunded: boolean;
  payment_intent_id: string | null;
  purchased_product_ids: string[];
  reward_claimed_at: string | null;
  send_at: string;
  stripe_customer_id: string | null;
  user_id: string | null;
}

/**
 * @brief Normalizes an email address for lookups and inserts.
 * @param email Raw email string.
 * @returns Lowercased, trimmed email string.
 * @example
 * normalizeEmail(" Alex@Example.com ");
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * @brief Formats a display name from optional profile fields.
 * @param firstName Profile first name.
 * @param lastName Profile last name.
 * @returns Full name when available, otherwise null.
 * @example
 * buildDisplayName("Alex", "Keys");
 */
function buildDisplayName(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * @brief Generates a customer-specific review reward promotion code.
 * @returns Uppercase promotion code string.
 * @note The code is also restricted to the Stripe customer when possible.
 * @example
 * generateReviewRewardCode();
 */
function generateReviewRewardCode(): string {
  return `REVIEW${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * @brief Resolves an expiration timestamp for review reward promo codes.
 * @returns Unix timestamp in seconds.
 * @example
 * getRewardExpirationTimestamp();
 */
function getRewardExpirationTimestamp(): number {
  return Math.floor(Date.now() / 1000) + REVIEW_REWARD_EXPIRATION_DAYS * 24 * 60 * 60;
}

/**
 * @brief Resolves product IDs purchased through bundle metadata.
 * @param bundleId Bundle UUID from Stripe metadata.
 * @param bundleSlug Bundle slug fallback from Stripe metadata.
 * @returns Expanded constituent product UUIDs.
 * @note Bundle purchases should reward reviews for constituent products, not only the bundle container.
 * @example
 * await expandBundleProductIds("bundle-uuid", "starter-pack");
 */
async function expandBundleProductIds(
  bundleId?: string | null,
  bundleSlug?: string | null
): Promise<string[]> {
  const adminSupabase = await createSupabaseServiceRole();

  let resolvedBundleId = bundleId ?? null;
  if (!resolvedBundleId && bundleSlug) {
    const { data: bundle } = await (adminSupabase as any)
      .from("bundles")
      .select("id")
      .eq("slug", bundleSlug)
      .maybeSingle();
    resolvedBundleId = bundle?.id ?? null;
  }

  if (!resolvedBundleId) {
    return [];
  }

  const { data: bundleProducts } = await (adminSupabase as any)
    .from("bundle_products")
    .select("product_id")
    .eq("bundle_id", resolvedBundleId);

  return [
    ...new Set<string>(
      (((bundleProducts as Array<{ product_id?: string }> | null) || [])
        .map((row: { product_id?: string }) => row.product_id)
        .filter((productId: string | undefined): productId is string => Boolean(productId)))
    ),
  ];
}

/**
 * @brief Expands any bundle product IDs in a purchased product list into their constituent products.
 * @param productIds Raw product IDs from cart metadata.
 * @returns Unique product IDs with bundle contents expanded.
 * @note This mirrors the ownership logic used for My Products so review eligibility matches actual access.
 * @example
 * await expandBundleProductsFromProductIds(["product-uuid"]);
 */
async function expandBundleProductsFromProductIds(
  productIds: string[]
): Promise<string[]> {
  if (productIds.length === 0) {
    return [];
  }

  const adminSupabase = await createSupabaseServiceRole();
  const uniqueIds = [...new Set(productIds)];
  const { data: productRows } = await (adminSupabase as any)
    .from("products")
    .select("id, slug, category")
    .in("id", uniqueIds)
    .eq("status", "active");

  const expandedIds = new Set<string>(uniqueIds);
  const bundleSlugs = (productRows || [])
    .filter((row: { category?: string; slug?: string }) => row.category === "bundle" && Boolean(row.slug))
    .map((row: { slug: string }) => row.slug);

  if (bundleSlugs.length === 0) {
    return [...expandedIds];
  }

  const { data: bundles } = await (adminSupabase as any)
    .from("bundles")
    .select("id, slug")
    .in("slug", bundleSlugs)
    .eq("status", "active");

  const bundleIds = (bundles || []).map((bundle: { id: string }) => bundle.id);
  if (bundleIds.length === 0) {
    return [...expandedIds];
  }

  const { data: bundleProducts } = await (adminSupabase as any)
    .from("bundle_products")
    .select("product_id")
    .in("bundle_id", bundleIds);

  for (const row of (bundleProducts as Array<{ product_id?: string }> | null) || []) {
    if (row.product_id) {
      expandedIds.add(row.product_id);
    }
  }

  return [...expandedIds];
}

/**
 * @brief Extracts purchased product IDs from a Stripe PaymentIntent.
 * @param paymentIntent Successful Stripe PaymentIntent.
 * @returns Unique product UUIDs represented by that order.
 * @note Supports direct cart purchases and bundle-lifetime metadata.
 * @example
 * await extractPurchasedProductIds(paymentIntent);
 */
async function extractPurchasedProductIds(
  paymentIntent: Stripe.PaymentIntent
): Promise<string[]> {
  const cartItems = paymentIntent.metadata?.cart_items;
  if (cartItems) {
    try {
      const parsed = JSON.parse(cartItems) as Array<{ id?: string }>;
      const directProductIds = [
        ...new Set(
          parsed
            .map((item) => item.id)
            .filter((productId): productId is string => Boolean(productId))
        ),
      ];
      return expandBundleProductsFromProductIds(directProductIds);
    } catch (error) {
      console.error("[ReviewSystem] Failed to parse payment intent cart_items:", error);
    }
  }

  return expandBundleProductIds(
    paymentIntent.metadata?.bundle_id,
    paymentIntent.metadata?.bundle_slug
  );
}

/**
 * @brief Infers the purchase source label stored in `review_followups`.
 * @param paymentIntent Successful Stripe PaymentIntent.
 * @returns Normalized purchase source string.
 * @example
 * inferPurchaseSource(paymentIntent);
 */
function inferPurchaseSource(paymentIntent: Stripe.PaymentIntent): string {
  if (paymentIntent.metadata?.purchase_type === "bundle_lifetime") {
    return "bundle_lifetime";
  }

  return "payment_intent";
}

/**
 * @brief Resolves customer email, display name, and Stripe customer ID from a PaymentIntent.
 * @param paymentIntent Successful Stripe PaymentIntent.
 * @returns Customer identity details.
 * @note Stripe customers are preferred because reward promo codes can be restricted to that customer.
 * @example
 * await resolveCustomerIdentity(paymentIntent);
 */
async function resolveCustomerIdentity(
  paymentIntent: Stripe.PaymentIntent
): Promise<CustomerIdentity> {
  let email = paymentIntent.receipt_email ?? null;
  let name: string | null = null;
  const stripeCustomerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer?.id ?? null;

  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (typeof customer === "object" && !customer.deleted) {
        email = customer.email ?? email;
        name = customer.name ?? name;
      }
    } catch (error) {
      console.error("[ReviewSystem] Failed to retrieve Stripe customer:", error);
    }
  }

  if ((!email || !name) && paymentIntent.latest_charge) {
    try {
      const chargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      email = charge.billing_details.email ?? email;
      name = charge.billing_details.name ?? name;
    } catch (error) {
      console.error("[ReviewSystem] Failed to retrieve Stripe charge:", error);
    }
  }

  return {
    email: email ? normalizeEmail(email) : null,
    name,
    stripeCustomerId,
  };
}

/**
 * @brief Finds or creates a subscriber record for review-related email delivery.
 * @param email Customer email address.
 * @param userId Optional Supabase auth user ID.
 * @returns Subscriber ID when found or created.
 * @note Review invites reuse the existing subscribers table rather than creating a parallel email audience system.
 * @example
 * await ensureSubscriber("alex@example.com", "user-uuid");
 */
async function ensureSubscriber(
  email: string,
  userId?: string | null
): Promise<string> {
  const adminSupabase = await createSupabaseServiceRole();
  const normalizedEmail = normalizeEmail(email);
  const subscribersTable = (adminSupabase as any).from("subscribers");

  const { data: existing } = await subscribersTable
    .select("id, user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    if (userId && !existing.user_id) {
      await subscribersTable
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    return existing.id;
  }

  const subscriberId = userId ?? crypto.randomUUID();
  const { data: inserted, error } = await subscribersTable
    .insert({
      id: subscriberId,
      email: normalizedEmail,
      status: "active",
      user_id: userId ?? null,
      source: "review-followup",
      subscribe_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Failed to create subscriber");
  }

  return inserted.id;
}

/**
 * @brief Queues a delayed review follow-up for a successful PaymentIntent.
 * @param paymentIntent Successful Stripe PaymentIntent.
 * @returns Whether a follow-up row was created or updated.
 * @note Only authenticated orders with a stored `metadata.user_id` are queued because the review UI lives in My Products.
 * @param options.sendAt Optional scheduled send time (defaults to purchase + delay days).
 * @example
 * await queueReviewFollowupForPaymentIntent(paymentIntent);
 */
export async function queueReviewFollowupForPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  options?: { sendAt?: Date }
): Promise<{ queued: boolean; reason?: string }> {
  if (paymentIntent.status !== "succeeded") {
    return { queued: false, reason: "payment_not_succeeded" };
  }

  const rawUserId = paymentIntent.metadata?.user_id;
  const userId =
    rawUserId && rawUserId !== "anonymous" ? rawUserId : null;

  if (!userId) {
    return { queued: false, reason: "missing_user" };
  }

  const customer = await resolveCustomerIdentity(paymentIntent);
  if (!customer.email) {
    return { queued: false, reason: "missing_email" };
  }

  const purchasedProductIds = await extractPurchasedProductIds(paymentIntent);
  if (purchasedProductIds.length === 0) {
    return { queued: false, reason: "no_products" };
  }

  const subscriberId = await ensureSubscriber(customer.email, userId);
  const adminSupabase = await createSupabaseServiceRole();
  const { data: existingRow } = await (adminSupabase as any)
    .from("review_followups")
    .select("invite_sent_at")
    .eq("payment_intent_id", paymentIntent.id)
    .maybeSingle();
  if (existingRow?.invite_sent_at) {
    return { queued: false, reason: "already_sent" };
  }

  const purchaseDate = new Date(paymentIntent.created * 1000);
  const sendAt =
    options?.sendAt ??
    new Date(
      purchaseDate.getTime() +
        REVIEW_REWARD_DELAY_DAYS * 24 * 60 * 60 * 1000
    );

  const payload = {
    payment_intent_id: paymentIntent.id,
    checkout_session_id: null,
    stripe_customer_id: customer.stripeCustomerId,
    user_id: userId,
    subscriber_id: subscriberId,
    customer_email: customer.email,
    purchased_product_ids: purchasedProductIds,
    purchase_source: inferPurchaseSource(paymentIntent),
    purchase_date: purchaseDate.toISOString(),
    send_at: sendAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await (adminSupabase as any)
    .from("review_followups")
    .upsert(payload, { onConflict: "payment_intent_id" });

  if (error) {
    throw new Error(error.message);
  }

  return { queued: true };
}

/**
 * @brief Queues a review follow-up from a completed Stripe Checkout Session.
 * @param session Completed checkout session.
 * @returns Whether a follow-up row was queued.
 * @note Checkout sessions are routed back through the underlying PaymentIntent for deduped order tracking.
 * @example
 * await queueReviewFollowupForCheckoutSession(session);
 */
export async function queueReviewFollowupForCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<{ queued: boolean; reason?: string }> {
  if (!session.payment_intent) {
    return { queued: false, reason: "missing_payment_intent" };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return queueReviewFollowupForPaymentIntent(paymentIntent);
}

/**
 * @brief Queues a review follow-up for free / NFR product grants (no Stripe PaymentIntent).
 * @param params.userId Supabase auth user id (My Products / reviews require login).
 * @param params.customerEmail Normalized customer email.
 * @param params.productIds Product UUIDs granted in the backfill window.
 * @param params.purchaseDate Representative purchase timestamp (e.g. earliest grant time).
 * @param params.syntheticPaymentIntentId Stable id for upsert (e.g. `grant_backfill_<userId>`).
 * @param params.sendAt When the invite email may be sent (cron processes when send_at is due).
 * @returns Whether a row was upserted.
 * @note The unique $10 promo code is created when the customer submits a review (`issueReviewReward`), not here.
 * @example
 * await queueReviewFollowupForProductGrants({ userId, customerEmail, productIds, purchaseDate, syntheticPaymentIntentId: `grant_backfill_${userId}`, sendAt: new Date() });
 */
export async function queueReviewFollowupForProductGrants(params: {
  userId: string;
  customerEmail: string;
  productIds: string[];
  purchaseDate: Date;
  syntheticPaymentIntentId: string;
  sendAt: Date;
}): Promise<{ queued: boolean; reason?: string }> {
  if (params.productIds.length === 0) {
    return { queued: false, reason: "no_products" };
  }

  const purchasedProductIds = await expandBundleProductsFromProductIds(
    params.productIds
  );
  if (purchasedProductIds.length === 0) {
    return { queued: false, reason: "no_products_after_expand" };
  }

  const adminSupabase = await createSupabaseServiceRole();
  const { data: existingRow } = await (adminSupabase as any)
    .from("review_followups")
    .select("invite_sent_at")
    .eq("payment_intent_id", params.syntheticPaymentIntentId)
    .maybeSingle();
  if (existingRow?.invite_sent_at) {
    return { queued: false, reason: "already_sent" };
  }

  const subscriberId = await ensureSubscriber(
    params.customerEmail,
    params.userId
  );

  const payload = {
    payment_intent_id: params.syntheticPaymentIntentId,
    checkout_session_id: null,
    stripe_customer_id: null,
    user_id: params.userId,
    subscriber_id: subscriberId,
    customer_email: normalizeEmail(params.customerEmail),
    purchased_product_ids: purchasedProductIds,
    purchase_source: "product_grant",
    purchase_date: params.purchaseDate.toISOString(),
    send_at: params.sendAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await (adminSupabase as any)
    .from("review_followups")
    .upsert(payload, { onConflict: "payment_intent_id" });

  if (error) {
    throw new Error(error.message);
  }

  return { queued: true };
}

/**
 * @brief Marks any queued review follow-up for a refunded order as refunded.
 * @param paymentIntentId Stripe PaymentIntent ID tied to the refund.
 * @param refundedAt Timestamp for the refund event.
 * @returns Promise resolved when the follow-up row is updated.
 * @example
 * await markReviewFollowupRefunded("pi_123", new Date().toISOString());
 */
export async function markReviewFollowupRefunded(
  paymentIntentId: string,
  refundedAt: string
): Promise<void> {
  if (!paymentIntentId) {
    return;
  }

  const adminSupabase = await createSupabaseServiceRole();
  const { error } = await (adminSupabase as any)
    .from("review_followups")
    .update({
      is_refunded: true,
      refunded_at: refundedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_intent_id", paymentIntentId);

  if (error) {
    console.error("[ReviewSystem] Failed to mark review followup refunded:", error);
  }
}

/**
 * @brief Loads active products by ID for invite emails.
 * @param productIds Product UUIDs to load.
 * @returns Product records for email rendering.
 * @example
 * await loadProducts(["product-uuid"]);
 */
async function loadProducts(productIds: string[]): Promise<ReviewEmailProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const adminSupabase = await createSupabaseServiceRole();
  const { data: products } = await (adminSupabase as any)
    .from("products")
    .select("id, name, slug")
    .in("id", productIds)
    .eq("status", "active");

  return (products || []).map((product: { name: string; slug: string }) => ({
    name: product.name,
    slug: product.slug,
  }));
}

/**
 * @brief Resolves the current user's display name from the profile table.
 * @param userId Supabase auth user ID.
 * @returns Friendly display name when available.
 * @example
 * await getProfileDisplayName("user-uuid");
 */
async function getProfileDisplayName(userId: string | null): Promise<string | null> {
  if (!userId) {
    return null;
  }

  const adminSupabase = await createSupabaseServiceRole();
  const { data: profile } = await (adminSupabase as any)
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  return buildDisplayName(profile?.first_name, profile?.last_name);
}

/**
 * @brief Sends any due review invite emails that have not been sent yet.
 * @param limit Maximum number of queued rows to process.
 * @returns Count of successfully processed follow-up rows.
 * @note Orders with no remaining eligible products are marked processed without sending.
 * @example
 * await sendDueReviewFollowups(25);
 */
export async function sendDueReviewFollowups(limit: number = 25): Promise<number> {
  const adminSupabase = await createSupabaseServiceRole();
  const now = new Date().toISOString();
  const { data: followups } = await (adminSupabase as any)
    .from("review_followups")
    .select("id, customer_email, invite_sent_at, is_refunded, payment_intent_id, purchased_product_ids, reward_claimed_at, send_at, stripe_customer_id, user_id")
    .is("invite_sent_at", null)
    .eq("is_refunded", false)
    .lte("send_at", now)
    .order("send_at", { ascending: true })
    .limit(limit);

  let processed = 0;

  for (const followup of (followups || []) as ReviewFollowupRow[]) {
    const reviewedProductIds =
      followup.user_id
        ? (
            await (adminSupabase as any)
              .from("product_reviews")
              .select("product_id")
              .eq("user_id", followup.user_id)
              .in("product_id", followup.purchased_product_ids)
          ).data || []
        : [];

    const reviewedIds = new Set(
      reviewedProductIds.map((row: { product_id?: string }) => row.product_id).filter(Boolean)
    );
    const remainingProductIds = followup.purchased_product_ids.filter(
      (productId) => !reviewedIds.has(productId)
    );

    if (!followup.user_id || remainingProductIds.length === 0) {
      await (adminSupabase as any)
        .from("review_followups")
        .update({
          invite_sent_at: new Date().toISOString(),
          invite_email_message_id: remainingProductIds.length === 0 ? "skipped-no-eligible-products" : "skipped-missing-user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", followup.id);
      processed += 1;
      continue;
    }

    const products = await loadProducts(remainingProductIds);
    if (products.length === 0) {
      continue;
    }

    const customerName = await getProfileDisplayName(followup.user_id);
    const reviewUrl = `${getPublicSiteUrlForEmail()}/my-products`;
    const emailResult = await sendEmail({
      to: followup.customer_email,
      subject: "Review your purchase and get $10 off",
      html: buildReviewInviteEmailHtml({
        customerName,
        reviewUrl,
        products,
      }),
      text: buildReviewInviteEmailText({
        customerName,
        reviewUrl,
        products,
      }),
      from: "NNAudio Support <support@nnaud.io>",
      replyTo: "support@nnaud.io",
      idempotencyKey: `review-followup:${followup.id}`,
    });

    if (!emailResult.success) {
      console.error("[ReviewSystem] Failed to send review followup email:", emailResult.error);
      continue;
    }

    await (adminSupabase as any)
      .from("review_followups")
      .update({
        invite_sent_at: new Date().toISOString(),
        invite_email_message_id: emailResult.messageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", followup.id);

    processed += 1;
  }

  return processed;
}

/**
 * @brief Finds the earliest reward-eligible follow-up row for a submitted review.
 * @param userId Reviewing user ID.
 * @param productId Reviewed product ID.
 * @returns Eligible follow-up row or null.
 * @example
 * await getRewardEligibleFollowup("user-uuid", "product-uuid");
 */
async function getRewardEligibleFollowup(
  userId: string,
  productId: string
): Promise<ReviewFollowupRow | null> {
  const adminSupabase = await createSupabaseServiceRole();
  /** Do not require send_at: rewards issue on submit; moderation only affects on-site display. */
  const { data: followup } = await (adminSupabase as any)
    .from("review_followups")
    .select("id, customer_email, invite_sent_at, is_refunded, payment_intent_id, purchased_product_ids, reward_claimed_at, send_at, stripe_customer_id, user_id")
    .eq("user_id", userId)
    .eq("is_refunded", false)
    .is("reward_claimed_at", null)
    .contains("purchased_product_ids", [productId])
    .order("purchase_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (followup as ReviewFollowupRow | null) ?? null;
}

/**
 * @brief Issues the one-time review reward promo code for an eligible submission.
 * @param reviewId Submitted review row ID.
 * @param userId Reviewing user ID.
 * @param productId Reviewed product ID.
 * @param customerEmail Customer email address.
 * @param customerName Optional display name for the reward email.
 * @returns Reward issuance result with the promo code when granted.
 * @note Only the first eligible review from a queued order can claim the reward.
 * @note Reward is not gated on moderation_status (pending/approved); admin approval only affects public display.
 * @example
 * await issueReviewReward({ reviewId: "review-uuid", userId: "user-uuid", productId: "product-uuid", customerEmail: "alex@example.com", customerName: "Alex" });
 */
export async function issueReviewReward(params: {
  reviewId: string;
  userId: string;
  productId: string;
  customerEmail: string;
  customerName?: string | null;
}): Promise<RewardIssuanceResult> {
  const followup = await getRewardEligibleFollowup(params.userId, params.productId);
  if (!followup) {
    return { granted: false };
  }

  const stripeCustomerId = followup.stripe_customer_id;
  const rewardCode = generateReviewRewardCode();
  const expiresAt = getRewardExpirationTimestamp();
  const discountResult = await createOneTimeDiscountCode("amount", REVIEW_REWARD_AMOUNT_CENTS, {
    code: rewardCode,
    name: "Product review reward",
    maxRedemptions: 1,
    expiresAt,
    customerId: stripeCustomerId ?? undefined,
  });

  if (!discountResult.success || !discountResult.promotionCode || !discountResult.coupon) {
    throw new Error(discountResult.error || "Failed to create review reward code");
  }

  const adminSupabase = await createSupabaseServiceRole();
  const claimedAt = new Date().toISOString();
  await (adminSupabase as any)
    .from("review_followups")
    .update({
      reward_claimed_at: claimedAt,
      reward_review_id: params.reviewId,
      stripe_coupon_id: discountResult.coupon.id,
      stripe_promotion_code_id: discountResult.promotionCode.id,
      stripe_promotion_code: discountResult.code,
      updated_at: claimedAt,
    })
    .eq("id", followup.id);

  const expiresLabel = new Date(expiresAt * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shopUrl = `${getPublicSiteUrlForEmail()}/products`;
  const rewardEmailResult = await sendEmail({
    to: params.customerEmail,
    subject: "Your $10 review reward code",
    html: buildReviewRewardEmailHtml({
      customerName: params.customerName ?? null,
      promotionCode: discountResult.code || rewardCode,
      amountOffLabel: REVIEW_REWARD_AMOUNT_LABEL,
      expiresLabel,
      shopUrl,
    }),
    text: buildReviewRewardEmailText({
      customerName: params.customerName ?? null,
      promotionCode: discountResult.code || rewardCode,
      amountOffLabel: REVIEW_REWARD_AMOUNT_LABEL,
      expiresLabel,
      shopUrl,
    }),
    from: "NNAudio Support <support@nnaud.io>",
    replyTo: "support@nnaud.io",
    idempotencyKey: `review-reward:${followup.id}`,
  });

  if (rewardEmailResult.success) {
    await (adminSupabase as any)
      .from("review_followups")
      .update({
        reward_email_sent_at: new Date().toISOString(),
        reward_email_message_id: rewardEmailResult.messageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", followup.id);
  }

  return {
    granted: true,
    promotionCode: discountResult.code,
    followupId: followup.id,
  };
}
