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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerEmail, customerId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined = customerId;

    if (!stripeCustomerId && customerEmail) {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: customerEmail,
        });
        stripeCustomerId = newCustomer.id;
      }
    }

    // Build line items for Stripe checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: CartItem) => {
      const price = item.sale_price || item.price;
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            metadata: {
              product_id: item.id,
            },
          },
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Calculate total
    const total = items.reduce((sum: number, item: CartItem) => {
      const price = item.sale_price || item.price;
      return sum + price * item.quantity;
    }, 0);

    // Get base URL
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      customer_email: customerEmail,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        cart_items: JSON.stringify(items.map((item: CartItem) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
        }))),
        total_amount: total.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

