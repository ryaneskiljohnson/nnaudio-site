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

    // Get user's profile to find customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", user.id)
      .single();

    console.log("[Orders API] User ID:", user.id);
    console.log("[Orders API] Profile customer_id:", profile?.customer_id);
    console.log("[Orders API] Profile email:", profile?.email);

    let paymentIntents: Stripe.PaymentIntent[] = [];
    const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();

    // Method 1: Try to fetch by customer_id from profile
    if (profile?.customer_id) {
      try {
        const customerPayments = await stripe.paymentIntents.list({
          customer: profile.customer_id,
          limit: 100,
        });
        console.log(`[Orders API] Found ${customerPayments.data.length} payment intents by customer_id`);
        customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
      } catch (error) {
        console.error("[Orders API] Error fetching by customer_id:", error);
      }
    }

    // Method 2: Search by user_id in metadata
    try {
      const searchResult = await stripe.paymentIntents.search({
        query: `metadata['user_id']:'${user.id}'`,
        limit: 100,
      });
      console.log(`[Orders API] Found ${searchResult.data.length} payment intents by user_id metadata`);
      searchResult.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
    } catch (error) {
      console.log("[Orders API] Search API not available or error:", error);
    }

    // Method 3: If we have an email, find customers by email and get their payment intents
    if (profile?.email) {
      try {
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 10,
        });
        console.log(`[Orders API] Found ${customers.data.length} customers by email`);
        
        for (const customer of customers.data) {
          try {
            const customerPayments = await stripe.paymentIntents.list({
              customer: customer.id,
              limit: 100,
            });
            console.log(`[Orders API] Found ${customerPayments.data.length} payment intents for customer ${customer.id}`);
            customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
          } catch (error) {
            console.error(`[Orders API] Error fetching payment intents for customer ${customer.id}:`, error);
          }
        }
      } catch (error) {
        console.error("[Orders API] Error searching customers by email:", error);
      }
    }

    // Method 4: As a last resort, list all recent payment intents and filter by metadata
    // This is less efficient but ensures we don't miss anything
    if (allPaymentIntents.size === 0) {
      try {
        console.log("[Orders API] Trying to list all recent payment intents as fallback...");
        const recentPayments = await stripe.paymentIntents.list({
          limit: 100,
        });
        console.log(`[Orders API] Found ${recentPayments.data.length} total recent payment intents`);
        
        // Filter by user_id in metadata
        const userPayments = recentPayments.data.filter(
          pi => pi.metadata?.user_id === user.id
        );
        console.log(`[Orders API] Filtered to ${userPayments.length} payment intents matching user_id`);
        userPayments.forEach(pi => allPaymentIntents.set(pi.id, pi));
      } catch (error) {
        console.error("[Orders API] Error listing all payment intents:", error);
      }
    }

    paymentIntents = Array.from(allPaymentIntents.values());
    console.log(`[Orders API] Total unique payment intents found: ${paymentIntents.length}`);

    // Filter to only successful payment intents (completed orders)
    const successfulPayments = paymentIntents.filter(
      (pi) => pi.status === "succeeded"
    );
    console.log(`[Orders API] Successful payment intents: ${successfulPayments.length}`);

    // Get product grants to show as orders (with recorded amount for historical record)
    let grantedProducts: Array<{
      id: string;
      product_id: string;
      granted_at: string;
      notes: string | null;
      amount?: number;
    }> = [];
    
    if (profile?.email) {
      console.log(`[Orders API] Checking product grants for email: ${profile.email.toLowerCase()}`);
      // Use service role client to bypass RLS for product_grants query
      const adminSupabase = await createSupabaseServiceRole();
      const { data: grants, error: grantsError } = await (adminSupabase as any)
        .from("product_grants")
        .select("id, product_id, granted_at, notes, amount")
        .eq("user_email", profile.email.toLowerCase())
        .order("granted_at", { ascending: false });

      if (grantsError) {
        console.error(`[Orders API] Error fetching product grants:`, grantsError);
      }

      if (grants) {
        grantedProducts = grants as typeof grantedProducts;
        console.log(`[Orders API] Found ${grants.length} product grants:`, grants);
      } else {
        console.log(`[Orders API] No product grants found for ${profile.email.toLowerCase()}`);
      }
    } else {
      console.log(`[Orders API] No profile email found, skipping product grants check`);
    }

    // Transform payment intents into orders
    const orders = await Promise.all(
      successfulPayments.map(async (pi) => {
        // Parse cart items from metadata
        let items: any[] = [];
        try {
          const cartItemsStr = pi.metadata?.cart_items;
          if (cartItemsStr) {
            items = JSON.parse(cartItemsStr);
          }
        } catch (e) {
          console.error("Error parsing cart items:", e);
        }

        // Fetch product details from Supabase for each item
        if (items.length > 0) {
          const productIds = items.map(item => item.id).filter(Boolean);
          if (productIds.length > 0) {
            try {
              const { data: products, error: productsError } = await (supabase as any)
                .from("products")
                .select("id, name, slug, featured_image_url")
                .in("id", productIds);

              if (!productsError && products) {
                // Create a map of product ID to product details
                const productList = products as { id: string; featured_image_url?: string | null; slug?: string | null }[];
                const productMap = new Map(productList.map((p: { id: string; featured_image_url?: string | null; slug?: string | null }) => [p.id, p]));
                
                // Enrich items with product details
                items = items.map(item => ({
                  ...item,
                  product_image: productMap.get(item.id)?.featured_image_url || null,
                  product_slug: productMap.get(item.id)?.slug || null,
                }));
              }
            } catch (error) {
              console.error("Error fetching product details:", error);
            }
          }
        }

        // Get promotion code name if available
        let promotionCodeName: string | null = null;
        if (pi.metadata?.promotion_code) {
          try {
            const promoCodeId = pi.metadata.promotion_code;
            // Check if it's a promotion code ID (starts with 'promo_')
            if (promoCodeId.startsWith('promo_')) {
              const promoCode = await stripe.promotionCodes.retrieve(promoCodeId);
              promotionCodeName = promoCode.code || promoCodeId;
            } else {
              // It's already a code string
              promotionCodeName = promoCodeId;
            }
          } catch (error) {
            console.error("Error fetching promotion code:", error);
            // Fallback to the stored value
            promotionCodeName = pi.metadata.promotion_code;
          }
        }

        // Get charge details if available
        let receiptUrl: string | null = null;
        let invoiceId: string | null = null;
        let refundedAmount = 0;
        let isRefunded = false;
        let isPartiallyRefunded = false;
        let refunds: Array<{
          id: string;
          amount: number;
          reason: string | null;
          status: string;
          created: number;
        }> = [];
        
        if (pi.latest_charge) {
          const charge = await stripe.charges.retrieve(
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge.id,
            { expand: ['refunds'] }
          );
          receiptUrl = charge.receipt_url;
          
          // Check for refunds
          if (charge.refunded) {
            isRefunded = true;
            refundedAmount = charge.amount_refunded / 100; // Convert from cents
          } else if (charge.amount_refunded > 0) {
            isPartiallyRefunded = true;
            refundedAmount = charge.amount_refunded / 100; // Convert from cents
          }

          // Get refund details
          if (charge.refunds && charge.refunds.data) {
            refunds = charge.refunds.data.map((refund) => ({
              id: refund.id,
              amount: refund.amount / 100, // Convert from cents
              reason: refund.reason,
              status: refund.status ?? '',
              created: refund.created,
            }));
          } else if (charge.amount_refunded > 0) {
            // If refunds aren't expanded, fetch them separately
            try {
              const refundsList = await stripe.refunds.list({
                charge: charge.id,
                limit: 100,
              });
              refunds = refundsList.data.map((refund) => ({
                id: refund.id,
                amount: refund.amount / 100, // Convert from cents
                reason: refund.reason,
                status: refund.status ?? '',
                created: refund.created,
              }));
            } catch (error) {
              console.error("Error fetching refunds:", error);
            }
          }
        }

        // Try to get invoice if available
        if (pi.invoice) {
          const invoice = await stripe.invoices.retrieve(
            typeof pi.invoice === "string" ? pi.invoice : pi.invoice.id
          );
          invoiceId = invoice.id;
          if (!receiptUrl && invoice.hosted_invoice_url) {
            receiptUrl = invoice.hosted_invoice_url;
          }
        }

        return {
          id: pi.id,
          orderNumber: pi.id.substring(3, 11).toUpperCase(), // Use part of payment intent ID as order number
          date: new Date(pi.created * 1000).toISOString(),
          status: pi.status,
          amount: pi.amount / 100, // Convert from cents
          currency: pi.currency.toUpperCase(),
          items: items,
          metadata: {
            original_total: pi.metadata?.original_total,
            discount_amount: pi.metadata?.discount_amount,
            total_amount: pi.metadata?.total_amount,
            promotion_code: promotionCodeName || pi.metadata?.promotion_code,
          },
          receiptUrl,
          invoiceId,
          refundedAmount,
          isRefunded,
          isPartiallyRefunded,
          refunds,
        };
      })
    );

    // Add product grants as $0 orders
    console.log(`[Orders API] Processing ${grantedProducts.length} product grants`);
    if (grantedProducts.length > 0) {
      const grantProductIds = grantedProducts.map(g => g.product_id);
      console.log(`[Orders API] Fetching product details for IDs:`, grantProductIds);
      
      // Use service role client for product query as well
      const adminSupabaseForProducts = await createSupabaseServiceRole();
      const { data: grantProducts, error: productsError } = await (adminSupabaseForProducts as any)
        .from("products")
        .select("id, name, slug, featured_image_url")
        .in("id", grantProductIds)
        .eq("status", "active");

      if (productsError) {
        console.error(`[Orders API] Error fetching grant products:`, productsError);
      }

      if (grantProducts) {
        console.log(`[Orders API] Found ${grantProducts.length} products for grants`);
        const grantProductList = grantProducts as { id: string; name?: string; slug?: string | null; featured_image_url?: string | null }[];
        const productMap = new Map(grantProductList.map((p: { id: string; name?: string; slug?: string | null; featured_image_url?: string | null }) => [p.id, p]));
        
        // Group grants by (user_email, minute) so batches created together appear as one order
        const MINUTE_MS = 60 * 1000;
        const grantGroups = new Map<string, Array<{ grant: typeof grantedProducts[0]; product: any; recordedAmount: number }>>();

        for (const grant of grantedProducts) {
          const product = productMap.get(grant.product_id);
          if (!product) {
            console.warn(`[Orders API] Product not found for grant ${grant.id}, product_id: ${grant.product_id}`);
            continue;
          }
          const recordedAmount = Number(grant.amount) || 0;
          const minuteBucket = Math.floor(new Date(grant.granted_at).getTime() / MINUTE_MS);
          const groupKey = `${(profile?.email ?? "").toLowerCase()}|${minuteBucket}`;

          if (!grantGroups.has(groupKey)) {
            grantGroups.set(groupKey, []);
          }
          grantGroups.get(groupKey)!.push({ grant, product, recordedAmount });
        }

        for (const [, group] of grantGroups) {
          const first = group[0];
          const totalAmount = group.reduce((sum, g) => sum + g.recordedAmount, 0);
          const items = group.map((g) => ({
            id: g.product.id,
            name: g.product.name ?? '',
            quantity: 1,
            price: g.recordedAmount,
            product_image: g.product.featured_image_url || null,
            product_slug: g.product.slug || null,
          }));
          const grantIds = group.map((g) => g.grant.id);

          const grantOrder = {
            id: group.length > 1 ? `batch_${first.grant.id}` : `grant_${first.grant.id}`,
            orderNumber: `GRANT-${first.grant.id.substring(0, 8).toUpperCase()}`,
            date: first.grant.granted_at,
            status: "succeeded" as const,
            amount: totalAmount,
            currency: "USD",
            items,
            metadata: {
              grant_id: grantIds.length === 1 ? grantIds[0] : undefined,
              grant_ids: grantIds.length > 1 ? grantIds : undefined,
              grant_type: "free_license",
              notes: first.grant.notes,
              original_total: undefined,
              discount_amount: undefined,
              total_amount: undefined,
              promotion_code: undefined,
            },
            receiptUrl: null,
            invoiceId: null,
            refundedAmount: 0,
            isRefunded: false,
            isPartiallyRefunded: false,
            refunds: [],
          };
          console.log(`[Orders API] Adding grant order:`, grantOrder.orderNumber, grantOrder.metadata);
          orders.push(grantOrder as any);
        }
        console.log(`[Orders API] Added ${orders.filter((o: any) => o.metadata?.grant_type === "free_license").length} grant orders to orders array`);
      } else {
        console.warn(`[Orders API] No products found for grant product IDs`);
      }
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const grantCount = orders.filter((o: any) => o.metadata?.grant_type === "free_license").length;
    console.log(`[Orders API] Final response: ${orders.length} total orders, ${grantCount} product grants`);

    return NextResponse.json({
      success: true,
      orders,
      debug: {
        totalOrders: orders.length,
        grantOrders: grantCount,
        regularOrders: orders.length - grantCount,
        grantedProductsCount: grantedProducts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}

