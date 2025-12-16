import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCustomerSubscriptions } from '@/utils/stripe/actions';

/**
 * GET /api/stripe/subscriptions
 * Fetches all subscriptions for the authenticated user's Stripe customer
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

    return NextResponse.json({
      success: true,
      subscriptions: result.subscriptions || [],
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

