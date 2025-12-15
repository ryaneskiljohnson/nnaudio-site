import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

interface CartItem {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  stripe_price_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, promotionCodeId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Get user session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;

    if (user?.email) {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
          },
        });
        stripeCustomerId = newCustomer.id;
      }
    }

    // Calculate total amount
    let totalAmount = items.reduce((sum: number, item: CartItem) => {
      const price = item.sale_price || item.price;
      return sum + price * item.quantity;
    }, 0);

    // Apply promotion code discount if provided
    let discountAmount = 0;
    if (promotionCodeId) {
      try {
        // List promotion codes to find the one matching the code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promotionCodeId.toUpperCase(),
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          const promotionCode = promotionCodes.data[0];
          const coupon = typeof promotionCode.coupon === 'string'
            ? await stripe.coupons.retrieve(promotionCode.coupon)
            : promotionCode.coupon;

          if (coupon.valid) {
            if (coupon.percent_off) {
              discountAmount = (totalAmount * coupon.percent_off) / 100;
            } else if (coupon.amount_off) {
              discountAmount = coupon.amount_off / 100; // Convert from cents to dollars
            }
            totalAmount = Math.max(0, totalAmount - discountAmount);
          }
        }
      } catch (error) {
        console.error('Error applying promotion code:', error);
        // Continue without discount if promo code validation fails
      }
    }

    // Build line items for metadata
    const lineItems = items.map((item: CartItem) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.sale_price || item.price,
    }));

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        cart_items: JSON.stringify(lineItems),
        total_amount: totalAmount.toString(),
        user_id: user?.id || 'anonymous',
        ...(promotionCodeId && { promotion_code: promotionCodeId }),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

