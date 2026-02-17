/**
 * @fileoverview Payment methods API - List and manage customer payment methods
 * @module api/payment-methods
 * @note Handles both modern PaymentMethods API and legacy Sources API for backward compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * @brief Fetches all payment methods for the authenticated user
 * @returns JSON response with paymentMethods array and defaultPaymentMethodId
 * @note Queries both PaymentMethods API (new) and Sources API (legacy) to support all saved cards
 * @example Response: { success: true, paymentMethods: [...], defaultPaymentMethodId: "pm_123" }
 */
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

    console.log('[Payment Methods] Fetching for user:', user.email);

    // Get customer_id from user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Payment Methods] Profile error:', profileError);
      return NextResponse.json({
        error: 'Failed to fetch profile',
        details: profileError.message
      }, { status: 500 });
    }

    if (!profile?.customer_id) {
      console.log('[Payment Methods] No customer_id found for user:', user.email);
      return NextResponse.json({
        success: true,
        paymentMethods: [],
        debug: { reason: 'No customer_id in profile' }
      });
    }

    console.log('[Payment Methods] Customer ID:', profile.customer_id);

    // Fetch customer to get default payment method and sources
    let customer;
    try {
      customer = await stripe.customers.retrieve(profile.customer_id, {
        expand: ['default_source'],
      });
      console.log('[Payment Methods] Customer retrieved:', customer.id, 'Email:', customer.email);
    } catch (stripeError: any) {
      console.error('[Payment Methods] Stripe customer retrieve error:', stripeError.message);
      return NextResponse.json({
        error: 'Failed to retrieve customer from Stripe',
        details: stripeError.message
      }, { status: 500 });
    }
    
    const defaultPaymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id || null;

    const defaultSourceId = 
      typeof customer.default_source === 'string'
        ? customer.default_source
        : customer.default_source?.id || null;

    // Fetch payment methods (new API)
    let paymentMethods;
    try {
      paymentMethods = await stripe.paymentMethods.list({
        customer: profile.customer_id,
        type: 'card',
      });
      console.log('[Payment Methods API] Found', paymentMethods.data.length, 'payment methods');
    } catch (pmError: any) {
      console.error('[Payment Methods API] Error:', pmError.message);
      paymentMethods = { data: [] };
    }

    // Fetch sources (legacy API) - these are cards saved before PaymentMethods API
    let sources;
    try {
      sources = await stripe.customers.listSources(profile.customer_id, {
        object: 'card',
        limit: 100,
      });
      console.log('[Sources API] Found', sources.data.length, 'sources');
      if (sources.data.length > 0) {
        console.log('[Sources API] First source:', JSON.stringify(sources.data[0], null, 2));
      }
    } catch (sourceError: any) {
      console.error('[Sources API] Error:', sourceError.message);
      sources = { data: [] };
    }

    console.log('[Customer]', profile.customer_id, 'Default PM:', defaultPaymentMethodId, 'Default Source:', defaultSourceId);

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
      isDefault: pm.id === defaultPaymentMethodId,
      isSource: false,
    }));

    // Format legacy sources (cards)
    const formattedSources = sources.data.map((source: any) => ({
      id: source.id,
      type: 'card',
      card: {
        brand: source.brand || 'card',
        last4: source.last4 || '****',
        exp_month: source.exp_month,
        exp_year: source.exp_year,
      },
      created: source.created,
      isDefault: source.id === defaultSourceId,
      isSource: true, // Mark as legacy source
    }));

    // Combine both
    const allMethods = [...formattedMethods, ...formattedSources];

    console.log('[Combined] Returning', allMethods.length, 'total payment methods');

    return NextResponse.json({
      success: true,
      paymentMethods: allMethods,
      defaultPaymentMethodId: defaultPaymentMethodId || defaultSourceId,
      debug: {
        customerId: profile.customer_id,
        paymentMethodsCount: paymentMethods.data.length,
        sourcesCount: sources.data.length,
        totalCount: allMethods.length,
      }
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

/**
 * @brief Removes a payment method from the customer
 * @param request.searchParams.id - Payment method ID to remove
 * @param request.searchParams.isSource - Whether this is a legacy Source (true) or PaymentMethod (false)
 * @returns JSON response with success status
 * @note Uses different Stripe API calls for Sources vs PaymentMethods
 */
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
    const isSource = searchParams.get('isSource') === 'true';

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get customer_id from user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Handle removal based on type (PaymentMethod vs Source)
    if (isSource) {
      // Delete legacy source (Stripe validates it belongs to this customer)
      await stripe.customers.deleteSource(profile.customer_id, paymentMethodId);
    } else {
      // Verify payment method belongs to this customer before detaching
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      const pmCustomerId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
      if (pmCustomerId !== profile.customer_id) {
        return NextResponse.json(
          { error: 'Payment method does not belong to your account' },
          { status: 403 }
        );
      }
      await stripe.paymentMethods.detach(paymentMethodId);
    }

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

