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

    // Get user email
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { hasNfr: false, hasElite: false, error: "Email not found" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS and check user_management table
    const serviceSupabase = await createSupabaseServiceRole();
    
    // Normalize email for comparison (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`[NFR Status] Checking for email: "${email}" (normalized: "${normalizedEmail}")`);
    
    // Try exact match first
    let { data, error } = await (serviceSupabase as any)
      .from("user_management")
      .select("pro, notes, user_email")
      .eq("user_email", normalizedEmail)
      .maybeSingle();

    // If no exact match, try case-insensitive search
    if (!data && (error?.code === "PGRST116" || !error)) {
      const { data: caseInsensitiveData, error: caseInsensitiveError } = await (serviceSupabase as any)
        .from("user_management")
        .select("pro, notes, user_email")
        .ilike("user_email", `%${normalizedEmail}%`)
        .maybeSingle();
      
      if (caseInsensitiveData) {
        data = caseInsensitiveData;
        error = null;
        console.log(`[NFR Status] Found case-insensitive match: "${caseInsensitiveData.user_email}"`);
      } else if (caseInsensitiveError && caseInsensitiveError.code !== "PGRST116") {
        console.error("[NFR Status] Case-insensitive search error:", caseInsensitiveError);
      }
    }

    // If still no match, try with original email (in case it's stored with different casing)
    if (!data) {
      const { data: originalEmailData, error: originalEmailError } = await (serviceSupabase as any)
        .from("user_management")
        .select("pro, notes, user_email")
        .eq("user_email", email.trim())
        .maybeSingle();
      
      if (originalEmailData) {
        data = originalEmailData;
        error = null;
        console.log(`[NFR Status] Found exact match with original email: "${originalEmailData.user_email}"`);
      }
    }

    if (error && error.code !== "PGRST116") {
      console.error("[NFR Status] Error checking user_management:", error, "for email:", normalizedEmail);
      return NextResponse.json({ hasNfr: false, hasElite: false, error: error.message });
    }

    if (!data) {
      console.log(`[NFR Status] No record found for email: ${normalizedEmail}`);
      return NextResponse.json({ hasNfr: false, hasElite: false, error: null });
    }

    // Check notes field for "elite" (case-insensitive)
    const notes = data?.notes?.toLowerCase() || "";
    const hasEliteAccess = notes.includes("elite");

    console.log(`[NFR Status] Found record for ${data.user_email}:`, { 
      hasPro: data?.pro, 
      hasElite: hasEliteAccess, 
      notes: data?.notes 
    });
    
    return NextResponse.json({
      hasNfr: data?.pro ?? false,
      hasElite: hasEliteAccess,
      notes: data?.notes ?? null,
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
