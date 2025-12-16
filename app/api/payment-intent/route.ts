import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
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
    const { items, promotionCodeId, savePaymentMethod } = body;

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

      // Save customer_id to user's profile if not already set
      if (stripeCustomerId && user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("customer_id")
          .eq("id", user.id)
          .single();

        if (!profile?.customer_id) {
          await supabase
            .from("profiles")
            .update({ customer_id: stripeCustomerId })
            .eq("id", user.id);
        }
      }
    }

    // Calculate total amount
    let totalAmount = items.reduce((sum: number, item: CartItem) => {
      const price = item.sale_price || item.price;
      return sum + price * item.quantity;
    }, 0);

    // Apply promotion code discount if provided
    // promotionCodeId can be either a Stripe promotion code ID (promo_xxxxx) or a code string
    let discountAmount = 0;
    if (promotionCodeId) {
      try {
        let promotionCode: Stripe.PromotionCode | null = null;
        
        // Check if it's a promotion code ID (starts with 'promo_')
        if (promotionCodeId.startsWith('promo_')) {
          try {
            promotionCode = await stripe.promotionCodes.retrieve(promotionCodeId);
          } catch (error) {
            console.error('Error retrieving promotion code by ID:', error);
          }
        }
        
        // If not found by ID, try looking up by code string
        if (!promotionCode) {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promotionCodeId.toUpperCase(),
          active: true,
          limit: 1,
        });
        if (promotionCodes.data.length > 0) {
            promotionCode = promotionCodes.data[0];
          }
        }

        if (promotionCode) {
          const coupon = typeof promotionCode.coupon === 'string'
            ? await stripe.coupons.retrieve(promotionCode.coupon)
            : promotionCode.coupon;

          if (coupon.valid) {
            // Calculate discount amount
            if (coupon.percent_off) {
              discountAmount = (totalAmount * coupon.percent_off) / 100;
            } else if (coupon.amount_off) {
              discountAmount = coupon.amount_off / 100; // Convert from cents to dollars
            }
            totalAmount = Math.max(0, totalAmount - discountAmount);
            
            console.log(`✅ Applied discount: $${discountAmount.toFixed(2)} (${coupon.percent_off ? coupon.percent_off + '%' : '$' + discountAmount.toFixed(2)})`);
            console.log(`💰 Original total: $${(totalAmount + discountAmount).toFixed(2)}, Final total: $${totalAmount.toFixed(2)}`);
          } else {
            console.warn('⚠️ Coupon is not valid');
          }
        } else {
          console.warn(`⚠️ Promotion code not found: ${promotionCodeId}`);
        }
      } catch (error) {
        console.error('Error applying promotion code:', error);
        // Continue without discount if promo code validation fails
      }
    }

    // Stripe minimum charge is $0.50 USD
    const STRIPE_MINIMUM_AMOUNT = 0.50;
    
    // If total is exactly $0, treat as free order
    if (totalAmount === 0) {
      return NextResponse.json({
        success: true,
        isFreeOrder: true,
        amount: 0,
        message: 'This is a free order.',
      });
    }
    
    // If total is less than Stripe minimum (but not $0), charge the minimum $0.50
    if (totalAmount > 0 && totalAmount < STRIPE_MINIMUM_AMOUNT) {
      console.log(`⚠️ Order total ($${totalAmount.toFixed(2)}) is below Stripe's minimum of $${STRIPE_MINIMUM_AMOUNT.toFixed(2)}. Charging minimum amount.`);
      totalAmount = STRIPE_MINIMUM_AMOUNT;
      // Adjust discount amount to reflect the minimum charge
      discountAmount = Math.max(0, (items.reduce((sum: number, item: CartItem) => {
        const price = item.sale_price || item.price;
        return sum + price * item.quantity;
      }, 0)) - totalAmount);
    }

    // Build line items for metadata
    const lineItems = items.map((item: CartItem) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.sale_price || item.price,
    }));

    // Create Payment Intent with discounted amount
    // Note: Payment Intents don't support discounts parameter - we apply discount by reducing amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents (already discounted)
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: savePaymentMethod ? 'off_session' : undefined, // Save payment method for future use
      metadata: {
        cart_items: JSON.stringify(lineItems),
        original_total: (totalAmount + discountAmount).toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        user_id: user?.id || 'anonymous',
        ...(promotionCodeId && { promotion_code: promotionCodeId }),
        ...(savePaymentMethod && { save_payment_method: 'true' }),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isFreeOrder: false,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

