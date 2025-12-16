import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";
import { reactivateSubscription } from "@/utils/stripe/actions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Get user's profile to verify customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json(
        { success: false, error: "Customer ID not found" },
        { status: 400 }
      );
    }

    // Get the subscription to verify it belongs to this user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (
      typeof subscription.customer === "string"
        ? subscription.customer !== profile.customer_id
        : subscription.customer.id !== profile.customer_id
    ) {
      return NextResponse.json(
        { success: false, error: "Subscription does not belong to this user" },
        { status: 403 }
      );
    }

    // Check subscription status
    if (subscription.status === "canceled") {
      // Fully cancelled subscription - need to create a new one
      // Get the price ID from the cancelled subscription
      const priceId = subscription.items.data[0]?.price.id;
      
      if (!priceId) {
        return NextResponse.json(
          { success: false, error: "Could not determine subscription plan" },
          { status: 400 }
        );
      }

      // Create a new subscription with the same price
      const newSubscription = await stripe.subscriptions.create({
        customer: profile.customer_id,
        items: [{ price: priceId }],
        metadata: {
          user_id: user.id,
          reactivated_from: subscriptionId,
        },
      });

      return NextResponse.json({
        success: true,
        subscription: {
          id: newSubscription.id,
          status: newSubscription.status,
        },
        message: "Subscription reactivated successfully",
      });
    } else if (subscription.cancel_at_period_end) {
      // Scheduled to cancel - can reactivate
      const result = await reactivateSubscription(subscriptionId);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          subscription: result.subscription,
          message: "Subscription reactivated successfully",
        });
      } else {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to reactivate subscription" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Subscription is not cancelled" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reactivate subscription",
      },
      { status: 500 }
    );
  }
}

