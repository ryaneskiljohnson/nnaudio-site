"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Format error response
function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

// Validate Supabase token
async function validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    if (!token) return { valid: false };

    // Create a client with the token in Authorization header
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll(_cookiesToSet) {},
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { valid: false };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("[Token Validation] Error:", error);
    return { valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const token = body.get("token")?.toString() || "";

    // Validate token
    const { valid, userId } = await validateToken(token);
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    const supabase = await createClient();

    // Get user profile to check subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription, customer_id, email")
      .eq("id", userId)
      .single();

    console.log(`[NNAudio Access Products] User ${userId} profile:`, {
      subscription: profile?.subscription,
      customer_id: profile?.customer_id,
      email: profile?.email,
    });

    const hasActiveSubscription =
      profile?.subscription && profile.subscription !== "none";

    let productIds = new Set<string>();

    // Check NFR (Not For Resale) licenses first (highest priority)
    if (profile?.email) {
      const { data: nfrLicense } = await supabase
        .from("user_management")
        .select("pro")
        .eq("user_email", profile.email.toLowerCase())
        .single();

      if (nfrLicense?.pro) {
        console.log(`[NNAudio Access Products] User has NFR license, granting all products`);
        const { data: allProducts } = await supabase
          .from("products")
          .select("id")
          .eq("status", "active");

        if (allProducts) {
          allProducts.forEach((p) => productIds.add(p.id));
        }
        // NFR grants all products, but continue to also check individual purchases
      }
    }

    // If user has active subscription, they get access to all products
    if (hasActiveSubscription) {
      console.log(`[NNAudio Access Products] User has active subscription: ${profile?.subscription}`);
      const { data: allProducts } = await supabase
        .from("products")
        .select("id")
        .eq("status", "active");

      if (allProducts) {
        allProducts.forEach((p) => productIds.add(p.id));
      }
    }

    // Also get individually purchased products
    // Use multiple methods to find payment intents (same as my-products endpoint)
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
        console.log(`[NNAudio Access Products] Found ${customerPayments.data.length} payment intents by customer_id`);
      } catch (error) {
        console.error("Error fetching by customer_id:", error);
      }
    }

    // Method 2: Search by user_id in metadata
    try {
      const searchResult = await stripe.paymentIntents.search({
        query: `metadata['user_id']:'${userId}'`,
        limit: 100,
      });
      searchResult.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
      console.log(`[NNAudio Access Products] Found ${searchResult.data.length} payment intents by user_id metadata`);
    } catch (error) {
      console.log("[NNAudio Access Products] Search API not available or error:", error);
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
            console.log(`[NNAudio Access Products] Found ${customerPayments.data.length} payment intents for customer ${customer.id}`);
          } catch (error) {
            console.error("Error fetching payment intents:", error);
          }
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      }
    }

    paymentIntents = Array.from(allPaymentIntents.values());
    console.log(`[NNAudio Access Products] Total unique payment intents found: ${paymentIntents.length}`);

    // Filter to only successful payment intents
    const successfulPayments = paymentIntents.filter(
      (pi) => pi.status === "succeeded"
    );
    console.log(`[NNAudio Access Products] Successful payments: ${successfulPayments.length}`);

    for (const pi of successfulPayments) {
      // Check if refunded
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

      if (isRefunded) continue;

      // Extract product IDs from cart items
      try {
        const cartItemsStr = pi.metadata?.cart_items;
        if (cartItemsStr) {
          const items = JSON.parse(cartItemsStr);
          for (const item of items) {
            if (item.id) {
              productIds.add(item.id);
              console.log(`[NNAudio Access Products] Added product ID from purchase: ${item.id}`);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing cart items:", e);
      }
    }

    // Fetch products from Supabase
    const productIdsArray = Array.from(productIds);
    console.log(`[NNAudio Access Products] Found ${productIdsArray.length} product IDs:`, productIdsArray);
    
    if (productIdsArray.length === 0) {
      console.log(`[NNAudio Access Products] No products found for user`);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, slug, featured_image_url")
      .in("id", productIdsArray)
      .eq("status", "active");

    console.log(`[NNAudio Access Products] Fetched ${products?.length || 0} products from database`);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return new Response(formatError("Unable to fetch products"), {
        status: 500,
      });
    }

    // Format response to match WooCommerce downloads format expected by desktop app
    const formattedProducts = (products || []).map((product) => ({
      product_id: product.id,
      product_name: product.name,
      download_name: product.name, // For version extraction
      image_url: product.featured_image_url || null, // Include image URL for desktop app
    }));

    return new Response(JSON.stringify(formattedProducts), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[NNAudio Access Products] Error:", error);
    return new Response(formatError("Unable to handle products request"), {
      status: 500,
    });
  }
}

