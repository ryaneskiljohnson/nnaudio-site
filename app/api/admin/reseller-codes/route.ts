/**
 * @fileoverview API routes for managing reseller codes
 * @module api/admin/reseller-codes
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief Get reseller codes with optional filters (admin only)
 * @param {NextRequest} request - Request with query params: reseller_id, product_id
 * @returns {Promise<NextResponse>} JSON response with codes array
 * 
 * @example
 * GET /api/admin/reseller-codes?reseller_id=xxx
 * GET /api/admin/reseller-codes?product_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resellerId = searchParams.get("reseller_id");
    const productId = searchParams.get("product_id");

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = adminSupabase
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
      .order("created_at", { ascending: false });

    if (resellerId) {
      query = query.eq("reseller_id", resellerId);
    }

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: codes, error } = await query;

    if (error) {
      console.error("[Reseller Codes GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user information for redeemed codes
    const userIds = new Set<string>();
    (codes || []).forEach((code: any) => {
      if (code.redeemed_by_user_id) {
        userIds.add(code.redeemed_by_user_id);
      }
    });

    const userInfoMap = new Map<string, { email: string; firstName?: string; lastName?: string }>();
    
    if (userIds.size > 0) {
      // Fetch user emails from auth
      for (const userId of userIds) {
        try {
          const { data: { user }, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
          if (!userError && user?.email) {
            userInfoMap.set(userId, { email: user.email });
          }
        } catch (err) {
          console.error(`[Reseller Codes GET] Error fetching user ${userId}:`, err);
        }
      }

      // Fetch user names from profiles
      try {
        const { data: profiles, error: profilesError } = await adminSupabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", Array.from(userIds));

        if (profilesError) {
          console.error("[Reseller Codes GET] Error fetching profiles:", profilesError);
        } else if (profiles) {
          profiles.forEach((profile) => {
            const existing = userInfoMap.get(profile.id) || { email: "" };
            userInfoMap.set(profile.id, {
              ...existing,
              firstName: profile.first_name || undefined,
              lastName: profile.last_name || undefined,
            });
          });
        }
      } catch (err) {
        console.error("[Reseller Codes GET] Exception fetching profiles:", err);
      }
    }

    // Attach user information to codes
    const codesWithUsers = (codes || []).map((code: any) => {
      if (code.redeemed_by_user_id && userInfoMap.has(code.redeemed_by_user_id)) {
        const userInfo = userInfoMap.get(code.redeemed_by_user_id)!;
        return {
          ...code,
          redeemed_by_user: {
            id: code.redeemed_by_user_id,
            email: userInfo.email,
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
          },
        };
      }
      return code;
    });

    return NextResponse.json({ codes: codesWithUsers });
  } catch (error: any) {
    console.error("[Reseller Codes GET] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @brief Create reseller codes (admin only)
 * @param {NextRequest} request - Request with JSON body containing codes data
 * @returns {Promise<NextResponse>} JSON response with created codes
 * 
 * @example
 * POST /api/admin/reseller-codes
 * Body: {
 *   "reseller_id": "uuid",
 *   "product_id": "uuid",
 *   "codes": ["CODE1", "CODE2", "CODE3"] // Array of serial codes
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { reseller_id, product_id, codes } = body;

    if (!reseller_id || !product_id) {
      return NextResponse.json(
        { error: "reseller_id and product_id are required" },
        { status: 400 }
      );
    }

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "codes array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate all codes are strings and not empty
    const validCodes = codes.filter(
      (code) => typeof code === "string" && code.trim().length > 0
    );

    if (validCodes.length === 0) {
      return NextResponse.json(
        { error: "At least one valid code is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for duplicate codes
    const { data: existingCodes, error: checkError } = await adminSupabase
      .from("reseller_codes")
      .select("serial_code")
      .in("serial_code", validCodes);

    if (checkError) {
      console.error("[Reseller Codes POST] Error checking existing codes:", checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingCodes && existingCodes.length > 0) {
      const duplicates = existingCodes.map((c) => c.serial_code);
      return NextResponse.json(
        {
          error: "Some codes already exist",
          duplicates,
        },
        { status: 400 }
      );
    }

    // Insert codes (remove hyphens - they're only for display)
    const codesToInsert = validCodes.map((code) => ({
      reseller_id,
      product_id,
      serial_code: code.replace(/[-\s]/g, "").trim().toUpperCase(),
    }));

    const { data: insertedCodes, error: insertError } = await adminSupabase
      .from("reseller_codes")
      .insert(codesToInsert)
      .select(`
        *,
        products:product_id (
          id,
          name,
          slug
        )
      `);

    if (insertError) {
      console.error("[Reseller Codes POST] Error inserting codes:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      codes: insertedCodes,
      count: insertedCodes?.length || 0,
    });
  } catch (error: any) {
    console.error("[Reseller Codes POST] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
