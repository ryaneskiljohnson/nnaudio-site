/**
 * @fileoverview Admin CRUD for `promotions` including Stripe coupon sync.
 * @module app/api/admin/promotions/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from "stripe";
import { pstDateToUTC } from "@/utils/timezoneUtils";
import { stripe } from "@/utils/stripe/client";
import {
  normalizeIncludedTargets,
  type PromotionTargetMode,
} from "@/utils/promotions/apply-promotion";

/** @brief Matches DB default for `promotions.banner_theme` when the client omits it. */
const DEFAULT_BANNER_THEME = {
  background: "linear-gradient(135deg, #FF6B6B, #FF0000)",
  textColor: "#FFFFFF",
  accentColor: "#FFD700",
} as const;

/**
 * @brief Removes `undefined` so PostgREST omits keys and column DEFAULTs apply.
 * @param row Raw object from route handler.
 * @returns Shallow clone without undefined values.
 */
function omitUndefined<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (out[k as keyof T] === undefined) {
      delete out[k as keyof T];
    }
  }
  return out;
}

/**
 * GET - Fetch all promotions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all promotions
    const { data: promotions, error } = await (supabase as any)
      .from('promotions')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
      return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      promotions,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/promotions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Create or update a promotion
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      title,
      description,
      active,
      start_date,
      end_date,
      discount_type,
      discount_value,
      stripe_coupon_code,
      create_stripe_coupon,
      banner_theme,
      priority,
    } = body;

    const promotion_target_mode: PromotionTargetMode =
      body.promotion_target_mode === "all" ? "all" : "selected";
    const included_targets =
      promotion_target_mode === "all"
        ? []
        : normalizeIncludedTargets(body.included_targets);

    const discountNum = Number(discount_value);
    if (!Number.isFinite(discountNum) || discountNum <= 0) {
      return NextResponse.json(
        { error: "Discount value must be a number greater than 0" },
        { status: 400 }
      );
    }

    if (discount_type !== "percentage" && discount_type !== "amount") {
      return NextResponse.json(
        { error: 'discount_type must be "percentage" or "amount"' },
        { status: 400 }
      );
    }

    if (discount_type === "percentage" && discountNum > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100" },
        { status: 400 }
      );
    }

    const nameTrim = typeof name === "string" ? name.trim() : "";
    const titleTrim = typeof title === "string" ? title.trim() : "";
    if (!nameTrim || !titleTrim) {
      return NextResponse.json(
        { error: "Name and title are required" },
        { status: 400 }
      );
    }

    // Create Stripe coupon if requested
    let stripe_coupon_id = body.stripe_coupon_id;
    let stripe_coupon_created = body.stripe_coupon_created || false;

    if (create_stripe_coupon && stripe_coupon_code) {
      try {
        console.log('🔍 Checking if Stripe coupon exists:', stripe_coupon_code);
        console.log('📋 Promotion details:', { discount_type, discount_value, title });
        
        // Validate coupon code format (Stripe allows alphanumeric, underscores, hyphens)
        const couponCodeRegex = /^[a-zA-Z0-9_-]+$/;
        if (!couponCodeRegex.test(stripe_coupon_code)) {
          throw new Error(`Invalid coupon code format. Only letters, numbers, underscores, and hyphens are allowed.`);
        }
        
        // Check if coupon already exists
        let coupon;
        try {
          coupon = await stripe.coupons.retrieve(stripe_coupon_code);
          console.log('✅ Stripe coupon already exists:', stripe_coupon_code);
          stripe_coupon_id = coupon.id;
          stripe_coupon_created = true;
        } catch (err: any) {
          if (err.code === 'resource_missing') {
            // Coupon doesn't exist, create it
            console.log('📝 Coupon not found, creating new one...');
            
            // Validate discount value
            if (!discount_value || discount_value <= 0) {
              throw new Error('Discount value must be greater than 0');
            }
            
            if (discount_type === 'percentage' && discount_value > 100) {
              throw new Error('Percentage discount cannot exceed 100%');
            }

            const couponParams: Stripe.CouponCreateParams = {
              id: stripe_coupon_code,
              name: title || stripe_coupon_code,
              duration: 'once',
            };

            // Set redeem_by date if promotion has an end_date
            // This automatically disables the coupon in Stripe after the sale ends
            if (end_date) {
              const endDateObj = new Date(end_date);
              // Add 1 day buffer to allow for timezone differences and ensure it works until end of day PST
              endDateObj.setDate(endDateObj.getDate() + 1);
              couponParams.redeem_by = Math.floor(endDateObj.getTime() / 1000); // Stripe expects Unix timestamp
              console.log(`📅 Setting coupon expiration to: ${endDateObj.toISOString()}`);
            }

            if (discount_type === 'percentage') {
              couponParams.percent_off = Math.round(discount_value);
              console.log(`💰 Creating ${discount_value}% OFF coupon`);
            } else {
              // For amount off, use the discount_value directly (assumed to be in dollars)
              const amountInCents = Math.round(discount_value * 100);
              couponParams.amount_off = amountInCents;
              couponParams.currency = 'usd';
              console.log(`💰 Creating $${discount_value} OFF coupon (${amountInCents} cents)`);
            }

            console.log('🎫 Coupon parameters:', JSON.stringify(couponParams, null, 2));
            
            try {
              coupon = await stripe.coupons.create(couponParams);
              console.log('✅ Successfully created Stripe coupon:', coupon.id);
              console.log('📊 Coupon details:', {
                id: coupon.id,
                name: coupon.name,
                percent_off: coupon.percent_off,
                amount_off: coupon.amount_off,
                currency: coupon.currency,
              });
              
              stripe_coupon_id = coupon.id;
              stripe_coupon_created = true;
            } catch (createError: any) {
              console.error('❌ Stripe coupon creation failed:', {
                code: createError.code,
                message: createError.message,
                type: createError.type,
                param: createError.param,
              });
              throw new Error(`Failed to create Stripe coupon: ${createError.message || 'Unknown error'}`);
            }
          } else {
            console.error('❌ Unexpected Stripe error:', err.code, err.message);
            throw err;
          }
        }
      } catch (error) {
        console.error('❌ Error with Stripe coupon:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
          error: 'Failed to create Stripe coupon',
          details: errorMessage,
        }, { status: 500 });
      }
    } else {
      console.log('⏭️ Skipping Stripe coupon creation (checkbox not checked or code missing)');
    }

    // Convert PST date inputs to UTC timestamps for database storage
    // Dates entered in the admin UI are treated as PST dates

    const codeNorm =
      typeof stripe_coupon_code === "string"
        ? stripe_coupon_code.trim()
        : "";
    const promotionData = omitUndefined({
      name: nameTrim,
      title: titleTrim,
      description: description ?? null,
      active: Boolean(active),
      start_date: pstDateToUTC(start_date, false),
      end_date: pstDateToUTC(end_date, true),
      discount_type,
      discount_value: discountNum,
      stripe_coupon_code: codeNorm || null,
      stripe_coupon_id: stripe_coupon_id ?? null,
      stripe_coupon_created: Boolean(stripe_coupon_created),
      banner_theme: banner_theme ?? DEFAULT_BANNER_THEME,
      promotion_target_mode,
      included_targets,
      priority: Number(priority) || 0,
    });

    let result;
    if (id) {
      // Update existing promotion
      const { data, error } = await supabase
        .from('promotions')
        .update(promotionData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating promotion:', error);
        const code = (error as { code?: string }).code;
        if (code === "23505") {
          return NextResponse.json(
            {
              error: "A promotion with this internal name already exists",
              details: error.message,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: "Failed to update promotion",
            details: error.message,
            hint: (error as { hint?: string }).hint,
            code: (error as { code?: string }).code,
          },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // Create new promotion
      const { data, error } = await supabase
        .from('promotions')
        .insert(promotionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating promotion:', error);
        const code = (error as { code?: string }).code;
        if (code === "23505") {
          return NextResponse.json(
            {
              error: "A promotion with this internal name already exists",
              details: error.message,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: "Failed to create promotion",
            details: error.message,
            hint: (error as { hint?: string }).hint,
            code: (error as { code?: string }).code,
          },
          { status: 500 }
        );
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      promotion: result,
      stripe_coupon_created,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/promotions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete a promotion
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID required' }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('promotions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting promotion:', error);
      return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Promotion deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/promotions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

