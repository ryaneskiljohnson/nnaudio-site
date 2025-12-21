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

    // Use admin client to access profiles table (same as products endpoint logic)
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

    // Verify user has access to this product
    // Use EXACT same logic as products endpoint to ensure consistency
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("subscription, customer_id, email")
      .eq("id", userId)
      .single();

    console.log(`[NNAudio Access Product] User ${userId} profile:`, {
      subscription: profile?.subscription,
      customer_id: profile?.customer_id,
      email: profile?.email,
    });

    const hasActiveSubscription =
      profile?.subscription && profile.subscription !== "none";

    let productIds = new Set<string>();
    let nfrLicense: any = null;
    let productGrants: any[] = [];

    // Check NFR (Not For Resale) licenses first (highest priority) - SAME AS PRODUCTS ENDPOINT
    if (profile?.email) {
      const { data: nfrData } = await adminSupabase
        .from("user_management")
        .select("pro")
        .eq("user_email", profile.email.toLowerCase())
        .single();

      nfrLicense = nfrData;

      if (nfrLicense?.pro) {
        console.log(`[NNAudio Access Product] User has NFR license, granting all products`);
        const { data: allProducts } = await adminSupabase
          .from("products")
          .select("id")
          .eq("status", "active");

        if (allProducts) {
          allProducts.forEach((p) => productIds.add(p.id));
        }
      }

      // Check individual product grants
      const { data: grantsData } = await adminSupabase
        .from("product_grants")
        .select("product_id")
        .eq("user_email", profile.email.toLowerCase());

      productGrants = grantsData || [];

      if (productGrants.length > 0) {
        console.log(`[NNAudio Access Product] User has ${productGrants.length} product grants`);
        productGrants.forEach((grant) => {
          if (grant.product_id) {
            productIds.add(grant.product_id);
            console.log(`[NNAudio Access Product] Added granted product: ${grant.product_id}`);
          }
        });
      }
    }

    // If user has active subscription, they get access to all products - SAME AS PRODUCTS ENDPOINT
    if (hasActiveSubscription) {
      console.log(`[NNAudio Access Product] User has active subscription: ${profile?.subscription}`);
      const { data: allProducts } = await adminSupabase
        .from("products")
        .select("id")
        .eq("status", "active");

      if (allProducts) {
        allProducts.forEach((p) => productIds.add(p.id));
      }
    }

    // Also get individually purchased products - SAME AS PRODUCTS ENDPOINT
    // Add timeout to prevent hanging on slow Stripe calls
    if (profile?.customer_id || profile?.email) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-02-24.acacia",
      });

      try {
        const allPaymentIntents = new Map<string, any>();
        
        // Helper to add timeout to promises
        const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
            )
          ]);
        };

        const stripePromises: Promise<any>[] = [];

        // Method 1: Try to fetch by customer_id from profile (5 second timeout)
        if (profile?.customer_id) {
          stripePromises.push(
            withTimeout(
              stripe.paymentIntents.list({
                customer: profile.customer_id,
                limit: 100,
              }),
              5000
            ).then(customerPayments => {
              customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
              console.log(`[NNAudio Access Product] Found ${customerPayments.data.length} payment intents by customer_id`);
            }).catch(error => {
              console.error("[NNAudio Access Product] Error/timeout fetching by customer_id:", error.message);
            })
          );
        }

        // Method 2: Search by user_id in metadata (5 second timeout)
        stripePromises.push(
          withTimeout(
            stripe.paymentIntents.search({
              query: `metadata['user_id']:'${userId}'`,
              limit: 100,
            }),
            5000
          ).then(searchResult => {
            searchResult.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
            console.log(`[NNAudio Access Product] Found ${searchResult.data.length} payment intents by user_id metadata`);
          }).catch(error => {
            console.log("[NNAudio Access Product] Search API timeout/error:", error.message);
          })
        );

        // Method 3: Search by email (10 second timeout for customer list + payment intents)
        if (profile?.email) {
          stripePromises.push(
            withTimeout(
              stripe.customers.list({
                email: profile.email,
                limit: 10,
              }).then(customers => {
                const customerPromises = customers.data.map(customer =>
                  withTimeout(
                    stripe.paymentIntents.list({
                      customer: customer.id,
                      limit: 100,
                    }),
                    5000
                  ).then(customerPayments => {
                    customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
                  }).catch(error => {
                    console.error("[NNAudio Access Product] Error/timeout fetching payment intents:", error.message);
                  })
                );
                return Promise.allSettled(customerPromises);
              }),
              10000
            ).catch(error => {
              console.error("[NNAudio Access Product] Error/timeout searching customers:", error.message);
            })
          );
        }

        // Wait for all Stripe calls to complete (or timeout) - max 15 seconds total
        await Promise.race([
          Promise.allSettled(stripePromises),
          new Promise(resolve => setTimeout(resolve, 15000))
        ]);

        const paymentIntents = Array.from(allPaymentIntents.values());
        console.log(`[NNAudio Access Product] Total unique payment intents found: ${paymentIntents.length}`);

        // Filter to only successful payment intents
        const successfulPayments = paymentIntents.filter(
          (pi) => pi.status === "succeeded"
        );
        console.log(`[NNAudio Access Product] Successful payments: ${successfulPayments.length}`);

        // Process payment intents - skip refund checks to avoid timeout
        for (const pi of successfulPayments) {
          // Extract product IDs from cart items - SAME AS PRODUCTS ENDPOINT
          try {
            const cartItemsStr = pi.metadata?.cart_items;
            if (cartItemsStr) {
              const items = JSON.parse(cartItemsStr);
              for (const item of items) {
                if (item.id) {
                  productIds.add(item.id);
                  console.log(`[NNAudio Access Product] Added product ID from purchase: ${item.id}`);
                }
              }
            }
          } catch (e) {
            console.error("[NNAudio Access Product] Error parsing cart items:", e);
          }
        }
      } catch (error) {
        console.error("[NNAudio Access Product] Error checking purchase:", error);
      }
    }

    // First, try to find the product by UUID or legacy_product_id
    // This allows plugins to use either the new UUID or the old numeric ID
    let product: any = null;
    let actualProductId: string = productId;

    // Try UUID first (most common case)
    let { data: productByUuid, error: uuidError } = await adminSupabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("status", "active")
      .single();

    if (productByUuid && !uuidError) {
      product = productByUuid;
      actualProductId = product.id;
      console.log(`[NNAudio Access Product] Found product by UUID: ${productId}`);
    } else {
      // Try legacy_product_id if UUID lookup failed
      console.log(`[NNAudio Access Product] UUID lookup failed, trying legacy_product_id: ${productId}`);
      const { data: productByLegacyId, error: legacyError } = await adminSupabase
        .from("products")
        .select("*")
        .eq("legacy_product_id", productId)
        .eq("status", "active")
        .single();

      if (productByLegacyId && !legacyError) {
        product = productByLegacyId;
        actualProductId = product.id;
        console.log(`[NNAudio Access Product] Found product by legacy_product_id: ${productId} -> ${product.id}`);
      }
    }

    if (!product) {
      console.log(`[NNAudio Access Product] Product not found: ${productId} (tried UUID and legacy_product_id)`);
      return new Response(formatError("Product not found"), { status: 404 });
    }

    // Check if the user has access to this product (using the actual UUID)
    const hasAccess = productIds.has(actualProductId);
    console.log(`[NNAudio Access Product] Product ${actualProductId} in accessible products: ${hasAccess}`);
    console.log(`[NNAudio Access Product] Total accessible products: ${productIds.size}`);
    console.log(`[NNAudio Access Product] Accessible product IDs:`, Array.from(productIds).slice(0, 10));
    
    if (!hasAccess) {
      console.log(`[NNAudio Access Product] Access denied for user ${userId} (${profile?.email}) and product ${actualProductId}`);
      console.log(`[NNAudio Access Product] Debug info:`, {
        requestedProductId: productId,
        actualProductId,
        productName: product.name,
        productIdsSize: productIds.size,
        hasSubscription: hasActiveSubscription,
        subscriptionType: profile?.subscription,
        hasNFR: nfrLicense?.pro,
        productGrantsCount: productGrants?.length || 0,
      });
      return new Response(formatError("Access denied"), { status: 403 });
    }
    
    console.log(`[NNAudio Access Product] ✅ Access granted for ${product.name} (${actualProductId})`);

    // Format response to match WooCommerce format expected by desktop app
    const formattedProduct: any = {
      success: true, // Explicit success flag for plugin compatibility
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

    // Add downloads from the downloads JSON field
    // Support both new downloads array and legacy download_url field
    if (product.downloads && Array.isArray(product.downloads) && product.downloads.length > 0) {
      // New format: downloads array with path, name, type, etc.
      // Generate signed URLs for storage paths
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

      const downloadsWithUrls = await Promise.all(
        product.downloads.map(async (download: any) => {
          // If path looks like a storage path (doesn't start with http), generate signed URL
          if (download.path && !download.path.startsWith("http")) {
            try {
              const { data: signedUrlData } = await adminSupabase.storage
                .from("product-downloads")
                .createSignedUrl(download.path, 3600); // 1 hour expiry

              return {
                file: signedUrlData?.signedUrl || download.path,
                name: download.name || product.name,
                type: download.type || "plugin",
                version: download.version || product.download_version || null,
                file_size: download.file_size || null,
              };
            } catch (error) {
              console.error(
                `Error generating signed URL for ${download.path}:`,
                error
              );
              // Fallback to path if signed URL generation fails
              return {
                file: download.path,
                name: download.name || product.name,
                type: download.type || "plugin",
                version: download.version || product.download_version || null,
                file_size: download.file_size || null,
              };
            }
          } else {
            // Already a full URL (legacy or external)
            return {
              file: download.path || download.url,
              name: download.name || product.name,
              type: download.type || "plugin",
              version: download.version || product.download_version || null,
              file_size: download.file_size || null,
            };
          }
        })
      );

      formattedProduct.downloads = downloadsWithUrls;
      
      // Extract version from downloads array (preferred method)
      if (downloadsWithUrls.length > 0 && downloadsWithUrls[0].version) {
        formattedProduct.version = downloadsWithUrls[0].version;
      }
    } else if (product.download_url) {
      // Legacy format: single download_url field
      formattedProduct.downloads.push({
        file: product.download_url,
        name: product.name,
      });
    }

    // If version not found in downloads array, fall back to deprecated download_version field
    if (!formattedProduct.version && product.download_version) {
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

