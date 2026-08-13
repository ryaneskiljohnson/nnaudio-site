/**
 * @fileoverview Stripe checkout for configured membership product tiers (DB `subscription_stripe_prices` + env fallback).
 * @module app/api/stripe/checkout/route
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PlanType } from "@/types/stripe";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { randomUUID } from "crypto";
import { stripe } from "@/utils/stripe/client";
import { buildStripeCheckoutDiscountFromPromotionRow } from "@/utils/stripe/checkout-discount";
import { getMembershipProductSlug } from "@/utils/products/membership-product";
import { isPSTDateAfterNow, isPSTDateBeforeNow } from "@/utils/timezoneUtils";
import {
  promotionMatchesMembershipSubscriptionCheckout,
  type PlanTypeKey,
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";
import {
  ATTRIBUTION_COOKIE_NAME,
  attributionToStripeMetadata,
  parseAttributionCookie,
} from "@/utils/marketing/attribution";
import { loadTrustedCheckoutIdentity } from "@/utils/stripe/trusted-checkout-identity";

/**
 * Map price_id to plan name for Meta tracking
 * Returns format: monthly_6, annual_59, lifetime_149
 */
async function getPlanName(
  priceId: string,
  planType: PlanType
): Promise<string> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    const amount = (price.unit_amount || 0) / 100; // Convert cents to dollars
    
    if (planType === "monthly") {
      return `monthly_${amount}`;
    } else if (planType === "annual") {
      return `annual_${amount}`;
    } else if (planType === "lifetime") {
      return `lifetime_${amount}`;
    }
    
    return `${planType}_${amount}`;
  } catch (error) {
    console.error("Error fetching price for plan name:", error);
    return `${planType}_unknown`;
  }
}

type SubscriptionStripePrices = Partial<
  Record<
    PlanType,
    { stripe_price_id?: string | null; list_price?: number | null }
  >
>;

/**
 * @brief Loads membership `products` row for Stripe price IDs and promotion matching.
 * @param planType Checkout tier.
 * @returns Product id and optional DB Stripe price id for that tier.
 */
async function getMembershipProductCheckoutRow(planType: PlanType): Promise<{
  productId: string | null;
  priceIdFromDb: string | null;
}> {
  try {
    const supabase = await createSupabaseServiceRole();
    const slug = getMembershipProductSlug();
    const { data } = await supabase
      .from("products")
      .select("id, subscription_stripe_prices")
      .eq("slug", slug)
      .maybeSingle();
    if (!data?.id) {
      return { productId: null, priceIdFromDb: null };
    }
    const raw = data.subscription_stripe_prices as
      | SubscriptionStripePrices
      | null
      | undefined;
    const tier = raw?.[planType];
    const pid =
      typeof tier?.stripe_price_id === "string"
        ? tier.stripe_price_id.trim()
        : null;
    return {
      productId: data.id as string,
      priceIdFromDb: pid || null,
    };
  } catch (e) {
    console.error("[checkout] membership product row", e);
    return { productId: null, priceIdFromDb: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const attribution = parseAttributionCookie(
      request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value
    );
    const {
      planType,
      email,
      collectPaymentMethod = false,
      isPlanChange = false,
    }: {
      planType: PlanType;
      email?: string;
      customerId?: string;
      collectPaymentMethod?: boolean;
      isPlanChange?: boolean;
    } = body;

    const identity = await loadTrustedCheckoutIdentity({
      email,
      customerId: typeof body.customerId === "string" ? body.customerId : undefined,
    });

    let resolved_customer_id: string | undefined;
    let needsDatabaseUpdate = false;

    if (identity.customerId) {
      try {
        await stripe.customers.retrieve(identity.customerId);
        resolved_customer_id = identity.customerId;
      } catch {
        if (identity.email) {
          resolved_customer_id = await findOrCreateCustomer(identity.email);
          needsDatabaseUpdate = true;
        } else {
          return NextResponse.json({
            url: null,
            error: "Invalid customer. Please provide an email address.",
          }, { status: 400 });
        }
      }
    } else if (identity.email) {
      resolved_customer_id = await findOrCreateCustomer(identity.email);
      needsDatabaseUpdate = Boolean(identity.userId);
    }

    if (needsDatabaseUpdate && resolved_customer_id && identity.userId) {
      try {
        const supabase = await createSupabaseServiceRole();
        await supabase
          .from("profiles")
          .update({ customer_id: resolved_customer_id })
          .eq("id", identity.userId);
      } catch (error) {
        console.error("Error updating customer_id in database:", error);
      }
    }


    // CRITICAL: Check if customer already has a lifetime purchase
    if (resolved_customer_id && planType === "lifetime") {
      try {
        const hasLifetime = await hasCustomerPurchasedLifetime(resolved_customer_id);
        
        if (hasLifetime) {
          console.warn(`⚠️ Customer ${resolved_customer_id} already has lifetime access. Blocking duplicate purchase.`);
          return NextResponse.json({
            url: null,
            error: "LIFETIME_ALREADY_PURCHASED",
            message: "You already have a lifetime license! To purchase another license (for example, as a gift), please create a new account using a different email address.",
            hasLifetime: true,
          }, { status: 400 });
        }
      } catch (error) {
        console.error("Error checking lifetime purchase history:", error);
        // Continue with checkout even if check fails to avoid blocking legitimate purchases
      }
    }

    // CRITICAL: Check if customer already has an active subscription (prevents duplicates)
    // Skip this check for plan changes and lifetime purchases (handled above)
    if (resolved_customer_id && planType !== "lifetime" && !isPlanChange) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: resolved_customer_id,
          status: "all",
          limit: 100,
        });

        const activeSubscriptions = subscriptions.data.filter(
          (sub) => sub.status === "active" || sub.status === "trialing" || sub.status === "past_due"
        );

        if (activeSubscriptions.length > 0) {
          console.warn(`⚠️ Customer ${resolved_customer_id} already has ${activeSubscriptions.length} active subscription(s). Blocking duplicate subscription creation.`);
          return NextResponse.json({
            url: null,
            error: "ACTIVE_SUBSCRIPTION_EXISTS",
            message: "You already have an active subscription. Please manage your existing subscription or wait for it to expire before creating a new one.",
            hasActiveSubscription: true,
            activeSubscriptionIds: activeSubscriptions.map(sub => sub.id),
          }, { status: 400 });
        }
      } catch (error) {
        console.error("Error checking for active subscriptions:", error);
        // Continue with checkout even if check fails to avoid blocking legitimate purchases
      }
    }

    const isSignedUp = Boolean(identity.userId);

    // Create checkout session with or without customer ID
    const result = await createCheckoutSession(
      resolved_customer_id,
      planType,
      collectPaymentMethod,
      isSignedUp,
      isPlanChange,
      attribution
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        url: null,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Finds or creates a customer in Stripe
 * Note: This is a duplicate of the function in utils/stripe/actions.ts
 * Consider importing from there instead to avoid code duplication
 */
async function findOrCreateCustomer(email: string): Promise<string> {
  try {
    // Normalize email: lowercase and trim to prevent duplicates from case differences
    const normalizedEmail = email.toLowerCase().trim();

    // Search for existing customers with this email
    const existingCustomers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 10, // Get more results to handle potential duplicates
    });

    if (existingCustomers.data.length > 0) {
      // If there are multiple customers with the same email, log a warning
      if (existingCustomers.data.length > 1) {
        console.warn(
          `Found ${existingCustomers.data.length} Stripe customers with email ${normalizedEmail}. Using the most recent one.`
        );
      }
      return existingCustomers.data[0].id;
    }

    // Create new customer with hour-based idempotency key to prevent race conditions
    // Key includes current hour so failed attempts can be retried after an hour
    // All signups within the same hour use the same key, preventing duplicates from spam clicking
    const now = new Date();
    const hourKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}`;
    const idempotencyKey = `cust_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}_${hourKey}`;
    
    try {
      const newCustomer = await stripe.customers.create(
        {
          email: normalizedEmail,
        },
        {
          idempotencyKey: idempotencyKey.substring(0, 255), // Stripe has 255 char limit
        }
      );

      return newCustomer.id;
    } catch (createError: any) {
      // If customer creation fails, it could be due to:
      // 1. Idempotency key collision (another request is creating the same customer)
      // 2. Network/API error
      // 3. Customer was created between our check and create (race condition)
      
      // Always retry the lookup - another process may have created the customer
      // Wait a brief moment to allow concurrent request to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retryCustomers = await stripe.customers.list({
        email: normalizedEmail,
        limit: 1,
      });

      if (retryCustomers.data.length > 0) {
        console.log(`Customer found on retry after creation error: ${retryCustomers.data[0].id}`);
        return retryCustomers.data[0].id;
      }

      // If retry also fails, check for specific error codes
      if (
        createError?.code === 'idempotency_key_in_use' ||
        createError?.type === 'StripeIdempotencyError'
      ) {
        // Idempotency key collision - wait a bit longer and retry lookup
        await new Promise(resolve => setTimeout(resolve, 500));
        const finalRetry = await stripe.customers.list({
          email: normalizedEmail,
          limit: 1,
        });
        if (finalRetry.data.length > 0) {
          return finalRetry.data[0].id;
        }
      }

      // If all retries fail, throw the original error
      throw createError;
    }
  } catch (error) {
    console.error("Error finding/creating customer:", error);
    throw error;
  }
}


/**
 * Checks if a customer has already purchased lifetime access
 * This prevents duplicate lifetime purchases
 */
async function hasCustomerPurchasedLifetime(customerId: string): Promise<boolean> {
  try {
    const lifetimePriceId = process.env.STRIPE_PRICE_ID_LIFETIME!;
    
    // Check 1: Look for successful payments with lifetime price
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });

    // Check if any charge was for the lifetime price and was successful
    const hasLifetimeCharge = charges.data.some(charge => {
      // Check if charge has line items or invoice with lifetime price
      return charge.paid && charge.amount > 0 && (
        charge.metadata?.purchase_type === 'lifetime' ||
        charge.description?.toLowerCase().includes('lifetime')
      );
    });

    if (hasLifetimeCharge) {
      console.log(`✅ Found lifetime charge for customer ${customerId}`);
      return true;
    }

    // Check 2: Look for payment intents with lifetime metadata
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    const hasLifetimePayment = paymentIntents.data.some(pi => 
      pi.status === 'succeeded' && 
      pi.metadata?.purchase_type === 'lifetime'
    );

    if (hasLifetimePayment) {
      console.log(`✅ Found lifetime payment intent for customer ${customerId}`);
      return true;
    }

    // Check 3: Check database for lifetime subscription status
    const supabase = await createSupabaseServiceRole();
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription")
      .eq("customer_id", customerId)
      .single();

    if (profile?.subscription === "lifetime") {
      console.log(`✅ Customer ${customerId} has lifetime in database`);
      return true;
    }

    // Check 4: Check invoices for lifetime price
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    const hasLifetimeInvoice = invoices.data.some(invoice => {
      if (invoice.status !== 'paid') return false;
      return invoice.lines.data.some(line => {
        const priceRef = line.pricing?.price_details?.price;
        const priceId = typeof priceRef === 'string' ? priceRef : priceRef?.id;
        return priceId === lifetimePriceId;
      });
    });

    if (hasLifetimeInvoice) {
      console.log(`✅ Found lifetime invoice for customer ${customerId}`);
      return true;
    }

    console.log(`ℹ️ No lifetime purchase found for customer ${customerId}`);
    return false;
  } catch (error) {
    console.error("Error checking lifetime purchase history:", error);
    // If we can't check, assume they haven't purchased to avoid blocking legitimate purchases
    // This errs on the side of allowing a potential duplicate rather than blocking a real purchase
    return false;
  }
}

/**
 * Creates a Stripe checkout session for the selected plan
 */
async function createCheckoutSession(
  customerId: string | undefined,
  planType: PlanType,
  collectPaymentMethod: boolean = false,
  isSignedUp: boolean = false,
  isPlanChange: boolean = false,
  attribution: ReturnType<typeof parseAttributionCookie> = null
): Promise<{ url: string | null; error?: string }> {
  try {
    // Return error if customer ID is not provided
    if (!customerId) {
      return { url: null, error: "Customer ID is required for checkout" };
    }

    const envPriceIds: Record<PlanType, string | undefined> = {
      monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
      annual: process.env.STRIPE_PRICE_ID_ANNUAL,
      lifetime: process.env.STRIPE_PRICE_ID_LIFETIME,
    };

    const { productId: membershipProductId, priceIdFromDb } =
      await getMembershipProductCheckoutRow(planType);

    const priceId = priceIdFromDb || envPriceIds[planType];
    if (!priceId) {
      return { url: null, error: `Invalid plan type: ${planType}` };
    }

    // Determine mode based on plan type
    let mode: "subscription" | "payment";
    let subscriptionData:
      | Stripe.Checkout.SessionCreateParams.SubscriptionData
      | undefined = undefined;

    if (planType === "lifetime") {
      // Lifetime is a one-time payment
      mode = "payment";
    } else {
      // All other plans are subscriptions
      mode = "subscription";
      // No trial periods - charge immediately
    }

    // Get user_id and email from Supabase if customer_id is available
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    if (customerId) {
      try {
        const supabase = await createSupabaseServiceRole();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("customer_id", customerId)
          .single();
        
        if (profile) {
          userId = profile.id;
          userEmail = profile.email ?? undefined;
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Continue without user data
      }
    }
    
    // CRITICAL: Always include email in metadata for webhook fallback lookup
    // If we don't have email from profile, get it from Stripe customer
    // This ensures webhook can always find the user even if customer_id isn't set in profile yet
    if (!userEmail && customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        userEmail = (typeof customer === 'object' && !customer.deleted && customer.email) ? customer.email : undefined;
      } catch (error) {
        console.error("Error retrieving customer email:", error);
      }
    }

    // Get plan name for Meta tracking
    const planName = await getPlanName(priceId, planType);
    
    // Generate event_id for deduplication
    const eventId = randomUUID();

    // Build session parameters with proper URL fallbacks
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";
    console.log("🔧 Creating checkout session with base URL:", baseUrl);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      mode,
      success_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout-canceled`,
      metadata: {
        plan_type: planType,
        plan_name: planName,
        customer_id: customerId,
        collect_payment_method: collectPaymentMethod.toString(),
        is_signed_up: isSignedUp.toString(),
        ...(userId && { user_id: userId }),
        ...(userEmail && { email: userEmail }), // Always include email if available for webhook fallback
        event_id: eventId,
        ...attributionToStripeMetadata(attribution),
      },
    };

    // Add line items for payment and subscription modes
    if (mode === "payment" || mode === "subscription") {
      sessionParams.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    }

    // Add subscription data if applicable
    if (subscriptionData) {
      sessionParams.subscription_data = subscriptionData;
    }

    // Add payment_intent_data and invoice_creation for lifetime purchases to ensure metadata is set
    // This ensures metadata is on both payment intent AND invoice for all lifetime purchases
    // user_id enables single-call lookup via paymentIntents.search(metadata['user_id'])
    if (planType === "lifetime" && mode === "payment") {
      sessionParams.payment_intent_data = {
        metadata: {
          purchase_type: "lifetime",
          ...(userId && { user_id: userId }),
          ...attributionToStripeMetadata(attribution),
        },
      };
      // Also set metadata on invoice when it's created
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          metadata: {
            purchase_type: "lifetime",
            ...attributionToStripeMetadata(attribution),
          },
        },
      };
    }

    // Set payment method collection based on collectPaymentMethod flag
    if (mode === "subscription") {
      sessionParams.payment_method_collection = collectPaymentMethod
        ? "always"
        : "if_required";
    }

    // Auto-apply sale discount when DB promotion includes this tier (or global "all" mode).
    // Resolve every catalog `products.id` that shares the Stripe product used by this checkout price so
    // promotions still match when env price IDs point at a row different from NEXT_PUBLIC_MEMBERSHIP_PRODUCT_SLUG.
    let hasAutoDiscount = false;
    let appliedPromotionId: string | undefined;
    try {
      const supabase = await createSupabaseServiceRole();
      const candidateCatalogProductIds = new Set<string>();
      if (membershipProductId) {
        candidateCatalogProductIds.add(membershipProductId);
      }
      if (priceId) {
        try {
          const price = await stripe.prices.retrieve(priceId);
          const prod = price.product;
          const stripeProductId =
            typeof prod === "string"
              ? prod
              : prod &&
                  typeof prod === "object" &&
                  "deleted" in prod &&
                  prod.deleted
                ? null
                : typeof prod === "object" && prod && "id" in prod
                  ? (prod as Stripe.Product).id
                  : null;
          if (stripeProductId) {
            const { data: rows } = await (supabase as any)
              .from("products")
              .select("id")
              .eq("stripe_product_id", stripeProductId);
            for (const r of rows || []) {
              if (r?.id) candidateCatalogProductIds.add(r.id as string);
            }
          }
        } catch (e) {
          console.warn("[checkout] resolve catalog product ids from price", e);
        }
      }

      const { data: promoRows } = await (supabase as any)
        .from("promotions")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false });

      type PromoRow = PromotionPricingRow & {
        id?: string;
        stripe_coupon_code?: string | null;
        stripe_coupon_id?: string | null;
      };

      for (const p of (promoRows || []) as PromoRow[]) {
        if (p.start_date && isPSTDateAfterNow(p.start_date)) continue;
        if (p.end_date && isPSTDateBeforeNow(p.end_date)) continue;
        if (
          !promotionMatchesMembershipSubscriptionCheckout(
            p,
            candidateCatalogProductIds,
            planType as PlanTypeKey
          )
        ) {
          continue;
        }

        if (
          !p.stripe_coupon_code?.trim() &&
          !p.stripe_coupon_id?.trim()
        ) {
          continue;
        }

        const discount = await buildStripeCheckoutDiscountFromPromotionRow(p, {
          subscriptionMode: mode === "subscription",
        });
        if (discount) {
          sessionParams.discounts = [discount];
          hasAutoDiscount = true;
          if (typeof p.id === "string" && p.id) {
            appliedPromotionId = p.id;
          }
          console.log(
            `🎁 Auto-applying promotion discount (${discount.coupon ? "coupon" : "promotion_code"}) for ${planType}`
          );
          break;
        }
        console.warn(
          "⚠️ Promotion matched checkout tier but Stripe discount not resolvable (tried code + id), trying next promo:",
          p.id
        );
      }

      if (!hasAutoDiscount && (promoRows || []).length > 0) {
        console.warn(
          "[checkout] Active promotions in DB but none applied to this session",
          {
            planType,
            priceId,
            candidateCatalogProductIds: [...candidateCatalogProductIds],
            promotionCount: (promoRows || []).length,
          }
        );
      }
    } catch (error) {
      console.log("No active promotion for checkout tier:", planType, error);
    }

    if (appliedPromotionId) {
      sessionParams.metadata = {
        ...sessionParams.metadata,
        promotion_id: appliedPromotionId,
      };
    }

    // Only enable manual promotion codes if we're NOT auto-applying a discount
    // Stripe doesn't allow both allow_promotion_codes and discounts together
    if (!hasAutoDiscount) {
    sessionParams.allow_promotion_codes = true;
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return { url: session.url };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      url: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create checkout session",
    };
  }
}
