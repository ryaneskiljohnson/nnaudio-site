/**
 * @fileoverview Bundle checkout API – creates Stripe Checkout Sessions for elite bundle
 *   subscriptions (monthly/annual) and lifetime one-time purchases.
 * @module api/bundles/checkout
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { stripe } from "@/utils/stripe/client";
import { loadTrustedCheckoutIdentity } from "@/utils/stripe/trusted-checkout-identity";
import { buildStripeCheckoutDiscountFromPromotionRow } from "@/utils/stripe/checkout-discount";
import {
  ATTRIBUTION_COOKIE_NAME,
  attributionToStripeMetadata,
  parseAttributionCookie,
} from "@/utils/marketing/attribution";
import { isPSTDateAfterNow, isPSTDateBeforeNow } from "@/utils/timezoneUtils";
import {
  parseIncludedTargetsFromDb,
  promotionHasApplicableTargets,
  promotionIncludesBundleTier,
  type PlanTypeKey,
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";

type BundleTier = "monthly" | "annual" | "lifetime";

/**
 * Find or create a Stripe customer by email.
 * @param email - Normalized email
 * @returns Stripe customer id
 */
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
 * POST /api/bundles/checkout
 * Creates a Stripe Checkout Session for a bundle tier (subscription or one-time).
 *
 * @param request - JSON body: { bundle_slug, tier, email?, customerId? }
 * @returns { url } Redirect URL to Stripe Checkout, or { error }
 *
 * @example
 * POST /api/bundles/checkout
 * Body: { "bundle_slug": "ultimate-bundle", "tier": "annual", "email": "user@example.com" }
 * Response: 200 { "url": "https://checkout.stripe.com/..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const attribution = parseAttributionCookie(
      request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value
    );
    const {
      bundle_slug,
      tier,
      email,
    }: {
      bundle_slug: string;
      tier: BundleTier;
      email?: string;
      customerId?: string;
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

    // Load bundle and its subscription tiers (need stripe_price_id)
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

    const identity = await loadTrustedCheckoutIdentity({
      email,
      customerId: typeof body.customerId === "string" ? body.customerId : undefined,
    });

    let resolvedCustomerId: string | undefined;
    let needsDatabaseUpdate = false;

    if (identity.customerId) {
      try {
        await stripe.customers.retrieve(identity.customerId);
        resolvedCustomerId = identity.customerId;
      } catch {
        if (identity.email) {
          resolvedCustomerId = await findOrCreateCustomer(identity.email);
          needsDatabaseUpdate = true;
        } else {
          return NextResponse.json(
            {
              error:
                "Invalid customer. Please provide an email address.",
            },
            { status: 400 }
          );
        }
      }
    } else if (identity.email) {
      resolvedCustomerId = await findOrCreateCustomer(identity.email);
      needsDatabaseUpdate = Boolean(identity.userId);
    } else {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (needsDatabaseUpdate && resolvedCustomerId && identity.userId) {
      try {
        const serviceSupabase = await createSupabaseServiceRole();
        await serviceSupabase
          .from("profiles")
          .update({ customer_id: resolvedCustomerId })
          .eq("id", identity.userId);
      } catch (e) {
        console.error("Error updating profile customer_id:", e);
      }
    }

    // Optional: prevent duplicate active subscription for this price
    if (tier === "monthly" || tier === "annual") {
      const subs = await stripe.subscriptions.list({
        customer: resolvedCustomerId,
        status: "all",
        limit: 100,
      });
      const active = subs.data.filter((s) =>
        ["active", "trialing", "past_due"].includes(s.status)
      );
      const hasThisPrice = active.some((s) =>
        s.items.data.some((item) => item.price.id === stripePriceId)
      );
      if (hasThisPrice) {
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

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    const mode: "subscription" | "payment" =
      tier === "lifetime" ? "payment" : "subscription";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: resolvedCustomerId,
      payment_method_types: ["card"],
      mode,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}&from_bundle=1`,
      cancel_url: `${baseUrl}/checkout-canceled?from_bundle=1`,
      metadata: {
        bundle_id: bundle.id,
        bundle_slug: bundle.slug,
        bundle_name: bundle.name,
        tier,
        checkout_type: "bundle",
        ...attributionToStripeMetadata(attribution),
      },
    };

    // Promotions RLS is TO authenticated only; guests use anon Supabase and would get zero rows.
    // Match /api/stripe/checkout: service role for promotion reads so elite bundle checkout auto-applies for everyone.
    let hasAutoDiscount = false;
    try {
      const promoSupabase = await createSupabaseServiceRole();
      const { data: promoRows } = await (promoSupabase as any)
        .from("promotions")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false });

      type PromoRow = PromotionPricingRow & {
        id?: string;
        stripe_coupon_code?: string | null;
        stripe_coupon_id?: string | null;
      };

      for (const p of (promoRows || []) as Record<string, unknown>[]) {
        const sd = p.start_date as string | null | undefined;
        const ed = p.end_date as string | null | undefined;
        if (sd && isPSTDateAfterNow(sd)) continue;
        if (ed && isPSTDateBeforeNow(ed)) continue;

        const row: PromotionPricingRow = {
          promotion_target_mode: (p.promotion_target_mode as string) || "selected",
          included_targets: parseIncludedTargetsFromDb(p.included_targets),
          discount_type: String(p.discount_type || "amount"),
          discount_value: Number(p.discount_value) || 0,
        };
        if (!promotionHasApplicableTargets(row)) continue;
        if (!promotionIncludesBundleTier(row, bundle.id, tier as PlanTypeKey)) {
          continue;
        }

        const pr = p as PromoRow;
        if (
          !pr.stripe_coupon_code?.trim() &&
          !pr.stripe_coupon_id?.trim()
        ) {
          continue;
        }

        const discount = await buildStripeCheckoutDiscountFromPromotionRow(pr, {
          subscriptionMode: mode === "subscription",
        });
        if (discount) {
          sessionParams.discounts = [discount];
          hasAutoDiscount = true;
          console.log(
            `🎁 Bundle checkout auto-discount (${discount.coupon ? "coupon" : "promotion_code"}) for ${bundle.slug} ${tier}`
          );
          break;
        }
        console.warn(
          "Bundle checkout: promotion matched bundle tier but Stripe discount not resolvable (tried code + id), next:",
          pr.id
        );
      }

      if (!hasAutoDiscount && (promoRows || []).length > 0) {
        console.warn(
          "[bundle/checkout] Active promotions exist but none applied to this bundle session",
          {
            bundle_slug,
            tier,
            bundleId: bundle.id,
            promotionCount: (promoRows || []).length,
          }
        );
      }
    } catch (e) {
      console.warn("Bundle checkout: promotion lookup failed", e);
    }

    if (!hasAutoDiscount) {
      sessionParams.allow_promotion_codes = true;
    }

    if (mode === "payment" && tier === "lifetime") {
      sessionParams.payment_intent_data = {
        metadata: {
          purchase_type: "bundle_lifetime",
          bundle_id: bundle.id,
          bundle_slug: bundle.slug,
          ...attributionToStripeMetadata(attribution),
        },
      };
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          metadata: {
            purchase_type: "bundle_lifetime",
            bundle_id: bundle.id,
            ...attributionToStripeMetadata(attribution),
          },
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Bundle checkout error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Checkout failed",
      },
      { status: 500 }
    );
  }
}
