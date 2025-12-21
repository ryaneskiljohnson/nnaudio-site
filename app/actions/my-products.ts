"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  featured_image_url: string | null;
  short_description: string | null;
  tagline: string | null;
}

export async function getMyProducts(): Promise<{
  success: boolean;
  products: Product[];
  source: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        products: [],
        source: "none",
        error: "Not authenticated",
      };
    }

    // Get user's profile to check subscription and customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription, customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        products: [],
        source: "none",
        error: "Failed to fetch profile",
      };
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
        console.error("[My Products] Error fetching by customer_id:", error);
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
      console.log("[My Products] Search API not available");
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
            console.error("[My Products] Error fetching payment intents:", error);
          }
        }
      } catch (error) {
        console.error("[My Products] Error searching customers:", error);
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
          console.error("[My Products] Error checking refund status:", error);
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
        console.error("[My Products] Error parsing cart items:", e);
      }
    }

    // Check for product grants (free licenses)
    if (profile?.email) {
      const adminSupabase = await createSupabaseServiceRole();
      const { data: productGrants, error: grantsError } = await adminSupabase
        .from("product_grants")
        .select("product_id")
        .eq("user_email", profile.email.toLowerCase());

      if (grantsError) {
        console.error("[My Products] Error fetching product grants:", grantsError);
      }

      if (productGrants && productGrants.length > 0) {
        productGrants.forEach((grant) => {
          if (grant.product_id) {
            purchasedProductIds.add(grant.product_id);
          }
        });
      }
    }

    // If no purchased products, return empty
    if (purchasedProductIds.size === 0) {
      return {
        success: true,
        products: [],
        source: "none",
      };
    }

    // Fetch product details for purchased products
    const productIdsArray = Array.from(purchasedProductIds);
    const adminSupabase = await createSupabaseServiceRole();
    const { data: products, error: productsError } = await adminSupabase
      .from("products")
      .select("id, name, slug, category, featured_image_url, short_description, tagline")
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError) {
      console.error("[My Products] Error fetching purchased products:", productsError);
      return {
        success: false,
        products: [],
        source: "none",
        error: "Failed to fetch products",
      };
    }

    return {
      success: true,
      products: (products || []) as Product[],
      source: "purchases",
    };
  } catch (error) {
    console.error("[My Products] Error fetching my products:", error);
    return {
      success: false,
      products: [],
      source: "none",
      error: error instanceof Error ? error.message : "Failed to fetch products",
    };
  }
}

