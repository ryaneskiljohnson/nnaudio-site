import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSupabaseServiceRole } from '@/utils/supabase/service';
import { getCustomerSubscriptions } from '@/utils/stripe/actions';

/**
 * GET /api/stripe/subscriptions
 * Fetches all subscriptions for the authenticated user's Stripe customer.
 * Enriches each subscription with product_thumbnail from bundles (by metadata.bundle_slug).
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

    // Get customer_id from query params or user profile
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');

    let stripeCustomerId = customerId;

    if (!stripeCustomerId) {
      // Get from user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('customer_id')
        .eq('id', user.id)
        .single();

      if (!profile?.customer_id) {
        return NextResponse.json({
          success: true,
          subscriptions: [],
        });
      }

      stripeCustomerId = profile.customer_id;
    }

    // Verify the customer belongs to the user
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.customer_id !== stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch subscriptions
    const result = await getCustomerSubscriptions(stripeCustomerId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    const subscriptions = result.subscriptions || [];

    // Resolve product thumbnails from bundles (by bundle_slug in metadata)
    const slugs = [...new Set(
      subscriptions
        .map((s: { metadata?: { bundle_slug?: string } }) => s.metadata?.bundle_slug)
        .filter(Boolean) as string[]
    )];
    const thumbnailBySlug: Record<string, string | null> = {};
    if (slugs.length > 0) {
      const serviceSupabase = await createSupabaseServiceRole();
      const { data: bundles } = await (serviceSupabase as any)
        .from('bundles')
        .select('slug, featured_image_url, mosaic_image_url')
        .in('slug', slugs);
      if (bundles) {
        for (const b of bundles as { slug: string; featured_image_url?: string | null; mosaic_image_url?: string | null }[]) {
          thumbnailBySlug[b.slug] = b.featured_image_url || b.mosaic_image_url || null;
        }
      }
    }

    const enriched = subscriptions.map((s: { metadata?: { bundle_slug?: string }; [key: string]: unknown }) => ({
      ...s,
      product_thumbnail: s.metadata?.bundle_slug ? (thumbnailBySlug[s.metadata.bundle_slug] ?? null) : null,
    }));

    return NextResponse.json({
      success: true,
      subscriptions: enriched,
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

