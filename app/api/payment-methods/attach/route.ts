import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paymentMethodId, customerId } = body;

    if (!paymentMethodId || !customerId) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID and customer ID are required' },
        { status: 400 }
      );
    }

    // Verify the customer belongs to the user
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.customer_id !== customerId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method if customer doesn't have one
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && !customer.invoice_settings?.default_payment_method) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method saved successfully',
    });
  } catch (error: any) {
    console.error('Error attaching payment method:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save payment method' },
      { status: 500 }
    );
  }
}

