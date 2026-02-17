/**
 * @fileoverview Bundle checkout setup API – returns a Stripe client secret for
 *   embedded payment: subscription (first invoice PaymentIntent) or one-time
 *   PaymentIntent for lifetime. Used when collecting card on-site (no redirect).
 * @module api/bundles/checkout/setup
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { stripe } from "@/utils/stripe/client";

type BundleTier = "monthly" | "annual" | "lifetime";

async function findOrCreateCustomer(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await stripe.customers.list({
    email: normalizedEmail,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0].id;
  const customer = await stripe.customers.create({ email: normalizedEmail });
  return customer.id;
}

/**
 * POST /api/bundles/checkout/setup
 * Returns client_secret for confirming payment on-site (Elements).
 * For subscription: creates Subscription with default_incomplete, returns first invoice's PI client_secret.
 * For lifetime: creates PaymentIntent, returns its client_secret.
 *
 * @param request - JSON body: { bundle_slug, tier, email?, customerId? }
 * @returns { clientSecret, paymentIntentId, type: 'subscription' | 'payment' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bundle_slug,
      tier,
      email,
      customerId,
      promotionCodeId,
      paymentMethodId,
    }: {
      bundle_slug: string;
      tier: BundleTier;
      email?: string;
      customerId?: string;
      promotionCodeId?: string;
      paymentMethodId?: string;
    } = body;

    if (!bundle_slug || !tier) {
      return NextResponse.json(
        { error: "bundle_slug and tier are required" },
        { status: 400 }
      );
    }

    const validTiers: BundleTier[] = ["monthly", "annual", "lifetime"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "tier must be monthly, annual, or lifetime" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: bundle, error: bundleError } = await (supabase as any)
      .from("bundles")
      .select(
        `
        id,
        name,
        slug,
        bundle_subscription_tiers(
          id,
          subscription_type,
          price,
          sale_price,
          stripe_price_id,
          active
        )
      `
      )
      .eq("slug", bundle_slug)
      .eq("status", "active")
      .single();

    if (bundleError || !bundle) {
      return NextResponse.json(
        { error: "Bundle not found or inactive" },
        { status: 404 }
      );
    }

    const tiers = (bundle.bundle_subscription_tiers || []).filter(
      (t: any) => t.active
    );
    const tierRow = tiers.find((t: any) => t.subscription_type === tier);

    if (!tierRow) {
      return NextResponse.json(
        { error: `Tier "${tier}" is not available for this bundle` },
        { status: 400 }
      );
    }

    const stripePriceId = tierRow.stripe_price_id;
    if (!stripePriceId) {
      return NextResponse.json(
        {
          error:
            "This plan is not set up for payment yet. Please contact support.",
        },
        { status: 400 }
      );
    }

    let resolvedCustomerId: string | undefined;
    let needsDatabaseUpdate = false;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        resolvedCustomerId = customerId;
      } catch {
        if (email) {
          resolvedCustomerId = await findOrCreateCustomer(email);
          needsDatabaseUpdate = true;
        } else {
          return NextResponse.json(
            { error: "Invalid customer. Please provide an email address." },
            { status: 400 }
          );
        }
      }
    } else if (email) {
      resolvedCustomerId = await findOrCreateCustomer(email);
    } else {
      return NextResponse.json(
        { error: "Email or customerId is required" },
        { status: 400 }
      );
    }

    if (needsDatabaseUpdate && resolvedCustomerId && customerId) {
      try {
        const serviceSupabase = await createSupabaseServiceRole();
        await serviceSupabase
          .from("profiles")
          .update({ customer_id: resolvedCustomerId })
          .eq("customer_id", customerId);
      } catch (e) {
        console.error("Error updating profile customer_id:", e);
      }
    }

    // If using a saved payment method, verify it belongs to this customer
    if (paymentMethodId && resolvedCustomerId) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        const pmCustomerId =
          typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
        if (pmCustomerId !== resolvedCustomerId) {
          return NextResponse.json(
            { error: "Payment method does not belong to this customer" },
            { status: 403 }
          );
        }
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message || "Invalid payment method" },
          { status: 400 }
        );
      }
    }

    // Check for existing subscription BEFORE creating one. Handle double-call: return existing PI if sub was just created.
    if (tier === "monthly" || tier === "annual") {
      const subs = await stripe.subscriptions.list({
        customer: resolvedCustomerId,
        status: "all",
        limit: 100,
      });
      const twoMinutesAgo = Math.floor(Date.now() / 1000) - 120;
      const withThisPrice = subs.data.filter((s) =>
        s.items.data.some((item) => item.price.id === stripePriceId)
      );
      const recentWithThisPrice = withThisPrice.find((s) => s.created >= twoMinutesAgo);
      if (recentWithThisPrice) {
        // Same flow (double-call or retry): return existing subscription's payment intent so checkout can complete
        const subWithInvoice = await stripe.subscriptions.retrieve(
          recentWithThisPrice.id,
          { expand: ["latest_invoice", "latest_invoice.payments", "latest_invoice.payments.data.payment.payment_intent"] }
        );
        const latestInvoice = subWithInvoice.latest_invoice as Stripe.Invoice | null;
        const firstPayment = latestInvoice?.payments?.data?.[0];
        const paymentRef = firstPayment?.payment?.payment_intent;
        const paymentIntent =
          typeof paymentRef === "object" && paymentRef !== null
            ? paymentRef
            : typeof paymentRef === "string"
              ? await stripe.paymentIntents.retrieve(paymentRef)
              : undefined;
        if (paymentIntent?.client_secret) {
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            subscriptionId: recentWithThisPrice.id,
            type: "subscription",
          });
        }
      }
      const active = subs.data.filter((s) =>
        ["active", "trialing", "past_due"].includes(s.status)
      );
      const existingActiveSub = active.find((s) =>
        s.items.data.some((item) => item.price.id === stripePriceId)
      );
      if (existingActiveSub) {
        return NextResponse.json(
          {
            error:
              "You already have an active subscription for this bundle. Manage it from your account.",
            code: "ACTIVE_SUBSCRIPTION_EXISTS",
          },
          { status: 400 }
        );
      }
    }

    if (tier === "lifetime") {
      let amountDollars = tierRow.sale_price ?? tierRow.price ?? 0;
      let discountAmount = 0;
      let resolvedPromoId: string | undefined;

      if (promotionCodeId) {
        try {
          let promotionCode: Stripe.PromotionCode | null = null;
          if (promotionCodeId.startsWith("promo_")) {
            try {
              promotionCode = await stripe.promotionCodes.retrieve(
                promotionCodeId
              );
            } catch {
              /* ignore */
            }
          }
          if (!promotionCode) {
            const list = await stripe.promotionCodes.list({
              code: promotionCodeId.toUpperCase(),
              active: true,
              limit: 1,
            });
            if (list.data.length > 0) promotionCode = list.data[0];
          }
          if (promotionCode) {
            const promotion = promotionCode.promotion;
            const couponRef = promotion?.type === "coupon" ? promotion.coupon : null;
            const coupon =
              couponRef == null
                ? null
                : typeof couponRef === "string"
                  ? await stripe.coupons.retrieve(couponRef)
                  : couponRef;
            if (coupon?.valid) {
              if (coupon.percent_off) {
                discountAmount = (amountDollars * coupon.percent_off) / 100;
              } else if (coupon.amount_off) {
                discountAmount = coupon.amount_off / 100;
              }
              amountDollars = Math.max(0, amountDollars - discountAmount);
              resolvedPromoId = promotionCode.id;
            }
          }
        } catch (e) {
          console.error("Bundle setup promo apply error:", e);
        }
      }

      const amountCents = Math.round(amountDollars * 100);
      if (amountCents > 0 && amountCents < 50) {
        return NextResponse.json(
          { error: "Invalid tier price" },
          { status: 400 }
        );
      }
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        customer: resolvedCustomerId,
        ...(paymentMethodId && { payment_method: paymentMethodId }),
        automatic_payment_methods: { enabled: true },
        metadata: {
          checkout_type: "bundle",
          bundle_id: bundle.id,
          bundle_slug: bundle.slug,
          tier: "lifetime",
          purchase_type: "bundle_lifetime",
          ...(resolvedPromoId && { promotion_code: resolvedPromoId }),
        },
      });
      return NextResponse.json({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        type: "payment",
      });
    }

    let couponId: string | undefined;
    if (promotionCodeId) {
      try {
        let promotionCode: Stripe.PromotionCode | null = null;
        if (promotionCodeId.startsWith("promo_")) {
          try {
            promotionCode = await stripe.promotionCodes.retrieve(
              promotionCodeId
            );
          } catch {
            /* ignore */
          }
        }
        if (!promotionCode) {
          const list = await stripe.promotionCodes.list({
            code: promotionCodeId.toUpperCase(),
            active: true,
            limit: 1,
          });
          if (list.data.length > 0) promotionCode = list.data[0];
        }
        const promoCoupon = promotionCode?.promotion?.type === "coupon" ? promotionCode.promotion.coupon : null;
        if (promoCoupon) {
          couponId = typeof promoCoupon === "string" ? promoCoupon : promoCoupon.id;
        }
      } catch (e) {
        console.error("Bundle setup subscription promo lookup:", e);
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: resolvedCustomerId,
      items: [{ price: stripePriceId }],
      ...(couponId && { coupon: couponId }),
      ...(paymentMethodId && { default_payment_method: paymentMethodId }),
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice", "latest_invoice.payments", "latest_invoice.payments.data.payment.payment_intent"],
      metadata: {
        bundle_id: bundle.id,
        bundle_slug: bundle.slug,
        tier,
        ...(promotionCodeId && { promotion_code: promotionCodeId }),
      },
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
    const firstPayment = latestInvoice?.payments?.data?.[0];
    const paymentRef = firstPayment?.payment?.payment_intent;
    const paymentIntent =
      typeof paymentRef === "object" && paymentRef !== null
        ? paymentRef
        : typeof paymentRef === "string"
          ? await stripe.paymentIntents.retrieve(paymentRef)
          : undefined;

    if (!paymentIntent?.client_secret) {
      return NextResponse.json(
        { error: "Failed to create subscription payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subscriptionId: subscription.id,
      type: "subscription",
    });
  } catch (error: any) {
    console.error("Bundle checkout setup error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Setup failed",
      },
      { status: 500 }
    );
  }
}
