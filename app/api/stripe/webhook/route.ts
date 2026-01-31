"use server";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { invalidateUserProductCache } from "@/lib/product-cache";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    // Extract customer ID from event
    const customerId = extractCustomerId(event);

    if (!customerId) {
      console.log("No customer ID found in event, skipping");
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
