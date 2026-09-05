/**
 * @fileoverview Pure helpers for paging CRM users by Stripe spend rank.
 * @module utils/crm/total-spent-page
 */

/**
 * @brief Ranks Stripe customer ids by cached spend, then by customer id.
 * @param spentCentsByCustomerId Net paid cents keyed by Stripe customer id.
 * @param direction Ascending (lowest first) or descending (highest first).
 * @returns Customer ids in spend order. Missing / empty maps yield `[]`.
 * @note Ties are broken by customer id so paging stays stable across requests.
 * @example
 * customerIdsRankedBySpend({ cus_b: 500, cus_a: 2000 }, "desc");
 * // ["cus_a", "cus_b"]
 */
/**
 * @brief Ranks ids by a string metric, then by id.
 * @param values Metric keyed by id.
 * @param direction Ascending or descending.
 * @returns Ids in metric order.
 * @example
 * idsRankedByText({ u2: "2024-01-01", u1: "2025-01-01" }, "desc");
 * // ["u1", "u2"]
 */
export function idsRankedByText(
  values: Record<string, string> | undefined,
  direction: "asc" | "desc"
): string[] {
  return Object.entries(values ?? {})
    .sort((a, b) => {
      const cmp = a[1].localeCompare(b[1]);
      if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
      return a[0].localeCompare(b[0]);
    })
    .map(([id]) => id);
}

export function customerIdsRankedBySpend(
  spentCentsByCustomerId: Record<string, number> | undefined,
  direction: "asc" | "desc"
): string[] {
  return Object.entries(spentCentsByCustomerId ?? {})
    .sort((a, b) => {
      const spendCmp = direction === "asc" ? a[1] - b[1] : b[1] - a[1];
      if (spendCmp !== 0) return spendCmp;
      return a[0].localeCompare(b[0]);
    })
    .map(([customerId]) => customerId);
}

/**
 * @brief Slices a 1-based page from an already-ranked list.
 * @param ranked Items in sort order.
 * @param page 1-based page number.
 * @param limit Page size.
 * @returns The items for that page (empty when the page is past the end).
 * @example
 * sliceRankedPage(["a", "b", "c"], 2, 2); // ["c"]
 */
export function sliceRankedPage<T>(
  ranked: readonly T[],
  page: number,
  limit: number
): T[] {
  const safeLimit = Math.max(0, limit);
  const offset = Math.max(0, (page - 1) * safeLimit);
  return ranked.slice(offset, offset + safeLimit);
}

/**
 * @brief True when this spend page can be sliced from ranked spenders only.
 * @param matchedSpenderCount Profiles matched from the spend index so far.
 * @param page 1-based page number.
 * @param limit Page size.
 * @param payingOnly Paying-customers filter (no $0 rows).
 * @param direction Sort direction.
 * @returns Whether $0 profiles are not needed for this page.
 * @note Desc page 1 of all users only needs the top spenders. Asc of all
 * users needs $0 rows first, so this is false unless `payingOnly`.
 * @example
 * canPageFromSpendersOnly(10, 1, 10, false, "desc"); // true
 */
export function canPageFromSpendersOnly(
  matchedSpenderCount: number,
  page: number,
  limit: number,
  payingOnly: boolean,
  direction: "asc" | "desc"
): boolean {
  if (payingOnly) return true;
  if (direction === "asc") return false;
  return matchedSpenderCount >= Math.max(0, (page - 1) * limit) + limit;
}

/**
 * @brief Builds one Total Spent page from a complete spender list plus $0 rows.
 * @param spenderKeysInSpendOrder Every paying profile, already ranked.
 * @param zeroKeys Profiles with no spend (may include spenders; those are dropped).
 * @param page 1-based page number.
 * @param limit Page size.
 * @param direction Ascending or descending.
 * @returns The page of keys.
 * @note `spenderKeysInSpendOrder` must be the full spender list. A truncated
 * list would hide mid-tier spenders inside the "zero" bucket.
 * @example
 * resolveTotalSpentPage(
 *   [{ id: "high" }, { id: "low" }],
 *   [{ id: "free" }],
 *   1,
 *   2,
 *   "desc"
 * );
 * // [{ id: "high" }, { id: "low" }]
 */
export function resolveTotalSpentPage<T extends { id: string }>(
  spenderKeysInSpendOrder: readonly T[],
  zeroKeys: readonly T[],
  page: number,
  limit: number,
  direction: "asc" | "desc"
): T[] {
  const spenderIds = new Set(
    spenderKeysInSpendOrder.map((key) => key.id)
  );
  const uniqueZeros = zeroKeys.filter((key) => !spenderIds.has(key.id));
  const ranked =
    direction === "asc"
      ? [...uniqueZeros, ...spenderKeysInSpendOrder]
      : [...spenderKeysInSpendOrder, ...uniqueZeros];
  return sliceRankedPage(ranked, page, limit);
}

/**
 * @brief True when dollar amounts are in Total Spent sort order.
 * @param amounts Page of `totalSpent` dollars (skip `-1` loading sentinels).
 * @param direction Sort direction.
 * @returns Whether each finite amount is monotonic for that direction.
 * @example
 * spendAmountsAreSorted([200, 50, 0], "desc"); // true
 */
export function spendAmountsAreSorted(
  amounts: readonly number[],
  direction: "asc" | "desc"
): boolean {
  const loaded = amounts.filter((amount) => amount !== -1);
  for (let i = 1; i < loaded.length; i++) {
    if (direction === "desc" && loaded[i] > loaded[i - 1]) return false;
    if (direction === "asc" && loaded[i] < loaded[i - 1]) return false;
  }
  return true;
}
