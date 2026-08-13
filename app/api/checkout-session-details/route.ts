"use server";

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/utils/stripe/client";
import {
  isStripeCheckoutSessionId,
  isStripePaymentIntentId,
} from "@/utils/stripe/ids";

/**
 * Public analytics helper for the checkout-success page.
 * Returns amount/mode/metadata only — never Stripe customer ids.
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

  // Free $0 checkout redirects with a synthetic id — not a Stripe session.
  if (sessionId === "free-order") {
    return NextResponse.json({
      success: true,
      value: 0,
      currency: "USD",
      isTrial: false,
      mode: "payment",
      tier: null,
      promotion_id: null,
      contentId: "free-order",
      contentName: "Free order",
    });
  }

  try {
    if (isStripePaymentIntentId(sessionId)) {
      const paymentIntent = await stripe.paymentIntents.retrieve(sessionId, {
        expand: ["invoice"],
      });
      const value = (paymentIntent.amount_received || paymentIntent.amount)
        ? (paymentIntent.amount_received || paymentIntent.amount) / 100
        : null;
      const currency = (paymentIntent.currency ?? "usd").toUpperCase();
      let mode: "payment" | "subscription" = "payment";
      try {
        const invoiceSearch = await stripe.invoices.search({
          query: `payment_intent:'${sessionId}'`,
          limit: 1,
        });
        const matchedInvoice = invoiceSearch.data?.[0] as {
          subscription?: unknown;
        };
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
      const promotionId =
        (paymentIntent.metadata?.promotion_id as string | undefined)?.trim() ||
        null;

      return NextResponse.json({
        success: true,
        value,
        currency,
        isTrial: false,
        mode,
        tier,
        promotion_id: promotionId,
        contentId,
        contentName,
      });
    }

    if (!isStripeCheckoutSessionId(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session_id parameter" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "payment_intent"],
    });

    let value: number | null = null;
    let currency: string = "USD";
    let isTrial = false;
    let contentId: string | null = null;
    let contentName: string | null = null;
    let tier: string | null = null;

    if (session.mode === "subscription") {
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

        if (
          value === null &&
          !isTrial &&
          subscription.items?.data?.[0]?.price
        ) {
          value = (subscription.items.data[0].price.unit_amount || 0) / 100;
        }
      }
    } else if (session.mode === "payment" && session.amount_total) {
      value = session.amount_total / 100;
      currency = session.currency?.toUpperCase() || "USD";
      contentId = (session.metadata?.plan_type as string) || null;
      contentName = (session.metadata?.plan_name as string) || null;
      tier = (session.metadata?.plan_type as string) || null;
    }

    const promotionId =
      (session.metadata?.promotion_id as string | undefined)?.trim() || null;

    return NextResponse.json({
      success: true,
      value,
      currency,
      isTrial,
      mode: session.mode,
      contentId,
      contentName,
      tier,
      promotion_id: promotionId,
    });
  } catch (error) {
    console.error("Error fetching checkout session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
