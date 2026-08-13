"use server";

import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCheckoutSessionResult } from "@/utils/stripe/actions";
import { isStripeCheckoutSessionId } from "@/utils/stripe/ids";

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  // If no session ID, redirect to error page
  if (!sessionId) {
    return NextResponse.redirect(
      new URL("/checkout-canceled?error=missing_session_id", request.url)
    );
  }

  if (!isStripeCheckoutSessionId(sessionId)) {
    return NextResponse.redirect(
      new URL("/checkout-canceled?error=invalid_session_id", request.url)
    );
  }

  try {
    // Get session details from Stripe
    const sessionResult = await getCheckoutSessionResult(sessionId);

    // If session retrieval failed, redirect to canceled page with error
    if (!sessionResult.success) {
      return NextResponse.redirect(
        new URL(
          `/checkout-canceled?error=${encodeURIComponent(
            sessionResult.error || "payment_verification_failed"
          )}`,
          request.url
        )
      );
    }

    // Check if payment was successful
    const isPaymentSuccessful =
      sessionResult.status === "complete" ||
      sessionResult.paymentStatus === "succeeded" ||
      sessionResult.paymentStatus === "paid";

    if (!isPaymentSuccessful) {
      return NextResponse.redirect(
        new URL(
          `/checkout-canceled?error=payment_incomplete&status=${sessionResult.status}`,
          request.url
        )
      );
    }

    // Check if user is signed up from metadata (set when checkout is initiated)
    // If user was logged in when starting checkout, is_signed_up will be "true"
    const isSignedUp = sessionResult.metadata?.is_signed_up === "true";

    // Determine if this is a free trial
    const isTrial =
      sessionResult.mode === "subscription" &&
      (sessionResult.hasTrialPeriod === true ||
        (sessionResult.subscription &&
          typeof sessionResult.subscription !== "string" &&
          sessionResult.subscription.trial_end));

    // Determine if this is a lifetime purchase (one-time payment)
    const isLifetime = sessionResult.mode === "payment";

    // Paid amount for success page + promotion revenue (prefer session amount_total = actual charge)
    let subscriptionValue: number | undefined;
    let subscriptionCurrency: string | undefined;

    if (
      !isTrial &&
      sessionResult.amountTotal != null &&
      sessionResult.amountTotal > 0
    ) {
      subscriptionValue = sessionResult.amountTotal / 100;
      subscriptionCurrency = (sessionResult.currency || "usd").toUpperCase();
    } else if (
      !isTrial &&
      sessionResult.subscription &&
      typeof sessionResult.subscription !== "string" &&
      sessionResult.subscription.items?.data?.[0]?.price
    ) {
      const subscription = sessionResult.subscription;
      subscriptionValue =
        (subscription.items.data[0].price.unit_amount || 0) / 100;
      subscriptionCurrency = subscription.currency?.toUpperCase() || "USD";
    }

    // If this is a subscription with a trial, immediately refresh subscription status
    // This helps avoid race conditions where the plugin checks before webhook processes
    if (
      isTrial &&
      sessionResult.subscription &&
      typeof sessionResult.subscription !== "string"
    ) {
      try {
        const subscription = sessionResult.subscription;
        const userId = sessionResult.metadata?.user_id;

        if (userId && USER_ID_RE.test(userId)) {
          // Import and call subscription check to update profile immediately
          const { updateUserProStatus } = await import(
            "@/utils/subscriptions/check-subscription"
          );
          await updateUserProStatus(userId);
          console.log(
            `[Checkout Result] Refreshed subscription status for user ${userId} after trial signup`
          );
        }
      } catch (error) {
        console.error(
          "[Checkout Result] Error refreshing subscription status:",
          error
        );
        // Don't fail the redirect if this fails - webhook will handle it
      }
    }

    // Build redirect URL with all necessary parameters
    const params = new URLSearchParams({
      isSignedUp: isSignedUp.toString(),
      isTrial: (isTrial ?? false).toString(),
      isLifetime: isLifetime.toString(),
      session_id: sessionId,
    });

    if (subscriptionValue !== undefined && subscriptionCurrency) {
      params.append("value", subscriptionValue.toString());
      params.append("currency", subscriptionCurrency);
    }

    const planTypeMeta = sessionResult.metadata?.plan_type?.trim();
    if (planTypeMeta) {
      params.append("plan_type", planTypeMeta);
    }
    const promotionMeta = sessionResult.metadata?.promotion_id?.trim();
    if (promotionMeta) {
      params.append("promotion_id", promotionMeta);
    }

    // Payment successful, redirect to success page with appropriate parameters
    return NextResponse.redirect(
      new URL(`/checkout-success?${params.toString()}`, request.url)
    );
  } catch (error) {
    console.error("Error processing checkout:", error);
    return NextResponse.redirect(
      new URL("/checkout-canceled?error=server_error", request.url)
    );
  }
}
