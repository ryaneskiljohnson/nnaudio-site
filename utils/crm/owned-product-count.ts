/**
 * @fileoverview Active owned-product count used by the CRM table, sort, and products dialog.
 * @module utils/crm/owned-product-count
 */

import { getAccessibleProductIds } from "@/utils/nnaudio-access/access";
import { fetchActiveCatalogProducts } from "@/utils/crm/active-catalog-products";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

/**
 * @brief Counts active catalog products the user owns (grants + Stripe, bundles expanded).
 * @param userId Profile / auth user id.
 * @param profile Stripe customer id and email used for access lookup.
 * @returns Number of active owned products (same source as GET /api/admin/user-products).
 * @example
 * const count = await countActiveOwnedProducts(userId, { customer_id, email });
 */
export async function countActiveOwnedProducts(
  userId: string,
  profile: { customer_id?: string | null; email?: string | null }
): Promise<number> {
  if (!userId) return 0;
  if (!profile.customer_id && !profile.email) return 0;
  const supabase = await createSupabaseServiceRole();
  const { productIds } = await getAccessibleProductIds(userId, {
    customer_id: profile.customer_id ?? null,
    email: profile.email ?? null,
  });
  const active = await fetchActiveCatalogProducts(supabase, productIds);
  return active.length;
}
