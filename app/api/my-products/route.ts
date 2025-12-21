import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
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

    // Get user's profile to check subscription and customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription, customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    const purchasedProductIds = new Set<string>();

    // Get purchased products from orders
    let paymentIntents: Stripe.PaymentIntent[] = [];
    const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();

    // Method 1: Try to fetch by customer_id from profile
    if (profile?.customer_id) {
      try {
        const customerPayments = await stripe.paymentIntents.list({
          customer: profile.customer_id,
          limit: 100,
        });
        customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
      } catch (error) {
        console.error("Error fetching by customer_id:", error);
      }
    }

    // Method 2: Search by user_id in metadata
    try {
      const searchResult = await stripe.paymentIntents.search({
        query: `metadata['user_id']:'${user.id}'`,
        limit: 100,
      });
      searchResult.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
    } catch (error) {
      console.log("Search API not available");
    }

    // Method 3: Search by email
    if (profile?.email) {
      try {
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 10,
        });
        
        for (const customer of customers.data) {
          try {
            const customerPayments = await stripe.paymentIntents.list({
              customer: customer.id,
              limit: 100,
            });
            customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
          } catch (error) {
            console.error("Error fetching payment intents:", error);
          }
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      }
    }

    paymentIntents = Array.from(allPaymentIntents.values());

    // Filter to only successful payment intents (completed orders)
    // Also check if they're refunded
    const successfulPayments = paymentIntents.filter(
      (pi) => pi.status === "succeeded"
    );

    // Extract product IDs from order items, excluding refunded orders
    for (const pi of successfulPayments) {
      // Check if order is refunded
      let isRefunded = false;
      if (pi.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge.id
          );
          isRefunded = charge.refunded || charge.amount_refunded === charge.amount;
        } catch (error) {
          console.error("Error checking refund status:", error);
        }
      }

      // Skip refunded orders
      if (isRefunded) {
        continue;
      }

      try {
        const cartItemsStr = pi.metadata?.cart_items;
        if (cartItemsStr) {
          const items = JSON.parse(cartItemsStr);
          for (const item of items) {
            if (item.id) {
              purchasedProductIds.add(item.id);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing cart items:", e);
      }
    }

    // Check for product grants (free licenses)
    if (profile?.email) {
      console.log(`[My Products] Checking product grants for email: ${profile.email.toLowerCase()}`);
      // Use service role client to bypass RLS for product_grants query
      const adminSupabase = await createSupabaseServiceRole();
      const { data: productGrants, error: grantsError } = await adminSupabase
        .from("product_grants")
        .select("product_id")
        .eq("user_email", profile.email.toLowerCase());

      if (grantsError) {
        console.error(`[My Products] Error fetching product grants:`, grantsError);
      }

      if (productGrants && productGrants.length > 0) {
        console.log(`[My Products] Found ${productGrants.length} product grants`);
        productGrants.forEach((grant) => {
          if (grant.product_id) {
            purchasedProductIds.add(grant.product_id);
          }
        });
      } else {
        console.log(`[My Products] No product grants found for ${profile.email.toLowerCase()}`);
      }
    }

    // If no purchased products, return empty
    if (purchasedProductIds.size === 0) {
      return NextResponse.json({
        success: true,
        products: [],
        source: "none",
      });
    }

    // Fetch product details for purchased products
    const productIdsArray = Array.from(purchasedProductIds);
    console.log(`[My Products] Fetching ${productIdsArray.length} products (${purchasedProductIds.size} unique IDs)`);
    // Use service role client for products query as well
    const adminSupabase = await createSupabaseServiceRole();
    const { data: products, error: productsError } = await adminSupabase
      .from("products")
      .select("id, name, slug, category, featured_image_url, short_description, tagline")
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError) {
      console.error("Error fetching purchased products:", productsError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch products",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      source: "purchases",
    });
  } catch (error) {
    console.error("Error fetching my products:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}

