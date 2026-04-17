"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { resolveProfileUserIdByEmail } from "@/utils/supabase/resolve-profile-user-id";

export interface ProductGrant {
  id: string;
  user_email: string;
  user_id?: string | null;
  product_id: string;
  granted_at: string;
  granted_by: string | null;
  notes: string | null;
  amount?: number;
  products?: {
    id: string;
    name: string;
    slug: string;
    featured_image_url: string | null;
  };
}

/** Supabase client type (resolved from createClient Promise). */
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

// Helper to check if user is admin
async function checkAdmin(supabase: SupabaseClientType) {
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

    const { data: grants, error } = await (adminSupabase as any)
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
 * Get product grants for a list of user emails (admin only).
 * Use this instead of getProductGrants() when only NFR/user_management emails are needed,
 * to avoid loading 100k+ rows.
 * @param emails - Array of user emails (e.g. from user_management)
 * @returns Grants grouped by user_email; empty array emails return no grants
 */
export async function getProductGrantsForEmails(emails: string[]): Promise<{
  data: ProductGrant[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    if (!emails?.length) {
      return { data: [], error: null };
    }

    const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const adminSupabase = await createSupabaseServiceRole();

    const { data: profileRows } = await adminSupabase
      .from("profiles")
      .select("id")
      .in("email", normalized);

    const userIds = [
      ...new Set(
        (profileRows ?? [])
          .map((p: { id: string }) => p.id)
          .filter(Boolean)
      ),
    ];

    const byEmailPromise = (adminSupabase as any)
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
      .in("user_email", normalized)
      .order("granted_at", { ascending: false });

    const byUserIdPromise =
      userIds.length > 0
        ? (adminSupabase as any)
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
            .in("user_id", userIds)
            .order("granted_at", { ascending: false })
        : Promise.resolve({ data: [] as ProductGrant[] });

    const [emailResult, userIdResult] = await Promise.all([
      byEmailPromise,
      byUserIdPromise,
    ]);

    const error = emailResult.error ?? userIdResult.error;
    const mergedById = new Map<string, ProductGrant>();
    for (const row of [...(emailResult.data ?? []), ...(userIdResult.data ?? [])]) {
      if (row?.id) mergedById.set(row.id, row as ProductGrant);
    }
    const grants = Array.from(mergedById.values()).sort(
      (a, b) =>
        new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime()
    );

    if (error) {
      console.error("[Product Grants] Error fetching grants for emails:", error);
      return { data: null, error: error.message };
    }

    return { data: (grants ?? []) as ProductGrant[], error: null };
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
    const normalizedEmail = userEmail.toLowerCase();
    const resolvedUserId = await resolveProfileUserIdByEmail(
      adminSupabase,
      userEmail
    );

    const selectGrant = `
        *,
        products:product_id (
          id,
          name,
          slug,
          featured_image_url
        )
      `;

    const byEmailPromise = (adminSupabase as any)
      .from("product_grants")
      .select(selectGrant)
      .eq("user_email", normalizedEmail)
      .order("granted_at", { ascending: false });

    const byUserIdPromise = resolvedUserId
      ? (adminSupabase as any)
          .from("product_grants")
          .select(selectGrant)
          .eq("user_id", resolvedUserId)
          .order("granted_at", { ascending: false })
      : Promise.resolve({ data: [] as ProductGrant[], error: null });

    const [emailResult, userIdResult] = await Promise.all([
      byEmailPromise,
      byUserIdPromise,
    ]);

    const error = emailResult.error ?? userIdResult.error;
    if (error) {
      console.error("[Product Grants] Error fetching user grants:", error);
      return { data: null, error: error.message };
    }

    const mergedById = new Map<string, ProductGrant>();
    for (const row of [
      ...(emailResult.data ?? []),
      ...(userIdResult.data ?? []),
    ]) {
      if (row?.id) mergedById.set(row.id, row as ProductGrant);
    }
    const grants = Array.from(mergedById.values()).sort(
      (a, b) =>
        new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime()
    );

    return { data: grants as ProductGrant[], error: null };
  } catch (error: any) {
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: error.message || "Internal server error" };
  }
}

/**
 * Grant a product to a user (admin only)
 * @param amount Recorded transaction amount for historical record (default 0)
 */
export async function grantProduct(
  userEmail: string,
  productId: string,
  notes?: string | null,
  amount?: number
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
    const normalizedEmail = userEmail.toLowerCase();
    const resolvedUserId = await resolveProfileUserIdByEmail(
      adminSupabase,
      userEmail
    );

    // Check if grant already exists (by user_id or email + product)
    let existing: { id: string } | null = null;
    if (resolvedUserId) {
      const { data: byUid } = await (adminSupabase as any)
        .from("product_grants")
        .select("id")
        .eq("user_id", resolvedUserId)
        .eq("product_id", productId)
        .maybeSingle();
      existing = byUid ?? null;
    }
    if (!existing) {
      const { data: byEmail, error: existingError } = await (adminSupabase as any)
        .from("product_grants")
        .select("id")
        .eq("user_email", normalizedEmail)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingError && existingError.code !== "PGRST116") {
        console.error("[Product Grants] Error checking existing grant:", existingError);
        return { data: null, error: existingError.message };
      }
      existing = byEmail ?? null;
    }

    if (existing) {
      return { data: null, error: "Product already granted to this user" };
    }

    // Create grant
    const { data: grant, error } = await (adminSupabase as any)
      .from("product_grants")
      .insert({
        user_email: normalizedEmail,
        user_id: resolvedUserId,
        product_id: productId,
        granted_by: user.id,
        notes: notes || null,
        amount: amount ?? 0,
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

    const { error } = await (adminSupabase as any)
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

