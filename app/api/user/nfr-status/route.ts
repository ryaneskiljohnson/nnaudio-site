/**
 * @fileoverview Returns NFR (user_management.pro) and elite (notes) for the authenticated user.
 * @module app/api/user/nfr-status
 *
 * @returns JSON `{ hasNfr, hasElite, error }` — never returns admin `notes`.
 * @status 200 Success
 * @status 401 Not authenticated
 * @status 400 No email on session
 * @status 500 Internal error
 */

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { hasNfr: false, hasElite: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { hasNfr: false, hasElite: false, error: "Email not found" },
        { status: 400 }
      );
    }

    const serviceSupabase = await createSupabaseServiceRole();
    const normalizedEmail = email.toLowerCase().trim();

    console.log(
      `[NFR Status] Checking for email: "${email}" (normalized: "${normalizedEmail}")`,
    );

    let { data, error } = await (serviceSupabase as any)
      .from("user_management")
      .select("pro, notes")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data && (error?.code === "PGRST116" || !error)) {
      const emailMatch = await (serviceSupabase as any)
        .from("user_management")
        .select("pro, notes")
        .eq("user_email", normalizedEmail)
        .maybeSingle();
      data = emailMatch.data;
      error = emailMatch.error;
    }

    if (error && error.code !== "PGRST116") {
      console.error(
        "[NFR Status] Error checking user_management:",
        error,
        "for email:",
        normalizedEmail,
      );
      return NextResponse.json({
        hasNfr: false,
        hasElite: false,
        error: error.message,
      });
    }

    if (!data) {
      console.log(`[NFR Status] No record found for email: ${normalizedEmail}`);
      return NextResponse.json({
        hasNfr: false,
        hasElite: false,
        error: null,
      });
    }

    const notes = data.notes?.toLowerCase() || "";
    const hasEliteAccess = notes.includes("elite");

    return NextResponse.json({
      hasNfr: data.pro ?? false,
      hasElite: hasEliteAccess,
      error: null,
    });
  } catch (error) {
    console.error("Error checking NFR status:", error);
    return NextResponse.json(
      { hasNfr: false, hasElite: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
