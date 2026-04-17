/**
 * @fileoverview Admin-only: re-bind product_grants and user_management rows from an old email to a user.
 * @module app/api/admin/relink-email-grants
 *
 * POST JSON body:
 * - `old_email` (required): email string previously stored on grants / user_management
 * - `target_user_id` (required): Supabase auth user id to attach rows to
 *
 * @returns JSON `{ success: true, product_grants_updated, user_management_updated }` or error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { syncStripeCustomerEmailFromProfile } from "@/utils/stripe/sync-customer-email";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const oldEmailRaw = body?.old_email as string | undefined;
    const targetUserId = body?.target_user_id as string | undefined;

    if (!oldEmailRaw || !targetUserId) {
      return NextResponse.json(
        { error: "old_email and target_user_id are required" },
        { status: 400 }
      );
    }

    const oldEmail = oldEmailRaw.trim().toLowerCase();
    const adminAuth = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: targetUser, error: authErr } =
      await adminAuth.auth.admin.getUserById(targetUserId);

    if (authErr || !targetUser.user?.email) {
      return NextResponse.json(
        { error: "Target user not found in auth" },
        { status: 400 }
      );
    }

    const newEmail = targetUser.user.email.trim().toLowerCase();

    const serviceSupabase = await createSupabaseServiceRole();

    const { data: pgRows, error: pgSelErr } = await (serviceSupabase as any)
      .from("product_grants")
      .update({
        user_id: targetUserId,
        user_email: newEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("user_email", oldEmail)
      .select("id");

    if (pgSelErr) {
      console.error("[relink-email-grants] product_grants update:", pgSelErr);
      return NextResponse.json(
        { error: pgSelErr.message },
        { status: 500 }
      );
    }

    const { data: umRows, error: umErr } = await (serviceSupabase as any)
      .from("user_management")
      .update({
        user_id: targetUserId,
        user_email: newEmail,
      })
      .eq("user_email", oldEmail)
      .select("id");

    if (umErr) {
      console.error("[relink-email-grants] user_management update:", umErr);
      return NextResponse.json({ error: umErr.message }, { status: 500 });
    }

    await syncStripeCustomerEmailFromProfile(
      serviceSupabase,
      targetUserId,
      newEmail
    );

    return NextResponse.json({
      success: true,
      product_grants_updated: pgRows?.length ?? 0,
      user_management_updated: umRows?.length ?? 0,
      new_email: newEmail,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
