/**
 * @fileoverview One-off / ops: resend NNAudio cart order confirmation emails with current template.
 * @module scripts/resend-cart-order-confirmations
 *
 * Usage (from repo root, with .env.local loaded):
 *   bun run scripts/resend-cart-order-confirmations.ts
 *
 * Uses a unique idempotency key per send so dedupe does not block resends.
 */

import Stripe from "stripe";
import { sendEmail } from "../utils/email";
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  type OrderLineItem,
} from "../utils/order-confirmation-email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CartItemMeta {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

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

async function resolvePaymentIntentCustomer(
  paymentIntent: Stripe.PaymentIntent
): Promise<{
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
      // ignore
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

async function buildDataForPaymentIntent(
  paymentIntent: Stripe.PaymentIntent
): Promise<Parameters<typeof buildOrderConfirmationHtml>[0] | null> {
  if (paymentIntent.status !== "succeeded") return null;
  const cartItemsStr = paymentIntent.metadata?.cart_items;
  if (!cartItemsStr) return null;

  let parsedItems: CartItemMeta[] = [];
  try {
    const parsed = JSON.parse(cartItemsStr) as unknown;
    if (Array.isArray(parsed)) parsedItems = parsed as CartItemMeta[];
  } catch {
    return null;
  }

  const { email, name, receiptUrl } =
    await resolvePaymentIntentCustomer(paymentIntent);
  if (!email) return null;

  const currency = paymentIntent.currency ?? "usd";
  const lineItems: OrderLineItem[] = parsedItems
    .map((item): OrderLineItem | null => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.price ?? 0);
      const safeQuantity =
        Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const safeUnitPrice =
        Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
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

  const paidTotalCents =
    paymentIntent.amount_received || paymentIntent.amount || 0;
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

  return {
    customerEmail: email,
    customerName: name?.trim() || null,
    orderNumber: paymentIntent.id.slice(-12).toUpperCase(),
    promotionCode,
    discount:
      discountCents > 0 ? formatCurrency(discountCents, currency) : null,
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
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const list = await stripe.paymentIntents.list({
    limit: 50,
  });

  let sent = 0;
  for (const pi of list.data) {
    if (pi.status !== "succeeded") continue;
    const data = await buildDataForPaymentIntent(pi);
    if (!data) continue;

    const subject = "Your order confirmation – NNAud.io";
    const result = await sendEmail({
      to: data.customerEmail,
      subject,
      html: buildOrderConfirmationHtml(data),
      text: buildOrderConfirmationText(data),
      from: "NNAudio Support <support@nnaud.io>",
      replyTo: "support@nnaud.io",
      idempotencyKey: `resend-cart-confirm:${pi.id}:${stamp}`,
    });

    console.log(
      JSON.stringify({
        paymentIntent: pi.id,
        to: data.customerEmail,
        promotionCode: data.promotionCode,
        discount: data.discount,
        success: result.success,
        error: result.success ? null : result.error,
      })
    );
    if (result.success) sent += 1;
  }

  console.log(`Done. Sent ${sent} confirmation email(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
