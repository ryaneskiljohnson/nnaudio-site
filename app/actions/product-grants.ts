"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

export interface ProductGrant {
  id: string;
  user_email: string;
  product_id: string;
  granted_at: string;
  granted_by: string | null;
  notes: string | null;
  products?: {
    id: string;
    name: string;
    slug: string;
    featured_image_url: string | null;
  };
}

// Helper to check if user is admin
async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: adminCheck, error: adminError } = await supabase
    .from("admins")
    .select("*")
    .eq("user", user.id)
    .single();

  return adminError?.code !== "PGRST116" && !!adminCheck;
}

/**
 * Get all product grants (admin only)
 */
export async function getProductGrants(): Promise<{
  data: ProductGrant[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();

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
      console.error("[Product Grants] Error fetching grants:", error);
      return { data: null, error: error.message };
    }

    return { data: grants as ProductGrant[], error: null };
  } catch (error: any) {
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: error.message || "Internal server error" };
  }
}

/**
 * Get product grants for a specific user (admin only)
 */
export async function getUserProductGrants(userEmail: string): Promise<{
  data: ProductGrant[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();

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
      .eq("user_email", userEmail.toLowerCase())
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[Product Grants] Error fetching user grants:", error);
      return { data: null, error: error.message };
    }

    return { data: grants as ProductGrant[], error: null };
  } catch (error: any) {
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: error.message || "Internal server error" };
  }
}

/**
 * Grant a product to a user (admin only)
 */
export async function grantProduct(
  userEmail: string,
  productId: string,
  notes?: string | null
): Promise<{
  data: ProductGrant | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "User not found" };
    }

    const adminSupabase = await createSupabaseServiceRole();

    // Check if grant already exists
    const { data: existing, error: existingError } = await adminSupabase
      .from("product_grants")
      .select("id")
      .eq("user_email", userEmail.toLowerCase())
      .eq("product_id", productId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("[Product Grants] Error checking existing grant:", existingError);
      return { data: null, error: existingError.message };
    }

    if (existing) {
      return { data: null, error: "Product already granted to this user" };
    }

    // Create grant
    const { data: grant, error } = await adminSupabase
      .from("product_grants")
      .insert({
        user_email: userEmail.toLowerCase(),
        product_id: productId,
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
      console.error("[Product Grants] Error creating grant:", error);
      return { data: null, error: error.message };
    }

    return { data: grant as ProductGrant, error: null };
  } catch (error: any) {
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: error.message || "Internal server error" };
  }
}

/**
 * Revoke a product grant (admin only)
 */
export async function revokeProductGrant(grantId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();

    const { error } = await adminSupabase
      .from("product_grants")
      .delete()
      .eq("id", grantId);

    if (error) {
      console.error("[Product Grants] Error revoking grant:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error("[Product Grants] Unexpected error:", error);
    return { success: false, error: error.message || "Internal server error" };
  }
}

