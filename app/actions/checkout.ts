"use server";

import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";
import { stripe } from "@/utils/stripe/client";
import {
  isStripeCheckoutSessionId,
  isStripePaymentIntentId,
  isStripeCheckoutLookupId,
} from "@/utils/stripe/ids";

/**
 * @brief Resolves a Stripe customer id from a Checkout Session or PaymentIntent
 * and refreshes that user's subscription. Called from checkout-success without
 * exposing the customer id to the browser.
 */
export async function refreshSubscriptionByCheckoutSession(
  sessionId: string
): Promise<{
  success: boolean;
  subscription?: string;
  expiration?: string | null;
  error?: string;
}> {
  try {
    if (!sessionId || sessionId === "free-order") {
      return { success: false, error: "Missing session_id parameter" };
    }
    if (!isStripeCheckoutLookupId(sessionId)) {
      return { success: false, error: "Invalid session_id" };
    }

    const customerId = await resolveCustomerIdFromCheckoutLookup(sessionId);
    if (!customerId) {
      return { success: false, error: "No customer on this checkout" };
    }

    return refreshSubscriptionForCustomer(customerId);
  } catch (error) {
    console.error("[Checkout Refresh] Error:", error);
    return {
      success: false,
      error: "Failed to refresh subscription status",
    };
  }
}

async function resolveCustomerIdFromCheckoutLookup(
  sessionId: string
): Promise<string | null> {
  if (isStripePaymentIntentId(sessionId)) {
    const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);
    if (
      paymentIntent.status !== "succeeded" &&
      paymentIntent.status !== "processing"
    ) {
      return null;
    }
    if (typeof paymentIntent.customer === "string") {
      return paymentIntent.customer;
    }
    return paymentIntent.customer?.id ?? null;
  }

  if (!isStripeCheckoutSessionId(sessionId)) {
    return null;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid =
    session.status === "complete" ||
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!paid) {
    return null;
  }
  if (typeof session.customer === "string") {
    return session.customer;
  }
  if (session.customer && "id" in session.customer) {
    return session.customer.id;
  }
  return null;
}

async function refreshSubscriptionForCustomer(customerId: string): Promise<{
  success: boolean;
  subscription?: string;
  expiration?: string | null;
  error?: string;
}> {
  const supabase = await createSupabaseServiceRole();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("customer_id", customerId)
    .single();

  if (!profile || !profile.id) {
    return {
      success: false,
      error: "User not found for this customer ID",
    };
  }

  console.log(
    `[Checkout Refresh] Updating pro status for user ${profile.id}`
  );
  const result = await updateUserProStatus(profile.id);

  console.log(
    `[Checkout Refresh] Subscription updated: ${result.subscription} (${result.source})`
  );

  return {
    success: true,
    subscription: result.subscription,
    expiration: result.subscriptionExpiration?.toISOString() || null,
  };
}
