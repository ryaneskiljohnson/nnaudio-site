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

    const codeNorm =
      typeof stripe_coupon_code === "string"
        ? stripe_coupon_code.trim()
        : "";

    let stripe_coupon_id = body.stripe_coupon_id as string | null | undefined;
    let stripe_coupon_created = Boolean(body.stripe_coupon_created);

    /**
     * @brief Detect Stripe “not found” on coupon retrieve across SDK versions.
     */
    function isStripeCouponMissing(err: unknown): boolean {
      const e = err as { code?: string; statusCode?: number };
      return e?.code === "resource_missing" || e?.statusCode === 404;
    }

    /**
     * @brief Ensures a customer-facing Promotion Code exists for Checkout manual entry + our resolver.
     */
    async function ensurePromotionCodeForCoupon(
      couponId: string,
      customerCode: string
    ): Promise<void> {
      try {
        const { data } = await stripe.promotionCodes.list({
          coupon: couponId,
          active: true,
          limit: 20,
        });
        const upper = customerCode.toUpperCase();
        if (data.some((pc) => (pc.code || "").toUpperCase() === upper)) {
          return;
        }
        await stripe.promotionCodes.create({
          promotion: { type: "coupon", coupon: couponId },
          code: customerCode,
          active: true,
        });
        console.log("✅ Created Stripe promotion code for coupon:", couponId);
      } catch (e) {
        console.warn(
          "[admin/promotions] promotionCodes.create skipped (code may exist or conflict):",
          e
        );
      }
    }

    // Sync coupon when: user checked auto-create, OR DB says coupon was never created (covers edit flow after adding a code).
    const shouldSyncStripeCoupon = Boolean(
      codeNorm && (create_stripe_coupon || !stripe_coupon_created)
    );

    if (shouldSyncStripeCoupon) {
      if (!process.env.STRIPE_SECRET_KEY?.trim()) {
        return NextResponse.json(
          {
            error: "Stripe is not configured",
            details:
              "STRIPE_SECRET_KEY is missing. Set it in .env.local or the host environment.",
          },
          { status: 503 }
        );
      }

      try {
        console.log("🔍 Syncing Stripe coupon for code:", codeNorm);

        const couponCodeRegex = /^[a-zA-Z0-9_-]+$/;
        if (!couponCodeRegex.test(codeNorm)) {
          throw new Error(
            "Invalid coupon code format. Only letters, numbers, underscores, and hyphens are allowed."
          );
        }

        let coupon: Stripe.Coupon;
        try {
          coupon = await stripe.coupons.retrieve(codeNorm);
          console.log("✅ Stripe coupon already exists:", codeNorm);
          stripe_coupon_id = coupon.id;
          stripe_coupon_created = true;
          await ensurePromotionCodeForCoupon(coupon.id, codeNorm);
        } catch (err: unknown) {
          if (!isStripeCouponMissing(err)) {
            console.error("❌ Unexpected Stripe error on retrieve:", err);
            throw err;
          }

          console.log("📝 Coupon not found, creating…");

          const couponParams: Stripe.CouponCreateParams = {
            id: codeNorm,
            name: titleTrim || codeNorm,
            duration: "once",
          };

          if (end_date) {
            const endDateObj = new Date(end_date);
            endDateObj.setDate(endDateObj.getDate() + 1);
            couponParams.redeem_by = Math.floor(endDateObj.getTime() / 1000);
            console.log(`📅 Coupon redeem_by: ${endDateObj.toISOString()}`);
          }

          if (discount_type === "percentage") {
            couponParams.percent_off = Math.round(discountNum);
          } else {
            couponParams.amount_off = Math.round(discountNum * 100);
            couponParams.currency = "usd";
          }

          coupon = await stripe.coupons.create(couponParams);
          console.log("✅ Created Stripe coupon:", coupon.id);

          stripe_coupon_id = coupon.id;
          stripe_coupon_created = true;
          await ensurePromotionCodeForCoupon(coupon.id, codeNorm);
        }
      } catch (error) {
        console.error("❌ Error with Stripe coupon:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
          {
            error: "Failed to create or verify Stripe coupon",
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    } else if (codeNorm) {
      console.log(
        "⏭️ Skipping Stripe sync (coupon already marked created and auto-create unchecked)"
      );
    } else {
      console.log("⏭️ No Stripe coupon code — skipping Stripe sync");
    }

    // Convert PST date inputs to UTC timestamps for database storage
    // Dates entered in the admin UI are treated as PST dates
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

