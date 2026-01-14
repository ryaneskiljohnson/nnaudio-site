"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
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

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", userId)
      .single();

    console.log(`[NNAudio Access Products] User ${userId} profile:`, {
      customer_id: profile?.customer_id,
      email: profile?.email,
    });

    let productIds = new Set<string>();

    // Check individual product grants
    if (profile?.email) {
      console.log(`[NNAudio Access Products] Checking product grants for email: ${profile.email.toLowerCase()}`);
      // Use service role client to bypass RLS for product_grants query
      const adminSupabase = await createSupabaseServiceRole();
      const { data: productGrants, error: grantsError } = await adminSupabase
        .from("product_grants")
        .select("product_id")
        .eq("user_email", profile.email.toLowerCase());

      if (grantsError) {
        console.error(`[NNAudio Access Products] Error fetching product grants:`, grantsError);
      }

      if (productGrants && productGrants.length > 0) {
        console.log(`[NNAudio Access Products] User has ${productGrants.length} product grants`);
        productGrants.forEach((grant) => {
          if (grant.product_id) {
            productIds.add(grant.product_id);
            console.log(`[NNAudio Access Products] Added granted product: ${grant.product_id}`);
          }
        });
      } else {
        console.log(`[NNAudio Access Products] No product grants found for ${profile.email.toLowerCase()}`);
      }
    }

    // Note: Subscriptions no longer grant all products automatically
    // Users must have individual product grants or purchases

    // Also get individually purchased products
    // Add timeout to prevent hanging on slow Stripe calls
    let paymentIntents: Stripe.PaymentIntent[] = [];
    const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();

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
          console.log(`[NNAudio Access Products] Found ${customerPayments.data.length} payment intents by customer_id`);
        }).catch(error => {
          console.error("[NNAudio Access Products] Error/timeout fetching by customer_id:", error.message);
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
        console.log(`[NNAudio Access Products] Found ${searchResult.data.length} payment intents by user_id metadata`);
      }).catch(error => {
        console.log("[NNAudio Access Products] Search API not available or error/timeout:", error.message);
      })
    );

    // Method 3: Search by email (5 second timeout)
    if (profile?.email) {
      stripePromises.push(
        withTimeout(
          stripe.customers.list({
            email: profile.email,
            limit: 10,
          }),
          5000
        ).then(customers => {
          const customerPromises: Promise<any>[] = [];
          for (const customer of customers.data) {
            customerPromises.push(
              withTimeout(
                stripe.paymentIntents.list({
                  customer: customer.id,
                  limit: 100,
                }),
                5000
              ).then(customerPayments => {
                customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
                console.log(`[NNAudio Access Products] Found ${customerPayments.data.length} payment intents for customer ${customer.id}`);
              }).catch(error => {
                console.error("[NNAudio Access Products] Error/timeout fetching payment intents:", error.message);
              })
            );
          }
          return Promise.allSettled(customerPromises);
        }).catch(error => {
          console.error("[NNAudio Access Products] Error/timeout searching customers:", error.message);
        })
      );
    }

    // Wait for all Stripe calls to complete (with timeouts)
    await Promise.allSettled(stripePromises);

    paymentIntents = Array.from(allPaymentIntents.values());
    console.log(`[NNAudio Access Products] Total unique payment intents found: ${paymentIntents.length}`);

    // Filter to only successful payment intents
    const successfulPayments = paymentIntents.filter(
      (pi) => pi.status === "succeeded"
    );
    console.log(`[NNAudio Access Products] Successful payments: ${successfulPayments.length}`);

    // Check refund status for all payments in parallel with timeouts
    const refundChecks = successfulPayments.map(async (pi) => {
      if (!pi.latest_charge) return { pi, isRefunded: false };
      
      try {
        const charge = await withTimeout(
          stripe.charges.retrieve(
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge.id
          ),
          3000 // 3 second timeout for charge retrieval
        );
        return { pi, isRefunded: charge.refunded || charge.amount_refunded === charge.amount };
      } catch (error) {
        console.error("[NNAudio Access Products] Error/timeout checking refund status:", error);
        return { pi, isRefunded: false }; // Assume not refunded on error
      }
    });

    const refundResults = await Promise.allSettled(refundChecks);
    
    for (const result of refundResults) {
      if (result.status === "rejected") continue;
      const { pi, isRefunded } = result.value;
      
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

    // Use service role client for products query as well
    const adminSupabase = await createSupabaseServiceRole();
    
    // First, fetch all products to check which ones are bundles (category: 'bundle')
    const { data: allProductsCheck, error: productsCheckError } = await adminSupabase
      .from("products")
      .select("id, slug, category")
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsCheckError) {
      console.error("[NNAudio Access Products] Error checking products:", productsCheckError);
      return new Response(formatError("Unable to check products"), {
        status: 500,
      });
    }

    // Find products that are bundles (category: 'bundle') - these should be excluded
    const bundleProductIdsToExclude = new Set<string>();
    const bundleSlugs = new Set<string>();
    
    (allProductsCheck || []).forEach((product) => {
      if (product.category === 'bundle') {
        bundleProductIdsToExclude.add(product.id);
        bundleSlugs.add(product.slug);
        console.log(`[NNAudio Access Products] Found bundle product to exclude: ${product.id} (slug: ${product.slug})`);
      }
    });

    // Get individual products from bundles and track which bundle each product comes from
    const individualBundleProductIds = new Set<string>();
    const productToBundleMap = new Map<string, string>(); // Maps product_id -> bundle_name
    
    if (bundleSlugs.size > 0) {
      // Find bundles in bundles table by matching slugs
      const { data: bundles, error: bundlesError } = await adminSupabase
        .from("bundles")
        .select("id, slug, name")
        .in("slug", Array.from(bundleSlugs))
        .eq("status", "active");

      if (bundlesError) {
        console.error("[NNAudio Access Products] Error checking bundles table:", bundlesError);
      } else if (bundles && bundles.length > 0) {
        console.log(`[NNAudio Access Products] Found ${bundles.length} bundle(s) in bundles table, fetching individual products`);
        
        // For each bundle, fetch all individual products in that bundle
        for (const bundle of bundles) {
          const { data: bundleProducts, error: bundleProductsError } = await adminSupabase
            .from("bundle_products")
            .select("product_id")
            .eq("bundle_id", bundle.id);

          if (bundleProductsError) {
            console.error(`[NNAudio Access Products] Error fetching products for bundle ${bundle.id}:`, bundleProductsError);
            continue;
          }

          if (bundleProducts && bundleProducts.length > 0) {
            console.log(`[NNAudio Access Products] Bundle ${bundle.id} (${bundle.name}) contains ${bundleProducts.length} individual products`);
            bundleProducts.forEach((bp) => {
              if (bp.product_id) {
                individualBundleProductIds.add(bp.product_id);
                productToBundleMap.set(bp.product_id, bundle.name);
                console.log(`[NNAudio Access Products] Added individual bundle product: ${bp.product_id} (from ${bundle.name})`);
              }
            });
          } else {
            console.log(`[NNAudio Access Products] Warning: Bundle ${bundle.id} has no products in bundle_products table`);
          }
        }
      }
    }

    // Separate regular product IDs (excluding bundle products)
    const regularProductIds = productIdsArray.filter((id) => !bundleProductIdsToExclude.has(id));
    
    // Combine regular products and individual bundle products (excluding bundle product IDs themselves)
    const allProductIds = [...regularProductIds, ...Array.from(individualBundleProductIds)];
    console.log(`[NNAudio Access Products] Fetching ${allProductIds.length} products (${regularProductIds.length} regular + ${individualBundleProductIds.size} from bundles, excluding ${bundleProductIdsToExclude.size} bundle product(s))`);

    if (allProductIds.length === 0) {
      console.log(`[NNAudio Access Products] No products to fetch after bundle expansion`);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch all products (regular products + bundle products, but NOT the bundles themselves)
    const { data: allProducts, error: allProductsError } = await adminSupabase
      .from("products")
      .select("id, name, slug, featured_image_url, legacy_product_id")
      .in("id", allProductIds)
      .eq("status", "active");

    if (allProductsError) {
      console.error("Error fetching all products:", allProductsError);
      return new Response(formatError("Unable to fetch products"), {
        status: 500,
      });
    }

    // Double-check: Filter out any products that are bundles (category: 'bundle')
    const finalProducts = (allProducts || []).filter((product) => !bundleProductIdsToExclude.has(product.id));
    
    console.log(`[NNAudio Access Products] Total products returned: ${finalProducts.length} (${allProducts?.length || 0} fetched, ${bundleProductIdsToExclude.size} bundle product(s) filtered out)`);

    // Format response to match WooCommerce downloads format expected by desktop app
    // Use legacy_product_id if available, otherwise fall back to UUID
    // This ensures plugins can check authorization using their legacy IDs
    const formattedProducts = finalProducts.map((product) => {
      const bundleName = productToBundleMap.get(product.id);
      if (bundleName) {
        console.log(`[NNAudio Access Products] Product ${product.id} (${product.name}) is from bundle: ${bundleName}`);
      }
      return {
        product_id: product.legacy_product_id || product.id, // Prefer legacy ID for plugin compatibility
        product_uuid: product.id, // Also include UUID for reference
        product_name: product.name,
        download_name: product.name, // For version extraction
        image_url: product.featured_image_url || null, // Include image URL for desktop app
        bundle_name: bundleName || null, // Include bundle name if product comes from a bundle
      };
    });
    
    console.log(`[NNAudio Access Products] Formatted ${formattedProducts.length} products, ${formattedProducts.filter(p => p.bundle_name).length} have bundle names`);

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

