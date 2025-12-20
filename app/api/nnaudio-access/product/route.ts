"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
    const productId = body.get("product_id")?.toString() || "";

    if (!productId) {
      return new Response(formatError("product_id is required"), { status: 400 });
    }

    // Validate token
    const { valid, userId } = await validateToken(token);
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    const supabase = await createClient();

    // Verify user has access to this product
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription, customer_id")
      .eq("id", userId)
      .single();

    const hasActiveSubscription =
      profile?.subscription && profile.subscription !== "none";

    // Check if user has purchased this product or has subscription
    let hasAccess = hasActiveSubscription;

    if (!hasAccess && profile?.customer_id) {
      // Check if product was purchased individually
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-02-24.acacia",
      });

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
              // Continue if charge check fails
            }
          }

          if (isRefunded) continue;

          try {
            const cartItemsStr = pi.metadata?.cart_items;
            if (cartItemsStr) {
              const items = JSON.parse(cartItemsStr);
              if (items.some((item: any) => item.id === productId)) {
                hasAccess = true;
                break;
              }
            }
          } catch (e) {
            // Continue if parsing fails
          }
        }
      } catch (error) {
        console.error("Error checking purchase:", error);
      }
    }

    if (!hasAccess) {
      return new Response(formatError("Access denied"), { status: 403 });
    }

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return new Response(formatError("Product not found"), { status: 404 });
    }

    // Format response to match WooCommerce format expected by desktop app
    const formattedProduct: any = {
      id: product.id,
      name: product.name,
      images: [],
      downloads: [],
    };

    // Add image if available
    if (product.featured_image_url) {
      formattedProduct.images.push({
        src: product.featured_image_url,
        alt: product.name,
      });
    }

    // Add download URL if available
    // The desktop app expects downloads array with file property
    if (product.download_url) {
      formattedProduct.downloads.push({
        file: product.download_url,
        name: product.name,
      });
    }

    // If product has version, extract it
    if (product.download_version) {
      formattedProduct.version = product.download_version;
    }

    return new Response(JSON.stringify(formattedProduct), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[NNAudio Access Product] Error:", error);
    return new Response(formatError("Unable to handle product request"), {
      status: 500,
    });
  }
}

