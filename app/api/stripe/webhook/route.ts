/**
 * @fileoverview Stripe webhook: cache invalidation and branded order confirmation emails.
 * @module app/api/stripe/webhook/route
 *
 * On checkout.session.completed we send an NNAudio-branded order confirmation via SendGrid
 * and an iOS admin push for paid orders.
 * On payment_intent.succeeded / checkout.session.completed we queue delayed review follow-ups.
 * On refund.created we send an NNAudio-branded refund confirmation email and disable review rewards for that order.
 * In Stripe Dashboard → Settings → Customer emails you can turn off Stripe’s default receipts if desired.
 */
"use server";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { getAdminEmailsForOrderCopy } from "@/lib/admin-order-email-copy";
import { invalidateUserProductCache } from "@/lib/product-cache";
import { stripe } from "@/utils/stripe/client";
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  type OrderLineItem,
} from "@/utils/order-confirmation-email";
import {
  buildRefundEmailHtml,
  buildRefundEmailText,
} from "@/utils/refund-email";
import {
  markReviewFollowupRefunded,
  queueReviewFollowupForCheckoutSession,
  queueReviewFollowupForPaymentIntent,
} from "@/utils/reviews/review-system";
import { findOrCreateCustomer } from "@/utils/stripe/actions";
import {
  linkPurchasesToUserByEmail,
  normalizePurchaseEmail,
} from "@/utils/stripe/link-purchases-to-user";

const WEBHOOK_UNIQUE_VIOLATION = "23505";

/**
 * @brief Claims a Stripe event id for processing. Duplicate deliveries return
 * `"duplicate"`. Other insert failures throw so Stripe retries instead of
 * double-processing.
 */
async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string
): Promise<"claimed" | "duplicate"> {
  const supabase = await createSupabaseServiceRole();
  const { error } = await (supabase as any)
    .from("stripe_webhook_events")
    .insert({ id: eventId, event_type: eventType, status: "processing" });
  if (!error) return "claimed";
  if (error.code === WEBHOOK_UNIQUE_VIOLATION) return "duplicate";
  throw error;
}

async function completeStripeWebhookEvent(eventId: string): Promise<void> {
  try {
    const supabase = await createSupabaseServiceRole();
    await (supabase as any)
      .from("stripe_webhook_events")
      .update({ status: "complete", completed_at: new Date().toISOString() })
      .eq("id", eventId);
  } catch (error) {
    console.warn("[stripe webhook] idempotency complete failed", error);
  }
}

async function releaseStripeWebhookEvent(eventId: string): Promise<void> {
  try {
    const supabase = await createSupabaseServiceRole();
    await (supabase as any).from("stripe_webhook_events").delete().eq("id", eventId);
  } catch (error) {
    console.warn("[stripe webhook] idempotency release failed", error);
  }
}

/**
 * Extracts customer ID from any Stripe event
 */
function extractCustomerId(event: Stripe.Event): string | null {
  const obj = event.data.object;

  // Check if the object has a customer field
  if ("customer" in obj && obj.customer) {
    return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
  }

  return null;
}

/**
 * Finds user ID by customer ID
 */
async function findUserIdByCustomerId(
  customerId: string
): Promise<string | null> {
  const supabase = await createSupabaseServiceRole();

  // First try to find by customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("customer_id", customerId)
    .single();

  if (profile) {
    return profile.id;
  }

  // If not found, try to get customer email from Stripe and find by email
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (typeof customer === "object" && !customer.deleted && customer.email) {
      const { data: profileByEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", customer.email)
        .single();

      if (profileByEmail) {
        // Update customer_id for future lookups
        await supabase
          .from("profiles")
          .update({ customer_id: customerId })
          .eq("id", profileByEmail.id);

        return profileByEmail.id;
      }
    }
  } catch (error) {
    console.error("Error retrieving customer from Stripe:", error);
  }

  return null;
}

/**
 * Sends branded order confirmation email for a completed checkout session (payment mode).
 * Uses NNAudio branding; receipt URL from Stripe charge when available.
 * Also sends a copy to admins who opted in for paid orders. Free orders never notify admins.
 */
async function sendOrderConfirmationEmail(
  session: Stripe.Checkout.Session
): Promise<void> {
  const email =
    (session.customer_details?.email as string) ||
    (session.customer_email as string) ||
    null;
  if (!email || session.payment_status !== "paid") {
    return;
  }
  if (session.mode !== "payment" || !session.payment_intent) {
    return;
  }

  const sessionId =
    typeof session.id === "string" ? session.id : (session as { id: string }).id;
  const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product", "payment_intent"],
  });

  const lineItems = (fullSession.line_items?.data ?? []).map(
    (li): OrderLineItem => {
      const amount = li.amount_subtotal != null ? li.amount_subtotal : 0;
      const productName =
        (li.price?.product as Stripe.Product)?.name ?? li.description ?? "Item";
      return {
        name: String(productName),
        quantity: li.quantity ?? 1,
        amount: formatCurrency(amount, fullSession.currency ?? "usd"),
      };
    }
  );

  const amountTotal = fullSession.amount_total ?? 0;
  const subtotal = fullSession.amount_subtotal ?? amountTotal;
  const discountCents = fullSession.total_details?.amount_discount ?? 0;
  const totalStr = formatCurrency(amountTotal, fullSession.currency ?? "usd");
  const subtotalStr = formatCurrency(subtotal, fullSession.currency ?? "usd");

  let receiptUrl: string | null = null;
  const pi = fullSession.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.latest_charge) {
    const chargeId =
      typeof pi.latest_charge === "string"
        ? pi.latest_charge
        : pi.latest_charge.id;
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      receiptUrl = charge.receipt_url ?? null;
    } catch {
      // ignore
    }
  }

  const customerName =
    fullSession.customer_details?.name?.trim() ||
    null;
  const sessionDiscounts = (
    fullSession as {
      discounts?: Array<{
        promotion_code?: string | { code?: string | null } | null;
      }>;
    }
  ).discounts;
  const firstPromotionCodeValue =
    fullSession.metadata?.promotion_code ??
    (typeof sessionDiscounts?.[0]?.promotion_code === "string"
      ? sessionDiscounts[0].promotion_code
      : sessionDiscounts?.[0]?.promotion_code?.code ?? null);
  const promotionCode = await resolvePromotionCodeLabel(firstPromotionCodeValue);

  const { sendEmail } = await import("@/utils/email");
  const data = {
    customerEmail: email,
    customerName: customerName,
    orderNumber: fullSession.id.slice(-12).toUpperCase(),
    promotionCode,
    discount:
      discountCents > 0
        ? formatCurrency(discountCents, fullSession.currency ?? "usd")
        : null,
    lineItems,
    subtotal: subtotalStr,
    total: totalStr,
    receiptUrl,
    date: new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const result = await sendEmail({
    to: email,
    subject: "Your order confirmation – NNAud.io",
    html: buildOrderConfirmationHtml(data),
    text: buildOrderConfirmationText(data),
    from: "NNAudio Support <support@nnaud.io>",
    replyTo: "support@nnaud.io",
  });

  if (result.success) {
    console.log("Order confirmation email sent to", email);
  } else {
    console.error("Failed to send order confirmation email:", result.error);
  }

  const adminEmails = await getAdminEmailsForOrderCopy(amountTotal > 0);
  const subject = "Your order confirmation – NNAud.io";
  const html = buildOrderConfirmationHtml(data);
  const text = buildOrderConfirmationText(data);
  for (const adminEmail of adminEmails) {
    const adminResult = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      from: "NNAudio Support <support@nnaud.io>",
      replyTo: "support@nnaud.io",
    });
    if (adminResult.success) {
      console.log("Order confirmation copy sent to admin", adminEmail);
    } else {
      console.error("Failed to send order copy to admin:", adminResult.error);
    }
  }

  if (amountTotal > 0) {
    try {
      const { buildPaidOrderPush, sendAdminPush } = await import(
        "@/lib/admin-push"
      );
      const payload = buildPaidOrderPush({
        amountCents: amountTotal,
        currency: fullSession.currency ?? "usd",
        itemNames: lineItems.map((item) => item.name),
      });
      if (payload) {
        await sendAdminPush(payload);
      }
    } catch (pushError) {
      console.error("[webhook] Admin paid-order push failed:", pushError);
    }
  }
}

interface PaymentIntentCartItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
}

/**
 * @brief Resolves customer identity + Stripe receipt URL from a PaymentIntent.
 * @param paymentIntent Successful Stripe PaymentIntent.
 * @returns Email, display name, and receipt URL (when available).
 * @note Cart checkout uses PaymentIntents, so we must source customer details from PI/charge/customer.
 * @example
 * await resolvePaymentIntentCustomer(paymentIntent);
 */
async function resolvePaymentIntentCustomer(paymentIntent: Stripe.PaymentIntent): Promise<{
  email: string | null;
  name: string | null;
  receiptUrl: string | null;
}> {
  let email = paymentIntent.receipt_email ?? null;
  let name: string | null = null;
  let receiptUrl: string | null = null;

  if (paymentIntent.latest_charge) {
    try {
      const chargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      email = charge.billing_details?.email ?? charge.receipt_email ?? email;
      name = charge.billing_details?.name ?? name;
      receiptUrl = charge.receipt_url ?? null;
    } catch {
      // ignore charge lookup failures; we'll fall back to customer lookup
    }
  }

  if ((!email || !name) && paymentIntent.customer) {
    try {
      const customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      if (typeof customer === "object" && !customer.deleted) {
        email = customer.email ?? email;
        name = customer.name ?? name;
      }
    } catch {
      // ignore
    }
  }

  return { email, name, receiptUrl };
}

/**
 * @brief Attaches a Stripe customer to guest cart PaymentIntents and links purchases when a profile exists.
 * @param paymentIntent Succeeded cart PaymentIntent.
 * @returns Normalized customer id when attached or already present.
 */
async function normalizeGuestPaymentIntentCustomer(
  paymentIntent: Stripe.PaymentIntent
): Promise<string | null> {
  if (!paymentIntent.metadata?.cart_items) {
    return typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer?.id ?? null;
  }

  const existingCustomerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer?.id ?? null;

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const { email } = await resolvePaymentIntentCustomer(paymentIntent);
  const metadataEmail = paymentIntent.metadata?.checkout_email
    ? normalizePurchaseEmail(paymentIntent.metadata.checkout_email)
    : "";
  const normalizedEmail = normalizePurchaseEmail(email ?? "") || metadataEmail;

  if (!normalizedEmail) {
    return null;
  }

  const customerId = await findOrCreateCustomer(normalizedEmail);

  await stripe.paymentIntents.update(paymentIntent.id, {
    customer: customerId,
    metadata: {
      ...paymentIntent.metadata,
      checkout_email: normalizedEmail,
    },
  });

  const supabase = await createSupabaseServiceRole();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profile?.id) {
    await linkPurchasesToUserByEmail({
      userId: profile.id,
      email: normalizedEmail,
      preferredCustomerId: customerId,
    });
    return customerId;
  }

  return customerId;
}

/**
 * @brief Resolves a human-readable promo code value from Stripe metadata.
 * @param rawPromotionCode Raw metadata value (usually `promo_*` id or code string).
 * @returns Promo code string suitable for customer email display.
 * @example
 * await resolvePromotionCodeLabel(paymentIntent.metadata?.promotion_code);
 */
async function resolvePromotionCodeLabel(
  rawPromotionCode: string | null | undefined
): Promise<string | null> {
  if (!rawPromotionCode) return null;
  const trimmed = rawPromotionCode.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("promo_")) {
    return trimmed.toUpperCase();
  }
  try {
    const promo = await stripe.promotionCodes.retrieve(trimmed);
    return (promo.code || trimmed).toUpperCase();
  } catch {
    return trimmed;
  }
}

/**
 * @brief Sends branded order confirmation email for successful cart PaymentIntents.
 * @param paymentIntent Successful Stripe PaymentIntent.
 * @returns Promise resolved after customer/admin sends attempt.
 * @note We only send when `metadata.cart_items` exists, which distinguishes cart orders from other PI flows.
 * @example
 * await sendPaymentIntentOrderConfirmationEmail(paymentIntent);
 */
async function sendPaymentIntentOrderConfirmationEmail(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  if (paymentIntent.status !== "succeeded") return;

  const cartItemsStr = paymentIntent.metadata?.cart_items;
  if (!cartItemsStr) return;

  let parsedItems: PaymentIntentCartItem[] = [];
  try {
    const parsed = JSON.parse(cartItemsStr) as unknown;
    if (Array.isArray(parsed)) {
      parsedItems = parsed as PaymentIntentCartItem[];
    }
  } catch {
    console.warn(
      "[webhook] Skipping PaymentIntent confirmation email: invalid cart_items JSON",
      paymentIntent.id
    );
    return;
  }

  const { email, name, receiptUrl } = await resolvePaymentIntentCustomer(
    paymentIntent
  );
  if (!email) {
    console.warn(
      "[webhook] Skipping PaymentIntent confirmation email: missing customer email",
      paymentIntent.id
    );
    return;
  }

  const currency = paymentIntent.currency ?? "usd";
  const lineItems = parsedItems
    .map((item): OrderLineItem | null => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.price ?? 0);
      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
      return {
        name: item.name || "Item",
        quantity: safeQuantity,
        amount: formatCurrency(
          Math.round(safeUnitPrice * safeQuantity * 100),
          currency
        ),
      };
    })
    .filter((item): item is OrderLineItem => Boolean(item));

  const paidTotalCents = paymentIntent.amount_received || paymentIntent.amount || 0;
  const originalTotalRaw = Number(paymentIntent.metadata?.original_total);
  const originalTotalCents = Number.isFinite(originalTotalRaw)
    ? Math.round(originalTotalRaw * 100)
    : paidTotalCents;
  const discountRaw = Number(paymentIntent.metadata?.discount_amount);
  const discountCents = Number.isFinite(discountRaw)
    ? Math.max(0, Math.round(discountRaw * 100))
    : Math.max(0, originalTotalCents - paidTotalCents);
  const subtotalCents = Math.max(paidTotalCents, originalTotalCents);
  const promotionCode = await resolvePromotionCodeLabel(
    paymentIntent.metadata?.promotion_code
  );

  const data = {
    customerEmail: email,
    customerName: name?.trim() || null,
    orderNumber: paymentIntent.id.slice(-12).toUpperCase(),
    promotionCode,
    discount: discountCents > 0 ? formatCurrency(discountCents, currency) : null,
    lineItems,
    subtotal: formatCurrency(subtotalCents, currency),
    total: formatCurrency(paidTotalCents, currency),
    receiptUrl,
    date: new Date(paymentIntent.created * 1000).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const { sendEmail } = await import("@/utils/email");
  const subject = "Your order confirmation – NNAud.io";
  const html = buildOrderConfirmationHtml(data);
  const text = buildOrderConfirmationText(data);

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text,
    from: "NNAudio Support <support@nnaud.io>",
    replyTo: "support@nnaud.io",
    idempotencyKey: `order-confirmation:payment-intent:${paymentIntent.id}:customer`,
  });

  if (result.success) {
    console.log("[webhook] PaymentIntent order confirmation email sent to", email);
  } else {
    console.error(
      "[webhook] Failed to send PaymentIntent order confirmation email:",
      result.error
    );
  }

  const adminEmails = await getAdminEmailsForOrderCopy(true);
  for (const adminEmail of adminEmails) {
    const adminResult = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      from: "NNAudio Support <support@nnaud.io>",
      replyTo: "support@nnaud.io",
      idempotencyKey: `order-confirmation:payment-intent:${paymentIntent.id}:admin:${adminEmail}`,
    });
    if (adminResult.success) {
      console.log(
        "[webhook] PaymentIntent order confirmation copy sent to admin",
        adminEmail
      );
    } else {
      console.error(
        "[webhook] Failed to send PaymentIntent order copy to admin:",
        adminResult.error
      );
    }
  }

  if (paidTotalCents > 0) {
    try {
      const { buildPaidOrderPush, sendAdminPush } = await import(
        "@/lib/admin-push"
      );
      const payload = buildPaidOrderPush({
        amountCents: paidTotalCents,
        currency,
        itemNames: lineItems.map((item) => item.name),
      });
      if (payload) {
        await sendAdminPush(payload);
      }
    } catch (pushError) {
      console.error(
        "[webhook] Admin PaymentIntent paid-order push failed:",
        pushError
      );
    }
  }
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

/**
 * Sends branded refund confirmation email for a single refund (refund.created).
 * One email per refund; correct amount for partial refunds.
 */
async function sendRefundConfirmationEmail(refund: Stripe.Refund): Promise<void> {
  if (refund.status !== "succeeded") return;

  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
  if (!chargeId) return;

  let charge: Stripe.Charge;
  try {
    charge = await stripe.charges.retrieve(chargeId);
  } catch {
    console.warn("Refund email skipped: could not retrieve charge", chargeId);
    return;
  }

  let email: string | null = charge.receipt_email ?? null;
  if (!email && charge.customer) {
    try {
      const customer = await stripe.customers.retrieve(
        typeof charge.customer === "string" ? charge.customer : charge.customer.id
      );
      if (typeof customer === "object" && !customer.deleted && customer.email) {
        email = customer.email;
      }
    } catch {
      // ignore
    }
  }
  if (!email) {
    console.warn("Refund email skipped: no customer email for charge", chargeId);
    return;
  }

  const currency = refund.currency ?? charge.currency ?? "usd";
  const refundAmount = refund.amount ?? 0;
  const refundAmountStr = formatCurrency(refundAmount, currency);
  const originalAmount = charge.amount;
  const isPartial = refundAmount < originalAmount;
  const originalAmountStr = isPartial
    ? formatCurrency(originalAmount, currency)
    : null;

  const reason =
    refund.reason && String(refund.reason) !== "unknown" ? String(refund.reason) : null;

  const data = {
    customerEmail: email,
    customerName: null as string | null,
    refundAmount: refundAmountStr,
    isPartial,
    originalAmount: originalAmountStr,
    reason,
    date: new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const { sendEmail } = await import("@/utils/email");
  const result = await sendEmail({
    to: email,
    subject: "Your refund has been processed – NNAud.io",
    html: buildRefundEmailHtml(data),
    text: buildRefundEmailText(data),
    from: "NNAudio Support <support@nnaud.io>",
    replyTo: "support@nnaud.io",
  });

  if (result.success) {
    console.log("Refund confirmation email sent to", email);
  } else {
    console.error("Failed to send refund confirmation email:", result.error);
  }
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature") as string;
  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", errorMessage);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const dateTime = new Date(event.created * 1000).toISOString();

  let claim: "claimed" | "duplicate";
  try {
    claim = await claimStripeWebhookEvent(event.id, event.type);
  } catch (error) {
    console.error("[stripe webhook] idempotency claim failed", error);
    return NextResponse.json(
      { error: "Webhook processing unavailable" },
      { status: 500 }
    );
  }
  if (claim === "duplicate") {
    return NextResponse.json({ status: "duplicate", event: event.type });
  }

  try {
    console.log("Processing Stripe event:", event.type, "at", dateTime);

    let normalizedPaymentIntentCustomerId: string | null = null;

    // Send branded order confirmation email for completed checkouts
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        await sendOrderConfirmationEmail(session);
      } catch (emailError) {
        console.error("Order confirmation email error:", emailError);
      }

      try {
        await queueReviewFollowupForCheckoutSession(session);
      } catch (queueError) {
        console.error("Review followup queue error for checkout session:", queueError);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      try {
        normalizedPaymentIntentCustomerId =
          await normalizeGuestPaymentIntentCustomer(paymentIntent);
      } catch (normalizeError) {
        console.error(
          "[webhook] Failed to normalize guest payment intent customer:",
          normalizeError
        );
      }
      try {
        await sendPaymentIntentOrderConfirmationEmail(paymentIntent);
      } catch (emailError) {
        console.error("PaymentIntent order confirmation email error:", emailError);
      }
      try {
        await queueReviewFollowupForPaymentIntent(paymentIntent);
      } catch (queueError) {
        console.error("Review followup queue error for payment intent:", queueError);
      }
    }

    // Send branded refund confirmation email (one per refund, correct amount for partials)
    if (event.type === "refund.created") {
      const refund = event.data.object as Stripe.Refund;
      try {
        await sendRefundConfirmationEmail(refund);
      } catch (emailError) {
        console.error("Refund confirmation email error:", emailError);
      }

      try {
        const paymentIntentId =
          typeof refund.payment_intent === "string"
            ? refund.payment_intent
            : refund.payment_intent?.id ?? null;
        if (paymentIntentId) {
          await markReviewFollowupRefunded(paymentIntentId, dateTime);
        }
      } catch (refundQueueError) {
        console.error("Review followup refund update error:", refundQueueError);
      }
    }

    // Extract customer ID from event (guest cart PIs may only have customer after normalization)
    let customerId = extractCustomerId(event) ?? normalizedPaymentIntentCustomerId;

    if (!customerId) {
      await completeStripeWebhookEvent(event.id);
      return NextResponse.json({ status: "success", event: event.type });
    }

    // Find user by customer ID
    const userId = await findUserIdByCustomerId(customerId);

    // If user exists, invalidate product cache so next fetch gets fresh purchase data
    if (userId) {
      invalidateUserProductCache(userId);
    }

    await completeStripeWebhookEvent(event.id);
    return NextResponse.json({ status: "success", event: event.type });
  } catch (error) {
    console.error("Webhook error:", error);
    await releaseStripeWebhookEvent(event.id);
    return NextResponse.json(
      { status: "error", error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
