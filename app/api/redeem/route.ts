/**
 * @fileoverview API route for redeeming reseller codes
 * @module api/redeem
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * @brief Redeem a reseller code
 * @param {NextRequest} request - Request with JSON body containing serial_code
 * @returns {Promise<NextResponse>} JSON response with redemption result
 * 
 * @example
 * POST /api/redeem
 * Body: {
 *   "serial_code": "ABC123XYZ"
 * }
 * 
 * Response (200): {
 *   "success": true,
 *   "product": {
 *     "id": "uuid",
 *     "name": "Product Name",
 *     "slug": "product-slug"
 *   }
 * }
 * 
 * Response (400): {
 *   "error": "Code already redeemed" | "Invalid code" | "Code is required"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to redeem a code" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { serial_code } = body;

    if (!serial_code || typeof serial_code !== "string") {
      return NextResponse.json(
        { error: "Serial code is required" },
        { status: 400 }
      );
    }

    // Remove hyphens and spaces, then uppercase (hyphens are only for display)
    const normalizedCode = serial_code.replace(/[-\s]/g, "").toUpperCase();

    if (normalizedCode.length === 0) {
      return NextResponse.json(
        { error: "Serial code cannot be empty" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the code
    const { data: code, error: codeError } = await adminSupabase
      .from("reseller_codes")
      .select(`
        *,
        products:product_id (
          id,
          name,
          slug
        ),
        resellers:reseller_id (
          id,
          name
        )
      `)
      .eq("serial_code", normalizedCode)
      .single();

    if (codeError || !code) {
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 400 }
      );
    }

    // Check if already redeemed
    if (code.redeemed_at) {
      // Check if the current user is the one who redeemed it
      if (code.redeemed_by_user_id === user.id) {
        return NextResponse.json({
          success: true,
          already_redeemed: true,
          product: code.products,
          message: "You have already redeemed this code. The product is available in your account.",
        });
      } else {
        return NextResponse.json(
          { error: "This code has already been redeemed" },
          { status: 400 }
        );
      }
    }

    // Get user email for product grant
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.email) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 500 }
      );
    }

    // Redeem the code
    const { error: redeemError } = await adminSupabase
      .from("reseller_codes")
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by_user_id: user.id,
      })
      .eq("id", code.id);

    if (redeemError) {
      console.error("[Redeem] Error updating code:", redeemError);
      return NextResponse.json(
        { error: "Failed to redeem code" },
        { status: 500 }
      );
    }

    // Grant the product to the user (similar to product grants)
    // Check if grant already exists
    const { data: existingGrant } = await adminSupabase
      .from("product_grants")
      .select("id")
      .eq("user_email", profile.email.toLowerCase())
      .eq("product_id", code.product_id)
      .maybeSingle();

    if (!existingGrant) {
      // Create product grant with reseller information
      const resellerName = (code.resellers as any)?.name || "Unknown Reseller";
      const { error: grantError } = await adminSupabase
        .from("product_grants")
        .insert({
          user_email: profile.email.toLowerCase(),
          product_id: code.product_id,
          granted_by: user.id,
          notes: `Redeemed via reseller code: ${normalizedCode} from ${resellerName}`,
        });

      if (grantError) {
        console.error("[Redeem] Error creating product grant:", grantError);
        // Code is already redeemed, but grant failed - this is a problem
        // We should log this for admin review
        return NextResponse.json(
          {
            error: "Code redeemed but product grant failed. Please contact support.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      product: code.products,
      message: "Code redeemed successfully!",
    });
  } catch (error: any) {
    console.error("[Redeem] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
