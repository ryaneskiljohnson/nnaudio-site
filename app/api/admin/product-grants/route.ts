"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// GET - List all product grants (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: grants, error } = await adminSupabase
      .from("product_grants")
      .select(`
        *,
        products:product_id (
          id,
          name,
          slug,
          featured_image_url
        )
      `)
      .order("granted_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ grants: grants || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Grant a product to a user (admin only)
export async function POST(request: NextRequest) {
  try {
    console.log("[product-grants POST] Starting request...");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[product-grants POST] No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[product-grants POST] User authenticated:", user.id);

    // Check admin status
    const { data: adminData, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (adminError) {
      console.error("[product-grants POST] Admin check error:", adminError);
    }

    if (!adminData) {
      console.error("[product-grants POST] User is not an admin");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[product-grants POST] Admin verified");

    const body = await request.json();
    const { user_email, product_id, notes } = body;

    console.log("[product-grants POST] Request body:", { user_email, product_id, notes });

    if (!user_email || !product_id) {
      return NextResponse.json(
        { error: "user_email and product_id are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("[product-grants POST] Checking for existing grant...");

    // Check if grant already exists
    const { data: existing, error: existingError } = await adminSupabase
      .from("product_grants")
      .select("id")
      .eq("user_email", user_email.toLowerCase())
      .eq("product_id", product_id)
      .maybeSingle();

    if (existingError) {
      // Any error here likely means the table doesn't exist
      console.error("[product-grants POST] Error checking existing grant:", existingError);
      return NextResponse.json({ 
        error: `Database error: ${existingError.message}`,
        code: existingError.code,
        hint: existingError.hint || "The product_grants table may not exist. Please run the migration: supabase/migrations/20250122000001_create_product_grants_table.sql"
      }, { status: 500 });
    }

    if (existing) {
      console.log("[product-grants POST] Grant already exists");
      return NextResponse.json(
        { error: "Product already granted to this user" },
        { status: 400 }
      );
    }

    console.log("[product-grants POST] No existing grant found, creating new grant...");

    // Create grant
    const { data: grant, error } = await adminSupabase
      .from("product_grants")
      .insert({
        user_email: user_email.toLowerCase(),
        product_id,
        granted_by: user.id,
        notes: notes || null,
      })
      .select(`
        *,
        products:product_id (
          id,
          name,
          slug
        )
      `)
      .single();

    if (error) {
      console.error("[product-grants POST] Database error:", error);
      console.error("[product-grants POST] Error code:", error.code);
      console.error("[product-grants POST] Error details:", error.details);
      console.error("[product-grants POST] Error hint:", error.hint);
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ grant });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke a product grant (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get("id");

    if (!grantId) {
      return NextResponse.json(
        { error: "Grant ID is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminSupabase
      .from("product_grants")
      .delete()
      .eq("id", grantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

