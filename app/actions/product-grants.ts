/**
 * @fileoverview Admin server actions for `product_grants` (list, grant, revoke).
 * @module app/actions/product-grants
 */

"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { escapeIlikeExactPattern } from "@/utils/supabase/ilike-escape";
import { resolveProfileUserIdByEmail } from "@/utils/supabase/resolve-profile-user-id";

/** Embedded product row for admin grant lists. */
const GRANT_SELECT_WITH_PRODUCTS = `
  *,
  products:product_id (
    id,
    name,
    slug,
    featured_image_url
  )
`;

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
/** Service-role client for admin grant queries. */
type ServiceRoleClient = Awaited<ReturnType<typeof createSupabaseServiceRole>>;

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

    const { data: grants, error } = await (adminSupabase as SupabaseClient)
      .from("product_grants")
      .select(GRANT_SELECT_WITH_PRODUCTS)
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
 * @brief Load grants by `user_id` (primary) plus orphan rows (`user_id` null) matching emails case-insensitively.
 * @param adminSupabase Service-role client.
 * @param users Pairs of optional auth user id and optional email (both may be set).
 * @returns Merged deduped grants sorted by `granted_at` desc, or error message.
 */
async function fetchProductGrantsForUserDescriptors(
  adminSupabase: ServiceRoleClient,
  users: Array<{ userId?: string | null; email?: string | null }>
): Promise<{ data: ProductGrant[]; error: string | null }> {
  const userIdSet = new Set<string>();
  const emailSet = new Set<string>();
  for (const u of users) {
    const uid = u.userId?.trim();
    if (uid) userIdSet.add(uid);
    const em = u.email?.trim().toLowerCase();
    if (em) emailSet.add(em);
  }

  const mergedById = new Map<string, ProductGrant>();

  if (userIdSet.size > 0) {
    const { data, error } = await (adminSupabase as SupabaseClient)
      .from("product_grants")
      .select(GRANT_SELECT_WITH_PRODUCTS)
      .in("user_id", [...userIdSet])
      .order("granted_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }
    for (const row of data ?? []) {
      if (row && typeof row === "object" && "id" in row && row.id) {
        mergedById.set(String(row.id), row as ProductGrant);
      }
    }
  }

  const emailList = [...emailSet];
  if (emailList.length > 0) {
    const orphanResults = await Promise.all(
      emailList.map((email) => {
        const pattern = escapeIlikeExactPattern(email);
        return (adminSupabase as SupabaseClient)
          .from("product_grants")
          .select(GRANT_SELECT_WITH_PRODUCTS)
          .is("user_id", null)
          .ilike("user_email", pattern)
          .order("granted_at", { ascending: false });
      })
    );

    for (const r of orphanResults) {
      if (r.error) {
        return { data: [], error: r.error.message };
      }
      for (const row of r.data ?? []) {
        if (row && typeof row === "object" && "id" in row && row.id) {
          mergedById.set(String(row.id), row as ProductGrant);
        }
      }
    }
  }

  const grants = Array.from(mergedById.values()).sort(
    (a, b) =>
      new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime()
  );

  return { data: grants, error: null };
}

/**
 * @brief Get product grants for many users (admin only). Prefers `user_id`; includes orphan rows by email.
 * @param users Each entry may include `userId` and/or `email` (normalized internally).
 */
export async function getProductGrantsForUsers(
  users: Array<{ userId?: string | null; email?: string | null }>
): Promise<{
  data: ProductGrant[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    if (!users?.length) {
      return { data: [], error: null };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const result = await fetchProductGrantsForUserDescriptors(
      adminSupabase,
      users
    );

    if (result.error) {
      console.error("[Product Grants] Error fetching grants for users:", result.error);
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: message };
  }
}

/**
 * Get product grants for a list of user emails (admin only).
 * Use this instead of getProductGrants() when only NFR/user_management emails are needed,
 * to avoid loading 100k+ rows.
 * Resolves `profiles.id` per email (case-insensitive), then loads grants by user_id and orphan email.
 * @param emails - Array of user emails (e.g. from user_management)
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

    const normalized = [
      ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    ];
    const adminSupabase = await createSupabaseServiceRole();

    const users = await Promise.all(
      normalized.map(async (email) => ({
        email,
        userId: await resolveProfileUserIdByEmail(adminSupabase, email),
      }))
    );

    const result = await fetchProductGrantsForUserDescriptors(
      adminSupabase,
      users
    );

    if (result.error) {
      console.error("[Product Grants] Error fetching grants for emails:", result.error);
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: message };
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
    const normalizedEmail = userEmail.trim().toLowerCase();
    const resolvedUserId = await resolveProfileUserIdByEmail(
      adminSupabase,
      userEmail
    );

    const result = await fetchProductGrantsForUserDescriptors(adminSupabase, [
      { userId: resolvedUserId, email: normalizedEmail },
    ]);

    if (result.error) {
      console.error("[Product Grants] Error fetching user grants:", result.error);
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[Product Grants] Unexpected error:", error);
    return { data: null, error: message };
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

