/**
 * @fileoverview Creates PaymentIntents for the storefront cart; applies promo discounts with product eligibility.
 * @module app/api/payment-intent/route
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { stripe } from "@/utils/stripe/client";
import { resolveActivePromotionCode } from "@/utils/stripe/checkout-discount";
import {
  discountAmountForEligibleSubtotal,
  eligibleSubtotalForPromotion,
  type PromotionPricingRow,
} from '@/utils/promotions/apply-promotion';
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  type OrderLineItem as ConfirmationLineItem,
} from "@/utils/order-confirmation-email";
import { getAdminEmailsForOrderCopy } from "@/lib/admin-order-email-copy";

interface CartItem {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  stripe_price_id?: string | null;
}

const STRIPE_UNAVAILABLE_MSG =
  'Payment service is temporarily unavailable. Please try again later.';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { success: false, error: STRIPE_UNAVAILABLE_MSG },
        { status: 503 }
      );
    }
    const body = await request.json();
    const { items, promotionCodeId, savePaymentMethod, paymentMethodId } = body;

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
      // Use sale_price if it exists (including 0), otherwise use regular price
      const price = (item.sale_price !== null && item.sale_price !== undefined) ? item.sale_price : item.price;
      return sum + price * item.quantity;
    }, 0);

    // Apply promotion code discount if provided
    // promotionCodeId can be either a Stripe promotion code ID (promo_xxxxx) or a code string
    let discountAmount = 0;
    let appliedPromotionCodeDisplay: string | null = null;
    let appliedPromotionCodeMetadata: string | null = null;
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
        
        // If not found by ID, try looking up by code string (uppercase) then coupon id / case variants
        if (!promotionCode) {
          const promotionCodes = await stripe.promotionCodes.list({
            code: String(promotionCodeId).toUpperCase(),
            active: true,
            limit: 1,
          });
          if (promotionCodes.data.length > 0) {
            promotionCode = promotionCodes.data[0];
          }
        }

        if (!promotionCode && typeof promotionCodeId === "string") {
          promotionCode = await resolveActivePromotionCode(promotionCodeId);
        }

        if (promotionCode) {
          appliedPromotionCodeDisplay = (
            promotionCode.code || String(promotionCodeId)
          ).toUpperCase();
          appliedPromotionCodeMetadata = promotionCode.id;
          const promotion = promotionCode.promotion;
          const couponRef = promotion?.type === "coupon" ? promotion.coupon : null;
          const coupon =
            couponRef == null
              ? null
              : typeof couponRef === "string"
                ? await stripe.coupons.retrieve(couponRef)
                : couponRef;

          if (coupon?.valid) {
            let dbPromotion: PromotionPricingRow | null = null;
            try {
              const { data } = await (supabase as any)
                .from('promotions')
                .select('promotion_target_mode, included_targets, discount_type, discount_value')
                .eq('stripe_coupon_code', coupon.id)
                .maybeSingle();
              if (data) {
                dbPromotion = data as PromotionPricingRow;
              }
            } catch (lookupErr) {
              console.warn('[payment-intent] promotions lookup failed', lookupErr);
            }

            const lineItemsForPromo = items.map((item: CartItem) => {
              const price =
                item.sale_price !== null && item.sale_price !== undefined
                  ? item.sale_price
                  : item.price;
              return { id: item.id, lineTotal: price * item.quantity };
            });

            const eligibleSubtotal = eligibleSubtotalForPromotion(
              lineItemsForPromo,
              dbPromotion
            );

            if (eligibleSubtotal <= 0) {
              return NextResponse.json(
                {
                  success: false,
                  error:
                    'This promotion does not apply to any items in your cart.',
                },
                { status: 400 }
              );
            }

            discountAmount = discountAmountForEligibleSubtotal(eligibleSubtotal, coupon);
            totalAmount = Math.max(0, totalAmount - discountAmount);

            console.log(`✅ Applied discount: $${discountAmount.toFixed(2)} (${coupon.percent_off ? coupon.percent_off + '%' : 'fixed'})`);
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

    // If total is exactly $0, record free order in product_grants and return
    if (totalAmount === 0) {
      if (!user?.id || !user?.email) {
        return NextResponse.json(
          { success: false, error: 'Sign in to complete your free order.' },
          { status: 400 }
        );
      }
      const productIds = [...new Set((items as CartItem[]).map((i) => i.id).filter(Boolean))] as string[];
      if (productIds.length > 0) {
        const adminSupabase = await createSupabaseServiceRole();
        const now = new Date().toISOString();
        const rows = productIds.map((product_id) => ({
          user_email: user.email!.toLowerCase(),
          product_id,
          granted_at: now,
          granted_by: user.id,
          notes: 'Free checkout',
          amount: 0,
          updated_at: now,
        }));
        const { error: grantError } = await (adminSupabase as any)
          .from('product_grants')
          .upsert(rows, { onConflict: 'user_email,product_id' });
        if (grantError) {
          console.error('[payment-intent] Free order product_grants upsert error:', grantError);
          return NextResponse.json(
            { success: false, error: 'Failed to record your free order. Please try again or contact support.' },
            { status: 500 }
          );
        }
      }

      // Send order confirmation email (same as Stripe webhook for paid orders)
      const email = user.email!;
      const lineItems: ConfirmationLineItem[] = (items as CartItem[]).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        amount: '$0.00',
      }));
      const orderNumber = 'FREE-' + Date.now().toString(36).toUpperCase().slice(-8);
      const dateStr = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const { sendEmail } = await import('@/utils/email');
      const data = {
        customerEmail: email,
        customerName: null as string | null,
        orderNumber,
        promotionCode: appliedPromotionCodeDisplay,
        discount: discountAmount > 0 ? `$${discountAmount.toFixed(2)}` : null,
        lineItems,
        subtotal: '$0.00',
        total: '$0.00',
        receiptUrl: null as string | null,
        date: dateStr,
        isFreeOrder: true,
      };
      const result = await sendEmail({
        to: email,
        subject: 'Your order confirmation – NNAud.io',
        html: buildOrderConfirmationHtml(data),
        text: buildOrderConfirmationText(data),
        from: 'NNAudio Support <support@nnaud.io>',
        replyTo: 'support@nnaud.io',
      });
      if (result.success) {
        console.log('[payment-intent] Free order confirmation email sent to', email);
      } else {
        console.error('[payment-intent] Free order confirmation email failed:', result.error);
      }
      const adminEmails = await getAdminEmailsForOrderCopy(false, true);
      const subject = 'Your order confirmation – NNAud.io';
      const html = buildOrderConfirmationHtml(data);
      const text = buildOrderConfirmationText(data);
      for (const adminEmail of adminEmails) {
        const adminResult = await sendEmail({
          to: adminEmail,
          subject,
          html,
          text,
          from: 'NNAudio Support <support@nnaud.io>',
          replyTo: 'support@nnaud.io',
        });
        if (adminResult.success) {
          console.log('[payment-intent] Free order confirmation copy sent to admin', adminEmail);
        } else {
          console.error('[payment-intent] Free order copy to admin failed:', adminResult.error);
        }
      }

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
        // Use sale_price if it exists (including 0), otherwise use regular price
        const price = (item.sale_price !== null && item.sale_price !== undefined) ? item.sale_price : item.price;
        return sum + price * item.quantity;
      }, 0)) - totalAmount);
    }

    // If paymentMethodId provided (saved card), verify it belongs to the customer
    if (paymentMethodId) {
      if (!stripeCustomerId) {
        return NextResponse.json(
          { error: 'Sign in to use a saved payment method' },
          { status: 400 }
        );
      }
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== stripeCustomerId) {
          return NextResponse.json(
            { error: 'Payment method does not belong to this account' },
            { status: 400 }
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid payment method';
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }
    }

    // Build line items for metadata
    const lineItems = items.map((item: CartItem) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      // Use sale_price if it exists (including 0), otherwise use regular price
      price: (item.sale_price !== null && item.sale_price !== undefined) ? item.sale_price : item.price,
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
        ...(appliedPromotionCodeMetadata && {
          promotion_code: appliedPromotionCodeMetadata,
        }),
        ...(!appliedPromotionCodeMetadata &&
          promotionCodeId && {
            promotion_code: String(promotionCodeId).toUpperCase(),
          }),
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
    const msg = error?.message ?? '';
    const isConfigError =
      msg.includes('apiKey') ||
      msg.includes('STRIPE_SECRET_KEY') ||
      msg.includes('connection to Stripe') ||
      msg.includes('retried');
    return NextResponse.json(
      {
        success: false,
        error: isConfigError ? STRIPE_UNAVAILABLE_MSG : (error?.message || 'Failed to create payment intent'),
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}

