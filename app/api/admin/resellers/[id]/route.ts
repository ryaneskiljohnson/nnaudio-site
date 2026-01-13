/**
 * @fileoverview API routes for managing individual resellers (suspend, delete, update)
 * @module api/admin/resellers/[id]
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief Update reseller status (suspend, delete, or reactivate) (admin only)
 * @param {NextRequest} request - Request with JSON body containing action and optional data
 * @param {Object} params - Route params with reseller id
 * @returns {Promise<NextResponse>} JSON response with updated reseller
 * 
 * @example
 * PATCH /api/admin/resellers/[id]
 * Body: {
 *   "action": "suspend" | "delete" | "reactivate" | "update",
 *   "name": "Updated Name" (optional, for update),
 *   "email": "email@example.com" (optional, for update),
 *   "contact_info": "Info" (optional, for update),
 *   "notes": "Notes" (optional, for update)
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { action, name, email, contact_info, notes } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let updateData: any = {};

    if (action === "suspend") {
      updateData.status = "suspended";
    } else if (action === "delete") {
      updateData.status = "deleted";
    } else if (action === "reactivate") {
      updateData.status = "active";
    } else if (action === "update") {
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return NextResponse.json(
            { error: "Name must be a non-empty string" },
            { status: 400 }
          );
        }
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        updateData.email = email?.trim() || null;
      }
      if (contact_info !== undefined) {
        updateData.contact_info = contact_info?.trim() || null;
      }
      if (notes !== undefined) {
        updateData.notes = notes?.trim() || null;
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'suspend', 'delete', 'reactivate', or 'update'" },
        { status: 400 }
      );
    }

    const { data: reseller, error } = await adminSupabase
      .from("resellers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Resellers PATCH] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reseller) {
      return NextResponse.json(
        { error: "Reseller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reseller });
  } catch (error: any) {
    console.error("[Resellers PATCH] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @brief Delete a reseller (hard delete - use PATCH with action="delete" for soft delete)
 * @param {NextRequest} request - Request object
 * @param {Object} params - Route params with reseller id
 * @returns {Promise<NextResponse>} JSON response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if reseller has any redeemed codes
    const { data: redeemedCodes, error: codesError } = await adminSupabase
      .from("reseller_codes")
      .select("id")
      .eq("reseller_id", id)
      .not("redeemed_at", "is", null)
      .limit(1);

    if (codesError) {
      console.error("[Resellers DELETE] Error checking codes:", codesError);
      return NextResponse.json({ error: codesError.message }, { status: 500 });
    }

    // If there are redeemed codes, we should use soft delete instead
    if (redeemedCodes && redeemedCodes.length > 0) {
      // Use soft delete (mark as deleted) instead of hard delete
      const { data: reseller, error } = await adminSupabase
        .from("resellers")
        .update({ status: "deleted" })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Resellers DELETE] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        reseller,
        message: "Reseller marked as deleted (soft delete) to preserve redemption history",
      });
    }

    // If no redeemed codes, we can do a hard delete
    const { error } = await adminSupabase
      .from("resellers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Resellers DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Reseller deleted" });
  } catch (error: any) {
    console.error("[Resellers DELETE] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
