"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Format error response
function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

// Validate Supabase token
async function validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    if (!token) return { valid: false };

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
    const downloadPath = body.get("path")?.toString() || "";

    if (!productId || !downloadPath) {
      return new Response(
        formatError("product_id and path are required"),
        { status: 400 }
      );
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

    // Check product grants
    if (!hasAccess && profile?.email) {
      const { data: productGrant } = await supabase
        .from("product_grants")
        .select("product_id")
        .eq("user_email", profile.email.toLowerCase())
        .eq("product_id", productId)
        .single();

      if (productGrant) {
        hasAccess = true;
        console.log(`[NNAudio Access Download] User has product grant for ${productId}`);
      }
    }

    // Check NFR license
    if (!hasAccess) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      if (userProfile?.email) {
        const { data: nfrLicense } = await supabase
          .from("user_management")
          .select("pro")
          .eq("user_email", userProfile.email.toLowerCase())
          .single();

        if (nfrLicense?.pro) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return new Response(formatError("Access denied"), { status: 403 });
    }

    // Verify the download path belongs to this product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("downloads")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return new Response(formatError("Product not found"), { status: 404 });
    }

    // Check if download path exists in product's downloads
    const downloads = product.downloads || [];
    const downloadExists = downloads.some(
      (d: any) => d.path === downloadPath
    );

    if (!downloadExists) {
      return new Response(formatError("Download not found for this product"), {
        status: 404,
      });
    }

    // Generate signed URL using admin client (has service role key)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate signed URL valid for 1 hour
    const { data: signedUrlData, error: signedUrlError } =
      await adminSupabase.storage
        .from("product-downloads")
        .createSignedUrl(downloadPath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      console.error("Error generating signed URL:", signedUrlError);
      return new Response(formatError("Unable to generate download URL"), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: signedUrlData.signedUrl,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[NNAudio Access Download] Error:", error);
    return new Response(formatError("Unable to handle download request"), {
      status: 500,
    });
  }
}

