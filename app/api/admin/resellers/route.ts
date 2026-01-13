/**
 * @fileoverview API routes for managing resellers
 * @module api/admin/resellers
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief Get all resellers (admin only)
 * @returns {Promise<NextResponse>} JSON response with resellers array
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

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: resellers, error } = await adminSupabase
      .from("resellers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Resellers GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resellers: resellers || [] });
  } catch (error: any) {
    console.error("[Resellers GET] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @brief Create a new reseller (admin only)
 * @param {NextRequest} request - Request object with JSON body containing reseller data
 * @returns {Promise<NextResponse>} JSON response with created reseller
 * 
 * @example
 * POST /api/admin/resellers
 * Body: {
 *   "name": "Reseller Name",
 *   "email": "reseller@example.com",
 *   "contact_info": "Additional info",
 *   "notes": "Optional notes"
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
    const { name, email, contact_info, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: reseller, error } = await adminSupabase
      .from("resellers")
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        contact_info: contact_info?.trim() || null,
        notes: notes?.trim() || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("[Resellers POST] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reseller });
  } catch (error: any) {
    console.error("[Resellers POST] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
