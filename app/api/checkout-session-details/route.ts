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
      const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);
      const customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id ?? null;
      const value = paymentIntent.amount ? paymentIntent.amount / 100 : null;
      const currency = (paymentIntent.currency ?? "usd").toUpperCase();
      return NextResponse.json({
        success: true,
        value,
        currency,
        isTrial: false,
        mode: "payment",
        customerId,
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

    if (session.mode === "subscription" && session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      isTrial = !!subscription.trial_end;

      if (!isTrial && subscription.items?.data?.[0]?.price) {
        value = (subscription.items.data[0].price.unit_amount || 0) / 100;
        currency = subscription.currency?.toUpperCase() || "USD";
      }
    } else if (session.mode === "payment" && session.amount_total) {
      // For one-time payments (lifetime), use amount_total
      value = session.amount_total / 100; // Convert cents to dollars
      currency = session.currency?.toUpperCase() || "USD";
    }

    return NextResponse.json({
      success: true,
      value,
      currency,
      isTrial,
      mode: session.mode, // 'payment' for lifetime, 'subscription' for recurring
      customerId, // Customer ID from the checkout session
    });
  } catch (error) {
    console.error("Error fetching checkout session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
