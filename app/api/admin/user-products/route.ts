/**
 * @fileoverview Admin API: return products owned by a user (grants + Stripe purchases).
 * Used by support tickets admin to show product list in a dialog.
 * @module api/admin/user-products
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import { getAccessibleProductIds } from "@/utils/nnaudio-access/access";

/**
 * GET /api/admin/user-products?user_id=...
 * Returns { count, products: [{ id, name, slug, featured_image_url }] } for the given user.
 * @param request - Next request; user_id query param required
 * @returns 200 JSON with count and products; 400 if user_id missing; 401 if not admin; 500 on error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = await createSupabaseServiceRole();
    const {
      data: { user },
    } = await serviceSupabase.auth.admin.getUserById(userId);
    const email = user?.email ?? null;

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("customer_id")
      .eq("id", userId)
      .single();

    const { productIds } = await getAccessibleProductIds(userId, {
      customer_id: profile?.customer_id ?? null,
      email,
    });

    const count = productIds.size;
    if (count === 0) {
      return NextResponse.json({ count: 0, products: [] });
    }

    const productIdsArray = Array.from(productIds);
    const { data: products, error: productsError } = await (serviceSupabase as any)
      .from("products")
      .select("id, name, slug, featured_image_url")
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError) {
      console.error("[user-products] Error fetching products:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: products?.length ?? 0,
      products: (products ?? []).map((p: { id: string; name: string; slug: string; featured_image_url?: string | null }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        featured_image_url: p.featured_image_url ?? null,
      })),
    });
  } catch (error) {
    console.error("[user-products] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to load user products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
