"use server";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/client";

/**
 * API endpoint to get checkout session details for dataLayer tracking
 * Returns JSON instead of redirecting
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id parameter" },
      { status: 400 }
    );
  }

  try {
    // Embedded checkout (bundle) passes payment_intent id (pi_xxx) instead of session id
    if (sessionId.startsWith("pi_")) {
      const paymentIntent = await stripe.paymentIntents.retrieve(sessionId, {
        expand: ["invoice"],
      });
      const customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id ?? null;
      const value = (paymentIntent.amount_received || paymentIntent.amount)
        ? (paymentIntent.amount_received || paymentIntent.amount) / 100
        : null;
      const currency = (paymentIntent.currency ?? "usd").toUpperCase();
      let mode: "payment" | "subscription" = "payment";
      try {
        // Detect whether this PI came from a subscription invoice.
        const invoiceSearch = await stripe.invoices.search({
          query: `payment_intent:'${sessionId}'`,
          limit: 1,
        });
        const matchedInvoice = invoiceSearch.data?.[0] as any;
        if (matchedInvoice?.subscription) {
          mode = "subscription";
        }
      } catch (searchError) {
        console.warn(
          "[checkout-session-details] invoice search skipped for payment intent mode detection",
          searchError
        );
      }
      const tier = paymentIntent.metadata?.tier || null;
      const contentId =
        paymentIntent.metadata?.bundle_id ||
        paymentIntent.metadata?.plan_type ||
        null;
      const contentName =
        paymentIntent.metadata?.bundle_slug ||
        paymentIntent.metadata?.plan_name ||
        null;
      return NextResponse.json({
        success: true,
        value,
        currency,
        isTrial: false,
        mode,
        customerId,
        tier,
        contentId,
        contentName,
      });
    }

    // Retrieve the session directly to get amount_total for one-time payments
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "payment_intent", "customer"],
    });

    // Extract customer ID
    let customerId: string | null = null;
    if (session.customer) {
      customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer.id;
    }

    // Extract value and currency
    let value: number | null = null;
    let currency: string = "USD";
    let isTrial = false;
    let contentId: string | null = null;
    let contentName: string | null = null;
    let tier: string | null = null;

    if (session.mode === "subscription") {
      // Use what was actually charged today (includes promotions/discounts) when available.
      if (session.amount_total !== null && session.amount_total !== undefined) {
        value = session.amount_total / 100;
      }
      currency = session.currency?.toUpperCase() || "USD";
      contentId = (session.metadata?.plan_type as string) || null;
      contentName = (session.metadata?.plan_name as string) || null;
      tier = (session.metadata?.plan_type as string) || null;

      if (session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      isTrial = !!subscription.trial_end;

      // Fallback only if amount_total was not present.
      if (
        value === null &&
        !isTrial &&
        subscription.items?.data?.[0]?.price
      ) {
        value = (subscription.items.data[0].price.unit_amount || 0) / 100;
      }
      }
    } else if (session.mode === "payment" && session.amount_total) {
      // For one-time payments (lifetime), use amount_total
      value = session.amount_total / 100; // Convert cents to dollars
      currency = session.currency?.toUpperCase() || "USD";
      contentId = (session.metadata?.plan_type as string) || null;
      contentName = (session.metadata?.plan_name as string) || null;
      tier = (session.metadata?.plan_type as string) || null;
    }

    return NextResponse.json({
      success: true,
      value,
      currency,
      isTrial,
      mode: session.mode, // 'payment' for lifetime, 'subscription' for recurring
      customerId, // Customer ID from the checkout session
      contentId,
      contentName,
      tier,
    });
  } catch (error) {
    console.error("Error fetching checkout session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
