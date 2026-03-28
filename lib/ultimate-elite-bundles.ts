/**
 * @fileoverview Canonical identifiers for the three ultimate (elite) subscription bundles
 * and helpers to detect product grants tied to those bundles.
 * @module lib/ultimate-elite-bundles
 */

/**
 * @brief Active storefront slugs for bundles that count as “ultimate / elite” for CRM and NFR UI.
 * @note Keep in sync with home page `eliteBundleSlugs` and bundle checkout.
 */
export const ULTIMATE_ELITE_BUNDLE_SLUGS = [
  "ultimate-bundle",
  "producers-arsenal",
  "beat-lab",
] as const;

export type UltimateEliteBundleSlug = (typeof ULTIMATE_ELITE_BUNDLE_SLUGS)[number];

/**
 * @brief Which normalized emails have at least one `product_grants` row for a product in those bundles.
 * @param serviceSupabase Supabase client with service role (or sufficient read access).
 * @param normalizedEmails Lowercased, trimmed emails to check (must match `product_grants.user_email` style).
 * @returns Set of normalized emails with an elite-bundle-catalog grant.
 */
export async function getNormalizedEmailsWithUltimateBundleProductGrants(
  serviceSupabase: any,
  normalizedEmails: string[],
): Promise<Set<string>> {
  const result = new Set<string>();
  const unique = [...new Set(normalizedEmails.filter(Boolean))];
  if (unique.length === 0) return result;

  const sb = serviceSupabase;

  const { data: bundleRows, error: bErr } = await sb
    .from("bundles")
    .select("id")
    .eq("status", "active")
    .in("slug", [...ULTIMATE_ELITE_BUNDLE_SLUGS]);

  if (bErr || !bundleRows?.length) return result;

  const bundleIds = (bundleRows as { id: string }[]).map((b) => b.id);
  const { data: bpRows, error: bpErr } = await sb
    .from("bundle_products")
    .select("product_id")
    .in("bundle_id", bundleIds);

  if (bpErr || !bpRows?.length) return result;

  const productIds = [
    ...new Set(
      (bpRows as { product_id: string }[]).map((r) => r.product_id),
    ),
  ];
  if (productIds.length === 0) return result;

  const { data: grants, error: gErr } = await sb
    .from("product_grants")
    .select("user_email")
    .in("user_email", unique)
    .in("product_id", productIds);

  if (gErr || !grants) return result;

  for (const g of grants as { user_email: string }[]) {
    result.add(g.user_email.toLowerCase().trim());
  }
  return result;
}
