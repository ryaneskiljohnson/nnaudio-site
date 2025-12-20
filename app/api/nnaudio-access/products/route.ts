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

    const hasActiveSubscription =
      profile?.subscription && profile.subscription !== "none";

    let productIds = new Set<string>();

    // If user has active subscription, they get access to all products
    if (hasActiveSubscription) {
      const { data: allProducts } = await supabase
        .from("products")
        .select("id")
        .eq("status", "active");

      if (allProducts) {
        allProducts.forEach((p) => productIds.add(p.id));
      }
    }

    // Also get individually purchased products
    if (profile?.customer_id) {
      try {
        const paymentIntents = await stripe.paymentIntents.list({
          customer: profile.customer_id,
          limit: 100,
        });

        const successfulPayments = paymentIntents.data.filter(
          (pi) => pi.status === "succeeded"
        );

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
                }
              }
            }
          } catch (e) {
            console.error("Error parsing cart items:", e);
          }
        }
      } catch (error) {
        console.error("Error fetching Stripe payments:", error);
      }
    }

    // Fetch products from Supabase
    const productIdsArray = Array.from(productIds);
    if (productIdsArray.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, slug")
      .in("id", productIdsArray)
      .eq("status", "active");

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

