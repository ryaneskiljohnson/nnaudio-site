import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
              const { data: products, error: productsError } = await supabase
                .from("products")
                .select("id, name, slug, featured_image_url")
                .in("id", productIds);

              if (!productsError && products) {
                // Create a map of product ID to product details
                const productMap = new Map(products.map(p => [p.id, p]));
                
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
              status: refund.status,
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
                status: refund.status,
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

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      orders,
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

