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

    // Get user's profile to check subscription and customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription, customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    const hasActiveSubscription = profile?.subscription && profile.subscription !== "none";
    
    // Check for cancelled subscriptions
    let subscriptionStatus: "active" | "cancelled" | "none" = hasActiveSubscription ? "active" : "none";
    let cancelledSubscriptionId: string | null = null;
    let cancelledSubscriptionType: "monthly" | "annual" | null = null;
    let isScheduledToCancel = false;
    
    if (profile?.customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.customer_id,
          status: "all",
          limit: 10,
        });
        
        // Find cancelled subscriptions that can be reactivated
        for (const sub of subscriptions.data) {
          // Check if it's a monthly or annual subscription
          const items = sub.items.data;
          let isMonthlyOrAnnual = false;
          let subType: "monthly" | "annual" | null = null;
          
          for (const item of items) {
            const priceId = item.price.id;
            const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY;
            const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;
            
            if (priceId === monthlyPriceId || priceId === annualPriceId) {
              isMonthlyOrAnnual = true;
              subType = priceId === monthlyPriceId ? "monthly" : "annual";
              break;
            }
          }
          
          if (!isMonthlyOrAnnual) continue;
          
          if (sub.status === "canceled" || sub.status === "unpaid") {
            subscriptionStatus = "cancelled";
            cancelledSubscriptionId = sub.id;
            cancelledSubscriptionType = subType;
            break;
          } else if (sub.status === "active" && sub.cancel_at_period_end) {
            // Scheduled to cancel but still active
            subscriptionStatus = "active";
            isScheduledToCancel = true;
            cancelledSubscriptionId = sub.id;
            cancelledSubscriptionType = subType;
            // Don't break - continue to check for fully cancelled subscriptions
          } else if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
            // User has an active subscription
            if (!sub.cancel_at_period_end) {
              subscriptionStatus = "active";
              break;
            }
          }
        }
        
        // If we found a cancelled subscription and no active one, set status to cancelled
        if (subscriptionStatus === "active" && cancelledSubscriptionId && !hasActiveSubscription) {
          // Check if the active subscription is scheduled to cancel
          if (isScheduledToCancel) {
            // Keep status as active but mark as scheduled to cancel
          } else {
            // No active subscription found, but we have a cancelled one
            subscriptionStatus = "cancelled";
          }
        } else if (cancelledSubscriptionId && !hasActiveSubscription && !isScheduledToCancel) {
          subscriptionStatus = "cancelled";
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
      }
    }
    const purchasedProductIds = new Set<string>();

    // If user has active subscription (or scheduled to cancel), they get access to all products
    // But we still want to track individually purchased products
    if (hasActiveSubscription || isScheduledToCancel) {
      // Fetch all active products for subscription users
      const { data: allProducts, error: productsError } = await supabase
        .from("products")
        .select("id, name, slug, category, featured_image_url, short_description, tagline")
        .eq("status", "active");

      if (productsError) {
        console.error("Error fetching products:", productsError);
      } else if (allProducts) {
        // Return all products for subscription users (including those scheduled to cancel)
        return NextResponse.json({
          success: true,
          products: allProducts,
          source: "subscription",
          subscriptionStatus: isScheduledToCancel ? "active" : "active",
          cancelledSubscriptionId: isScheduledToCancel ? cancelledSubscriptionId : null,
          cancelledSubscriptionType: isScheduledToCancel ? cancelledSubscriptionType : null,
          isScheduledToCancel,
        });
      }
    }
    
    // If subscription is cancelled, show all products so user knows what they'll lose access to
    if (subscriptionStatus === "cancelled") {
      const { data: allProducts, error: productsError } = await supabase
        .from("products")
        .select("id, name, slug, category, featured_image_url, short_description, tagline")
        .eq("status", "active");

      if (productsError) {
        console.error("Error fetching products:", productsError);
      } else if (allProducts) {
        return NextResponse.json({
          success: true,
          products: allProducts,
          source: "cancelled_subscription",
          subscriptionStatus: "cancelled",
          cancelledSubscriptionId,
          cancelledSubscriptionType,
          isScheduledToCancel: false,
        });
      }
    }

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
        console.error("Error fetching by customer_id:", error);
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
      console.log("Search API not available");
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
            console.error("Error fetching payment intents:", error);
          }
        }
      } catch (error) {
        console.error("Error searching customers:", error);
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
          console.error("Error checking refund status:", error);
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
        console.error("Error parsing cart items:", e);
      }
    }

    // If no purchased products and no subscription, return empty
    if (purchasedProductIds.size === 0 && !hasActiveSubscription) {
      return NextResponse.json({
        success: true,
        products: [],
        source: "none",
      });
    }

    // Fetch product details for purchased products
    const productIdsArray = Array.from(purchasedProductIds);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, slug, category, featured_image_url, short_description, tagline")
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError) {
      console.error("Error fetching purchased products:", productsError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch products",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      source: hasActiveSubscription ? "subscription" : "purchases",
      subscriptionStatus,
      cancelledSubscriptionId,
      cancelledSubscriptionType,
      isScheduledToCancel,
    });
  } catch (error) {
    console.error("Error fetching my products:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}

