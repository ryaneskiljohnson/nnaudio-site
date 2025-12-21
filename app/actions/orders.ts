"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  product_image?: string | null;
  product_slug?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  amount: number;
  currency: string;
  items: OrderItem[];
  metadata: {
    original_total?: string;
    discount_amount?: string;
    total_amount?: string;
    promotion_code?: string;
    grant_id?: string;
    grant_type?: string;
    notes?: string | null;
  };
  receiptUrl: string | null;
  invoiceId: string | null;
  refundedAmount: number;
  isRefunded: boolean;
  isPartiallyRefunded: boolean;
  refunds: Array<{
    id: string;
    amount: number;
    reason: string | null;
    status: string;
    created: number;
  }>;
}

export async function getOrders(): Promise<{
  success: boolean;
  orders: Order[];
  productGrants: Order[];
  error?: string;
  debug?: {
    totalOrders: number;
    grantOrders: number;
    regularOrders: number;
    grantedProductsCount: number;
  };
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        orders: [],
        productGrants: [],
        error: "Not authenticated",
      };
    }

    // Get user's profile to find customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        orders: [],
        productGrants: [],
        error: "Failed to fetch profile",
      };
    }

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
        console.error("[Orders] Error fetching by customer_id:", error);
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
      console.log("[Orders] Search API not available");
    }

    // Method 3: If we have an email, find customers by email and get their payment intents
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
            console.error("[Orders] Error fetching payment intents for customer:", error);
          }
        }
      } catch (error) {
        console.error("[Orders] Error searching customers by email:", error);
      }
    }

    paymentIntents = Array.from(allPaymentIntents.values());

    // Filter to only successful payment intents (completed orders)
    const successfulPayments = paymentIntents.filter(
      (pi) => pi.status === "succeeded"
    );

    // Get product grants (free licenses) to show as $0 orders
    let grantedProducts: Array<{
      id: string;
      product_id: string;
      granted_at: string;
      notes: string | null;
    }> = [];
    
    if (profile?.email) {
      const adminSupabase = await createSupabaseServiceRole();
      const { data: grants, error: grantsError } = await adminSupabase
        .from("product_grants")
        .select("id, product_id, granted_at, notes")
        .eq("user_email", profile.email.toLowerCase())
        .order("granted_at", { ascending: false });

      if (grantsError) {
        console.error("[Orders] Error fetching product grants:", grantsError);
      }

      if (grants) {
        grantedProducts = grants;
      }
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
              const adminSupabase = await createSupabaseServiceRole();
              const { data: products, error: productsError } = await adminSupabase
                .from("products")
                .select("id, name, slug, featured_image_url")
                .in("id", productIds);

              if (!productsError && products) {
                const productMap = new Map(products.map(p => [p.id, p]));
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
            if (promoCodeId.startsWith('promo_')) {
              const promoCode = await stripe.promotionCodes.retrieve(promoCodeId);
              promotionCodeName = promoCode.code || promoCodeId;
            } else {
              promotionCodeName = promoCodeId;
            }
          } catch (error) {
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
          try {
            const charge = await stripe.charges.retrieve(
              typeof pi.latest_charge === "string"
                ? pi.latest_charge
                : pi.latest_charge.id,
              { expand: ['refunds'] }
            );
            receiptUrl = charge.receipt_url;
            
            if (charge.refunded) {
              isRefunded = true;
              refundedAmount = charge.amount_refunded / 100;
            } else if (charge.amount_refunded > 0) {
              isPartiallyRefunded = true;
              refundedAmount = charge.amount_refunded / 100;
            }

            if (charge.refunds && charge.refunds.data) {
              refunds = charge.refunds.data.map((refund) => ({
                id: refund.id,
                amount: refund.amount / 100,
                reason: refund.reason,
                status: refund.status,
                created: refund.created,
              }));
            } else if (charge.amount_refunded > 0) {
              try {
                const refundsList = await stripe.refunds.list({
                  charge: charge.id,
                  limit: 100,
                });
                refunds = refundsList.data.map((refund) => ({
                  id: refund.id,
                  amount: refund.amount / 100,
                  reason: refund.reason,
                  status: refund.status,
                  created: refund.created,
                }));
              } catch (error) {
                console.error("Error fetching refunds:", error);
              }
            }
          } catch (error) {
            console.error("Error fetching charge:", error);
          }
        }

        // Try to get invoice if available
        if (pi.invoice) {
          try {
            const invoice = await stripe.invoices.retrieve(
              typeof pi.invoice === "string" ? pi.invoice : pi.invoice.id
            );
            invoiceId = invoice.id;
            if (!receiptUrl && invoice.hosted_invoice_url) {
              receiptUrl = invoice.hosted_invoice_url;
            }
          } catch (error) {
            console.error("Error fetching invoice:", error);
          }
        }

        return {
          id: pi.id,
          orderNumber: pi.id.substring(3, 11).toUpperCase(),
          date: new Date(pi.created * 1000).toISOString(),
          status: pi.status,
          amount: pi.amount / 100,
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
        } as Order;
      })
    );

    // Add product grants as $0 orders
    if (grantedProducts.length > 0) {
      const grantProductIds = grantedProducts.map(g => g.product_id);
      const adminSupabase = await createSupabaseServiceRole();
      const { data: grantProducts } = await adminSupabase
        .from("products")
        .select("id, name, slug, featured_image_url")
        .in("id", grantProductIds)
        .eq("status", "active");

      if (grantProducts) {
        const productMap = new Map(grantProducts.map(p => [p.id, p]));
        
        for (const grant of grantedProducts) {
          const product = productMap.get(grant.product_id);
          if (product) {
            orders.push({
              id: `grant_${grant.id}`,
              orderNumber: `GRANT-${grant.id.substring(0, 8).toUpperCase()}`,
              date: grant.granted_at,
              status: "succeeded",
              amount: 0,
              currency: "USD",
              items: [{
                id: product.id,
                name: product.name,
                quantity: 1,
                price: 0,
                product_image: product.featured_image_url || null,
                product_slug: product.slug || null,
              }],
              metadata: {
                grant_id: grant.id,
                grant_type: "free_license",
                notes: grant.notes,
              },
              receiptUrl: null,
              invoiceId: null,
              refundedAmount: 0,
              isRefunded: false,
              isPartiallyRefunded: false,
              refunds: [],
            } as Order);
          }
        }
      }
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Separate regular orders from product grants
    const regularOrders: Order[] = [];
    const productGrants: Order[] = [];
    
    orders.forEach((order) => {
      if (order.metadata?.grant_type === "free_license") {
        productGrants.push(order);
      } else {
        regularOrders.push(order);
      }
    });

    return {
      success: true,
      orders: regularOrders,
      productGrants,
      debug: {
        totalOrders: orders.length,
        grantOrders: productGrants.length,
        regularOrders: regularOrders.length,
        grantedProductsCount: grantedProducts.length,
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      orders: [],
      productGrants: [],
      error: error instanceof Error ? error.message : "Failed to fetch orders",
    };
  }
}

