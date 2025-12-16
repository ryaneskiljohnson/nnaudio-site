import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get customer_id from user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json({
        success: true,
        paymentMethods: [],
      });
    }

    // Fetch payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.customer_id,
      type: 'card',
    });

    // Format payment methods for frontend
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      } : null,
      created: pm.created,
    }));

    return NextResponse.json({
      success: true,
      paymentMethods: formattedMethods,
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}

