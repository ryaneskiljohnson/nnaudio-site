import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * POST /api/payment-intent/[id]/verify-payment-method
 * Verifies that a payment method from a payment intent is attached to the customer
 * and sets it as default if needed. With setup_future_usage, Stripe should auto-attach,
 * but we verify and ensure it's set as default.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Retrieve the payment intent to get customer ID
    const paymentIntent = await stripe.paymentIntents.retrieve(id, {
      expand: ['payment_method'],
    });

    if (!paymentIntent.customer || typeof paymentIntent.customer !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Payment intent does not have a customer' },
        { status: 400 }
      );
    }

    const customerId = paymentIntent.customer;

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

    // Retrieve the payment method to check if it's attached
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // If not attached, attach it (shouldn't happen with setup_future_usage, but just in case)
    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    }

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
      message: 'Payment method verified and set as default',
      attached: !!paymentMethod.customer,
    });
  } catch (error: any) {
    console.error('Error verifying payment method:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify payment method' },
      { status: 500 }
    );
  }
}

