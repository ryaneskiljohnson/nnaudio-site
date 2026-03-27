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
 * @brief Stripe coupon customer-visible name; capped at 40 characters per Stripe API.
 * @param titleTrim Promotion title (trimmed).
 * @param codeNorm Coupon / promotion code id.
 * @returns Value safe to pass as Stripe `Coupon.name`.
 */
function stripeCouponDisplayName(titleTrim: string, codeNorm: string): string {
  return (titleTrim || codeNorm).slice(0, 40);
}

/**
 * @brief Unix `redeem_by` for Stripe coupons from admin `end_date` (+1 day, same as create).
 * @param end_date Raw end date from the request.
 * @returns Seconds since epoch, or null when open-ended.
 */
function desiredStripeRedeemBy(
  end_date: string | null | undefined
): number | null {
  if (!end_date) return null;
  const endDateObj = new Date(end_date);
  endDateObj.setDate(endDateObj.getDate() + 1);
  return Math.floor(endDateObj.getTime() / 1000);
}

/**
 * @brief Builds Stripe `CouponCreateParams` from promotion fields.
 * @param codeNorm Coupon id (customer code).
 * @param titleTrim Promotion title.
 * @param end_date Promotion end date input.
 * @param discount_type Percent or fixed amount.
 * @param discountNum Parsed positive discount value.
 * @returns Params for `stripe.coupons.create`.
 */
function buildPromotionStripeCouponParams(
  codeNorm: string,
  titleTrim: string,
  end_date: string | null | undefined,
  discount_type: "percentage" | "amount",
  discountNum: number
): Stripe.CouponCreateParams {
  const params: Stripe.CouponCreateParams = {
    id: codeNorm,
    name: stripeCouponDisplayName(titleTrim, codeNorm),
    duration: "once",
  };
  const rb = desiredStripeRedeemBy(end_date);
  if (rb != null) {
    params.redeem_by = rb;
  }
  if (discount_type === "percentage") {
    params.percent_off = Math.round(discountNum);
  } else {
    params.amount_off = Math.round(discountNum * 100);
    params.currency = "usd";
  }
  return params;
}

/**
 * @brief Whether a retrieved Stripe coupon matches immutable promotion fields (Stripe coupons cannot change amount/%/redeem_by in place).
 * @param coupon Retrieved Stripe coupon.
 * @param discount_type Expected discount kind.
 * @param discountNum Parsed promotion discount value.
 * @param desiredRedeemBy Expected `redeem_by` or null.
 * @returns True if discount and expiry match the promotion.
 */
function stripeCouponImmutableFieldsMatch(
  coupon: Stripe.Coupon,
  discount_type: "percentage" | "amount",
  discountNum: number,
  desiredRedeemBy: number | null
): boolean {
  const redeemOk =
    desiredRedeemBy == null
      ? coupon.redeem_by == null
      : coupon.redeem_by === desiredRedeemBy;
  if (!redeemOk) return false;
  if (discount_type === "percentage") {
    return (
      coupon.percent_off != null &&
      Math.round(Number(coupon.percent_off)) === Math.round(discountNum)
    );
  }
  return (
    coupon.amount_off != null &&
    coupon.amount_off === Math.round(discountNum * 100) &&
    (coupon.currency || "").toLowerCase() === "usd"
  );
}

/** @brief UUID v1–v8 shape for promotion row ids (insert vs update). */
const PROMOTION_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @brief True only for explicit JSON true / 1 / "true" / "1" — never for string `"false"` (non-empty strings are truthy in JS).
 * @param raw Request body value for `stripe_coupon_created`.
 * @returns Whether the client reports an existing Stripe coupon for this row.
 */
function parseStripeCouponCreatedFlag(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === "true" || raw === "1";
}

/**
 * @brief “Sync coupon to Stripe” checkbox; default on when the key is omitted.
 * @param raw Request body value for `create_stripe_coupon`.
 * @returns Whether to create or reconcile the Stripe coupon.
 */
function parseCreateStripeCouponFlag(raw: unknown): boolean {
  return raw !== false && raw !== "false";
}

/**
 * @brief Normalizes `body.id` to a valid UUID string or undefined (treats bogus strings as create).
 * @param raw Request `id` field.
 * @returns Trimmed UUID or undefined.
 */
function parsePromotionUpdateId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t || !PROMOTION_ID_UUID_RE.test(t)) return undefined;
  return t;
}

/**
 * @brief Stripe coupon id when the admin leaves the code blank but left sync enabled (allowed chars + max length).
 * @param nameTrim Internal promotion `name` (trimmed).
 * @returns Non-empty id safe for `^[a-zA-Z0-9_-]+$` (max 40).
 */
function deriveStripeCouponCodeFromName(nameTrim: string): string {
  let s = nameTrim
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!s) {
    s = `PROMO_${Date.now().toString(36).toUpperCase()}`;
  }
  return s.slice(0, 40);
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
      name,
      title,
      description,
      active,
      start_date,
      end_date,
      discount_type,
      discount_value,
      stripe_coupon_code,
      banner_theme,
      priority,
    } = body;

    const id = parsePromotionUpdateId(body.id);
    const create_stripe_coupon = parseCreateStripeCouponFlag(
      body.create_stripe_coupon
    );

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

    let codeNorm =
      typeof stripe_coupon_code === "string"
        ? stripe_coupon_code.trim()
        : "";

    // When sync is on and the code field is empty, derive id from internal name so creates still get a Stripe coupon.
    if (!codeNorm && create_stripe_coupon) {
      codeNorm = deriveStripeCouponCodeFromName(nameTrim);
    }

    let stripe_coupon_id = body.stripe_coupon_id as string | null | undefined;
    let stripe_coupon_created = parseStripeCouponCreatedFlag(
      body.stripe_coupon_created
    );

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

    const isUpdate = Boolean(id);
    // Sync: auto-create / first-time code, or editing an existing promotion that already has a Stripe coupon (reconcile name, discount, expiry).
    const shouldSyncStripeCoupon = Boolean(
      codeNorm &&
        (create_stripe_coupon ||
          !stripe_coupon_created ||
          (isUpdate && stripe_coupon_created))
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
        const desiredRedeemBy = desiredStripeRedeemBy(end_date);
        const desiredDisplayName = stripeCouponDisplayName(titleTrim, codeNorm);
        const dt = discount_type as "percentage" | "amount";

        try {
          coupon = await stripe.coupons.retrieve(codeNorm);
          console.log("✅ Stripe coupon already exists:", codeNorm);

          const immutableOk = stripeCouponImmutableFieldsMatch(
            coupon,
            dt,
            discountNum,
            desiredRedeemBy
          );
          const nameOk = (coupon.name || "") === desiredDisplayName;

          if (immutableOk && nameOk) {
            stripe_coupon_id = coupon.id;
            stripe_coupon_created = true;
            await ensurePromotionCodeForCoupon(coupon.id, codeNorm);
          } else if (immutableOk && !nameOk) {
            await stripe.coupons.update(codeNorm, { name: desiredDisplayName });
            coupon = await stripe.coupons.retrieve(codeNorm);
            stripe_coupon_id = coupon.id;
            stripe_coupon_created = true;
            await ensurePromotionCodeForCoupon(coupon.id, codeNorm);
          } else {
            console.log(
              "🔄 Coupon discount or expiry differs from promotion — recreating Stripe coupon"
            );
            try {
              await stripe.coupons.del(codeNorm);
            } catch (delErr: unknown) {
              if (!isStripeCouponMissing(delErr)) throw delErr;
            }
            const couponParams = buildPromotionStripeCouponParams(
              codeNorm,
              titleTrim,
              end_date,
              dt,
              discountNum
            );
            if (desiredRedeemBy != null) {
              console.log(
                `📅 Coupon redeem_by: ${new Date(desiredRedeemBy * 1000).toISOString()}`
              );
            }
            coupon = await stripe.coupons.create(couponParams);
            console.log("✅ Recreated Stripe coupon:", coupon.id);
            stripe_coupon_id = coupon.id;
            stripe_coupon_created = true;
            await ensurePromotionCodeForCoupon(coupon.id, codeNorm);
          }
        } catch (err: unknown) {
          if (!isStripeCouponMissing(err)) {
            console.error("❌ Unexpected Stripe error on retrieve:", err);
            throw err;
          }

          console.log("📝 Coupon not found, creating…");

          const couponParams = buildPromotionStripeCouponParams(
            codeNorm,
            titleTrim,
            end_date,
            dt,
            discountNum
          );
          if (desiredRedeemBy != null) {
            console.log(
              `📅 Coupon redeem_by: ${new Date(desiredRedeemBy * 1000).toISOString()}`
            );
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
        "⏭️ Skipping Stripe sync (no reconcile: not an update with an existing coupon, auto-create off, and coupon already marked created)"
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

