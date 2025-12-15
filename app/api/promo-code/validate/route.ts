import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, amount } = body; // amount in dollars

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // List promotion codes to find the one matching the code
    const promotionCodes = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    const promotionCode = promotionCodes.data[0];
    const coupon = typeof promotionCode.coupon === 'string'
      ? await stripe.coupons.retrieve(promotionCode.coupon)
      : promotionCode.coupon;

    // Check if coupon is valid
    if (!coupon.valid) {
      return NextResponse.json(
        { error: 'This promo code is no longer valid' },
        { status: 400 }
      );
    }

    // Check redemption limits
    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit' },
        { status: 400 }
      );
    }

    // Check expiration
    if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    let discountPercent = 0;

    if (coupon.percent_off) {
      discountPercent = coupon.percent_off;
      discountAmount = (amount * discountPercent) / 100;
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off / 100; // Convert from cents to dollars
      discountPercent = (discountAmount / amount) * 100;
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    return NextResponse.json({
      success: true,
      promotionCode: {
        id: promotionCode.id,
        code: promotionCode.code,
      },
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
      },
      discount: {
        amount: discountAmount,
        percent: discountPercent,
      },
      originalAmount: amount,
      finalAmount: finalAmount,
    });
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}

