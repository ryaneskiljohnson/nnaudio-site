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
import { fetchActiveCatalogProducts } from "@/utils/crm/active-catalog-products";

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
      .select("customer_id, email")
      .eq("id", userId)
      .single();

    const { productIds } = await getAccessibleProductIds(userId, {
      customer_id: profile?.customer_id ?? null,
      email: profile?.email ?? email,
    });

    const products = await fetchActiveCatalogProducts(
      serviceSupabase,
      productIds
    );

    return NextResponse.json({
      count: products.length,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        featured_image_url: product.featured_image_url ?? null,
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
