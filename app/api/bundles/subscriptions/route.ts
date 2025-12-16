import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCustomerSubscriptions } from '@/utils/stripe/actions';

/**
 * GET /api/bundles/subscriptions
 * Fetches all active bundle subscriptions for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get customer_id from user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json({
        success: true,
        bundleSubscriptions: [],
      });
    }

    // Fetch all bundles with their subscription tiers (including stripe_price_id)
    const { data: bundles, error: bundlesError } = await supabase
      .from('bundles')
      .select(`
        *,
        bundle_subscription_tiers!inner(
          id,
          subscription_type,
          price,
          sale_price,
          stripe_price_id,
          stripe_product_id,
          active
        )
      `)
      .eq('status', 'active')
      .eq('bundle_subscription_tiers.active', true);

    if (bundlesError) {
      console.error('Error fetching bundles:', bundlesError);
      return NextResponse.json(
        { success: false, error: bundlesError.message },
        { status: 500 }
      );
    }

    if (!bundles || bundles.length === 0) {
      return NextResponse.json({
        success: true,
        bundleSubscriptions: [],
      });
    }

    // Build a map of price_id -> bundle info
    const priceIdMap = new Map<string, any>();
    bundles.forEach((bundle: any) => {
      bundle.bundle_subscription_tiers?.forEach((tier: any) => {
        if (tier.stripe_price_id) {
          priceIdMap.set(tier.stripe_price_id, {
            bundle,
            tier,
            subscriptionType: tier.subscription_type,
          });
        }
      });
    });

    if (priceIdMap.size === 0) {
      return NextResponse.json({
        success: true,
        bundleSubscriptions: [],
      });
    }

    // Fetch Stripe subscriptions for the customer
    const subscriptionsResult = await getCustomerSubscriptions(profile.customer_id);

    if (!subscriptionsResult.success || !subscriptionsResult.subscriptions) {
      return NextResponse.json({
        success: true,
        bundleSubscriptions: [],
      });
    }

    // Match subscriptions to bundles
    const bundleSubscriptions: any[] = [];

    subscriptionsResult.subscriptions.forEach((sub: any) => {
      // Only check active, trialing, or past_due subscriptions
      if (!['active', 'trialing', 'past_due'].includes(sub.status)) {
        return;
      }

      // Check each item in the subscription
      sub.items?.forEach((item: any) => {
        const priceId = item.price?.id;
        if (!priceId) return;

        const bundleInfo = priceIdMap.get(priceId);
        if (bundleInfo) {
          bundleSubscriptions.push({
            subscriptionId: sub.id,
            status: sub.status,
            currentPeriodStart: sub.current_period_start,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            canceledAt: sub.canceled_at,
            bundle: {
              id: bundleInfo.bundle.id,
              name: bundleInfo.bundle.name,
              slug: bundleInfo.bundle.slug,
              tagline: bundleInfo.bundle.tagline,
              description: bundleInfo.bundle.description,
              featured_image_url: bundleInfo.bundle.featured_image_url,
            },
            subscriptionType: bundleInfo.subscriptionType,
            priceId: priceId,
          });
        }
      });
    });

    return NextResponse.json({
      success: true,
      bundleSubscriptions,
    });
  } catch (error: any) {
    console.error('Error fetching bundle subscriptions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bundle subscriptions' },
      { status: 500 }
    );
  }
}

