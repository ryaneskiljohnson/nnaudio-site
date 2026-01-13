/**
 * @fileoverview API route for generating reseller codes
 * @module api/admin/reseller-codes/generate
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief Generate unique reseller codes (admin only)
 * @param {NextRequest} request - Request with JSON body containing generation parameters
 * @returns {Promise<NextResponse>} JSON response with generated codes
 * 
 * @example
 * POST /api/admin/reseller-codes/generate
 * Body: {
 *   "reseller_id": "uuid",
 *   "product_id": "uuid",
 *   "count": 100, // Number of codes to generate
 *   "prefix": "NNA", // Optional prefix for codes
 *   "length": 12 // Optional code length (default: 12)
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
    const { reseller_id, product_id, count, prefix, length } = body;

    if (!reseller_id || !product_id) {
      return NextResponse.json(
        { error: "reseller_id and product_id are required" },
        { status: 400 }
      );
    }

    const codeCount = parseInt(count);
    if (!codeCount || codeCount < 1 || codeCount > 10000) {
      return NextResponse.json(
        { error: "count must be between 1 and 10000" },
        { status: 400 }
      );
    }

    const codeLength = length ? parseInt(length) : 12;
    if (codeLength < 6 || codeLength > 32) {
      return NextResponse.json(
        { error: "length must be between 6 and 32" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique codes
    const generateCode = (): string => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude I, O, 0, 1 for clarity
      let code = prefix ? prefix.toUpperCase() : "";
      const remainingLength = codeLength - code.length;
      
      for (let i = 0; i < remainingLength; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      return code;
    };

    // Generate codes with collision checking
    const codes: string[] = [];
    const maxAttempts = codeCount * 10; // Allow up to 10x attempts to avoid infinite loops
    let attempts = 0;

    while (codes.length < codeCount && attempts < maxAttempts) {
      attempts++;
      const code = generateCode();
      
      // Check if code already exists in our generated list
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }

    if (codes.length < codeCount) {
      return NextResponse.json(
        { error: "Failed to generate enough unique codes. Please try again." },
        { status: 500 }
      );
    }

    // Check for existing codes in database
    const { data: existingCodes, error: checkError } = await adminSupabase
      .from("reseller_codes")
      .select("serial_code")
      .in("serial_code", codes);

    if (checkError) {
      console.error("[Generate Codes] Error checking existing codes:", checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // Filter out any codes that already exist
    const existingSet = new Set(
      (existingCodes || []).map((c) => c.serial_code)
    );
    const uniqueCodes = codes.filter((code) => !existingSet.has(code));

    if (uniqueCodes.length === 0) {
      return NextResponse.json(
        { error: "All generated codes already exist. Please try again." },
        { status: 400 }
      );
    }

    // If we lost some codes due to collisions, try to generate more
    if (uniqueCodes.length < codeCount) {
      const needed = codeCount - uniqueCodes.length;
      let additionalAttempts = 0;
      
      while (uniqueCodes.length < codeCount && additionalAttempts < needed * 10) {
        additionalAttempts++;
        const code = generateCode();
        
        if (!uniqueCodes.includes(code) && !existingSet.has(code)) {
          uniqueCodes.push(code);
        }
      }
    }

    // Insert codes
    const codesToInsert = uniqueCodes.map((code) => ({
      reseller_id,
      product_id,
      serial_code: code,
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
      console.error("[Generate Codes] Error inserting codes:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      codes: insertedCodes,
      count: insertedCodes?.length || 0,
      requested: codeCount,
      generated: uniqueCodes.length,
    });
  } catch (error: any) {
    console.error("[Generate Codes] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
