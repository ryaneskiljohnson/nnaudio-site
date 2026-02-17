/**
 * @fileoverview Creates a SetupIntent so the user can add a payment method on-site (no redirect).
 * @module api/setup-intent
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/utils/stripe/client";

/**
 * @brief Creates a SetupIntent for the authenticated user's customer
 * @returns JSON with client_secret for Stripe Elements confirmCardSetup
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json(
        { error: "No billing customer. Complete a purchase first." },
        { status: 400 }
      );
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: profile.customer_id,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error: any) {
    console.error("[SetupIntent] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create setup intent" },
      { status: 500 }
    );
  }
}
