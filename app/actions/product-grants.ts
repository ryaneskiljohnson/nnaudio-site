/**
 * @fileoverview Admin server actions for `product_grants` (list, grant, revoke).
 * @module app/actions/product-grants
 */

"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { escapeIlikeExactPattern } from "@/utils/supabase/ilike-escape";
import { normalizeEmailForGrantLookup } from "@/utils/supabase/email-grant-normalize";
import { resolveProfileUserIdByEmail } from "@/utils/supabase/resolve-profile-user-id";
import { stripe } from "@/utils/stripe/client";

/** Descriptor for batch grant loads (admin NFR / profile modal). */
export type ProductGrantUserDescriptor = {
  userId?: string | null;
  email?: string | null;
};

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
 * @brief Associate a normalized email with a descriptor user id for orphan-grant hydration.
 * @param map Email (lower) → set of auth user ids that claim that address.
 * @param email Raw email string.
 * @param userId Supabase auth user id.
 */
function addEmailForDescriptorUser(
  map: Map<string, Set<string>>,
  email: string,
  userId: string
): void {
  const e = normalizeEmailForGrantLookup(email);
  if (!e) return;
  let set = map.get(e);
  if (!set) {
    set = new Set<string>();
    map.set(e, set);
  }
  set.add(userId);
}

/**
 * @brief Collects emails that may appear on legacy `product_grants` rows (merge audit, auth, Stripe).
 * @param adminSupabase Service-role client.
 * @param userId Auth user id from NFR / user_management.
 * @returns Normalized unique emails.
 */
async function collectAssociatedEmailsForUserId(
  adminSupabase: ServiceRoleClient,
  userId: string
): Promise<string[]> {
  const out = new Set<string>();

  const { data: umRows } = await adminSupabase
    .from("user_management")
    .select("id, user_email")
    .eq("user_id", userId);

  const umIds = (umRows ?? []).map((r) => r.id).filter(Boolean);
  for (const row of umRows ?? []) {
    const e = normalizeEmailForGrantLookup(row.user_email ?? "");
    if (e) out.add(e);
  }

  const { data: auditByUserId } = await adminSupabase
    .from("user_management_merge_audit")
    .select("user_email")
    .eq("user_id", userId);

  for (const row of auditByUserId ?? []) {
    const e = normalizeEmailForGrantLookup(row.user_email ?? "");
    if (e) out.add(e);
  }

  if (umIds.length > 0) {
    const { data: auditByKept } = await adminSupabase
      .from("user_management_merge_audit")
      .select("user_email")
      .in("kept_id", umIds);

    for (const row of auditByKept ?? []) {
      const e = normalizeEmailForGrantLookup(row.user_email ?? "");
      if (e) out.add(e);
    }
  }

  const { data: authData, error: authErr } =
    await adminSupabase.auth.admin.getUserById(userId);
  if (!authErr && authData.user) {
    const u = authData.user;
    if (u.email?.trim()) out.add(normalizeEmailForGrantLookup(u.email));
    for (const id of u.identities ?? []) {
      const raw = id.identity_data;
      if (raw && typeof raw === "object" && "email" in raw) {
        const e = (raw as { email?: unknown }).email;
        if (typeof e === "string" && e.trim()) {
          out.add(normalizeEmailForGrantLookup(e));
        }
      }
    }
  }

  const { data: profileRow } = await adminSupabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (profileRow?.email?.trim()) {
    out.add(normalizeEmailForGrantLookup(profileRow.email));
  }

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const search = await stripe.customers.search({
        query: `metadata['user_id']:'${userId}'`,
        limit: 100,
      });
      for (const c of search.data) {
        if (c.email?.trim()) out.add(normalizeEmailForGrantLookup(c.email));
      }
    } catch {
      // Search API unavailable or misconfigured
    }

    try {
      const { data: profC } = await adminSupabase
        .from("profiles")
        .select("customer_id")
        .eq("id", userId)
        .maybeSingle();
      const cid = profC?.customer_id;
      if (cid) {
        const customer = await stripe.customers.retrieve(cid);
        if (
          !("deleted" in customer && customer.deleted) &&
          "email" in customer &&
          customer.email?.trim()
        ) {
          out.add(normalizeEmailForGrantLookup(customer.email));
        }
      }
    } catch {
      // ignore
    }
  }

  return [...out];
}

/**
 * @brief Load grants by `user_id` and by `user_email` (including legacy rows with wrong or null `user_id`).
 * @param adminSupabase Service-role client.
 * @param users Pairs of optional auth user id and optional email (both may be set).
 * @returns Merged deduped grants sorted by `granted_at` desc, or error message.
 */
async function fetchProductGrantsForUserDescriptors(
  adminSupabase: ServiceRoleClient,
  users: ProductGrantUserDescriptor[]
): Promise<{ data: ProductGrant[]; error: string | null }> {
  const userIdSet = new Set<string>();
  const emailSet = new Set<string>();
  /** Maps normalized grant email → auth user ids that should receive those orphan rows in the admin UI. */
  const emailToDescriptorUserIds = new Map<string, Set<string>>();

  for (const u of users) {
    const uid = u.userId?.trim();
    if (uid) userIdSet.add(uid);
    const em = normalizeEmailForGrantLookup(u.email ?? "");
    if (em) {
      emailSet.add(em);
      if (uid) addEmailForDescriptorUser(emailToDescriptorUserIds, em, uid);
    }
  }

  if (userIdSet.size > 0) {
    const uids = [...userIdSet];
    const extraLists = await Promise.all(
      uids.map((uid) => collectAssociatedEmailsForUserId(adminSupabase, uid))
    );
    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      const list = extraLists[i];
      for (const e of list) {
        emailSet.add(e);
        addEmailForDescriptorUser(emailToDescriptorUserIds, e, uid);
      }
    }
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
    /** Match by `user_email` even when `user_id` is set (stale wrong id would otherwise be invisible). */
    const emailMatchResults = await Promise.all(
      emailList.map((email) => {
        const pattern = escapeIlikeExactPattern(email);
        return (adminSupabase as SupabaseClient)
          .from("product_grants")
          .select(GRANT_SELECT_WITH_PRODUCTS)
          .ilike("user_email", pattern)
          .order("granted_at", { ascending: false });
      })
    );

    for (const r of emailMatchResults) {
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

  for (const g of grants) {
    const ge = normalizeEmailForGrantLookup(g.user_email ?? "");
    if (!ge) continue;
    const candidates = emailToDescriptorUserIds.get(ge);
    if (candidates?.size !== 1) continue;
    const [only] = [...candidates];
    const gid = g.user_id?.trim();
    if (!gid) {
      g.user_id = only;
    } else if (gid !== only) {
      g.user_id = only;
    }
  }

  return { data: grants, error: null };
}

/**
 * @brief Get product grants for many users (admin only). Prefers `user_id`; includes orphan rows by email.
 * @param users Each entry may include `userId` and/or `email` (normalized internally).
 */
export async function getProductGrantsForUsers(
  users: ProductGrantUserDescriptor[]
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

