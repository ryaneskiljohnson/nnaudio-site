/**
 * @fileoverview Stripe webhook: cache invalidation and branded order confirmation emails.
 * @module app/api/stripe/webhook/route
 *
 * On checkout.session.completed we send an NNAudio-branded order confirmation via SendGrid.
 * On refund.created we send an NNAudio-branded refund confirmation email.
 * In Stripe Dashboard → Settings → Customer emails you can turn off Stripe’s default receipts if desired.
 */
"use server";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
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
 * Fetches admin emails that should receive a copy of the order confirmation.
 * @param isPaidOrder - true when order total > 0
 * @param isFreeOrder - true when order total === 0
 * @returns Array of admin email addresses (no duplicates)
 */
async function getAdminEmailsForOrderCopy(
  isPaidOrder: boolean,
  isFreeOrder: boolean
): Promise<string[]> {
  if (!isPaidOrder && !isFreeOrder) return [];
  const supabase = await createSupabaseServiceRole();
  const { data: rows, error } = await supabase
    .from("admin_notification_preferences")
    .select("user_id, notify_on_paid_order, notify_on_free_order")
    .or("notify_on_paid_order.eq.true,notify_on_free_order.eq.true");

  if (error || !rows?.length) return [];
  const wantCopy = rows.filter(
    (r) =>
      (isPaidOrder && r.notify_on_paid_order) ||
      (isFreeOrder && r.notify_on_free_order)
  );
  const userIds = [...new Set(wantCopy.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email")
    .in("id", userIds)
    .not("email", "is", null);
  const emails = (profiles ?? [])
    .map((p) => p.email as string)
    .filter((e): e is string => Boolean(e));
  return [...new Set(emails)];
}

/**
 * Sends branded order confirmation email for a completed checkout session (payment mode).
 * Uses NNAudio branding; receipt URL from Stripe charge when available.
 * Also sends a copy to admins who opted in (paid vs free order toggles).
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

  const { sendEmail } = await import("@/utils/email");
  const data = {
    customerEmail: email,
    customerName: customerName,
    orderNumber: fullSession.id.slice(-12).toUpperCase(),
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

  const isFreeOrder = amountTotal === 0;
  const isPaidOrder = amountTotal > 0;
  const adminEmails = await getAdminEmailsForOrderCopy(isPaidOrder, isFreeOrder);
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

  try {
    console.log("Processing Stripe event:", event.type, "at", dateTime);

    // Send branded order confirmation email for completed checkouts
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        await sendOrderConfirmationEmail(session);
      } catch (emailError) {
        console.error("Order confirmation email error:", emailError);
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
    }

    // Extract customer ID from event
    const customerId = extractCustomerId(event);

    if (!customerId) {
      return NextResponse.json({ status: "success", event: event.type });
    }

    // Find user by customer ID
    const userId = await findUserIdByCustomerId(customerId);

    // If user exists, invalidate product cache so next fetch gets fresh purchase data
    if (userId) {
      invalidateUserProductCache(userId);
    }

    return NextResponse.json({ status: "success", event: event.type });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error", error });
  }
}
