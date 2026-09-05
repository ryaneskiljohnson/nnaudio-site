/**
 * @fileoverview Wraps a thenable query builder so `async` functions can return it
 * without executing the request.
 * @module utils/crm/hold-query
 */

/**
 * @brief Holds a query builder in a plain object.
 * @param query Supabase (or other thenable) builder.
 * @returns `{ query }` so `await` does not unwrap the builder.
 * @note Returning a thenable from `async` is `Promise.resolve(thenable)`,
 *   which runs the query. Callers then see `{ data, error }` with no `.order()`.
 * @example
 * async function filters() {
 *   return holdQuery(supabase.from("profiles").select("id"));
 * }
 * const { query } = await filters();
 * await query.order("id");
 */
export function holdQuery<T>(query: T): { query: T } {
  return { query };
}
