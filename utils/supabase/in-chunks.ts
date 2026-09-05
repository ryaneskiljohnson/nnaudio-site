/**
 * @fileoverview Splits identifier lists so PostgREST `.in()` filters stay under URI limits.
 * @module utils/supabase/in-chunks
 */

/** Safe `.in()` list size for PostgREST GET URLs. */
export const SUPABASE_IN_CHUNK_SIZE = 100;
/** Safe `.range()` page size (PostgREST default max rows). */
export const SUPABASE_RANGE_PAGE_SIZE = 1000;

/**
 * @brief Splits a list into fixed-size chunks.
 * @param items Values to split.
 * @param size Maximum items per chunk.
 * @returns Consecutive chunks; empty input yields an empty array.
 * @example
 * chunkIds(["a", "b", "c"], 2); // [["a", "b"], ["c"]]
 */
export function chunkIds<T>(
  items: readonly T[],
  size: number = SUPABASE_IN_CHUNK_SIZE
): T[][] {
  const chunkSize = size > 0 ? size : SUPABASE_IN_CHUNK_SIZE;
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * @brief Loads every row from a ranged PostgREST query until a short page.
 * @param loadPage Fetches `from`..`to` inclusive (0-based).
 * @returns Concatenated rows in page order.
 * @note Caller must `.order()` the query so pages do not skip or duplicate.
 * @example
 * await fetchAllRangedRows((from, to) =>
 *   supabase.from("support_tickets").select("user_id").in("user_id", ids).order("id").range(from, to)
 * );
 */
export async function fetchAllRangedRows<T>(
  loadPage: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message?: string; code?: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += SUPABASE_RANGE_PAGE_SIZE) {
    const to = from + SUPABASE_RANGE_PAGE_SIZE - 1;
    const { data, error } = await loadPage(from, to);
    if (error) {
      const rangedError = new Error(
        error.message || "Failed to fetch ranged rows"
      );
      (rangedError as Error & { code?: string }).code = (
        error as { code?: string }
      ).code;
      throw rangedError;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < SUPABASE_RANGE_PAGE_SIZE) break;
  }
  return rows;
}
