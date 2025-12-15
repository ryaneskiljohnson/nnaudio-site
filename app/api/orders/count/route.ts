import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function GET(request: NextRequest) {
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

    // Get user's profile to find customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.customer_id) {
      // If no customer_id, return 0 orders
      return NextResponse.json({ success: true, count: 0 });
    }

    // Count successful payment intents for this customer (completed orders only)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: profile.customer_id,
      limit: 100,
    });

    // Count only successful payment intents (matching the orders page)
    const successfulPayments = paymentIntents.data.filter(
      (pi) => pi.status === "succeeded"
    );

    return NextResponse.json({
      success: true,
      count: successfulPayments.length,
    });
  } catch (error) {
    console.error("Error fetching order count:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch order count",
      },
      { status: 500 }
    );
  }
}

