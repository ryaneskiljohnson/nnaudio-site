/**
 * @fileoverview Applies async CRM row patches only to the users that request still owns.
 * @module utils/crm/merge-defined-user-fields
 */

/**
 * @brief Merges defined fields onto users that are still on the requested page.
 * @param users Current table rows.
 * @param requestedIds User ids that the in-flight request loaded.
 * @param fieldsByUserId Partial fields keyed by user id. Missing keys are left unchanged.
 * @returns New array; users not in `requestedIds` are unchanged.
 * @note Does not write `0` for absent keys — that would wipe a newer page.
 * @example
 * mergeDefinedUserFields(
 *   [{ id: "a", productCount: -1 }, { id: "b", productCount: 3 }],
 *   new Set(["a"]),
 *   { a: { productCount: 2 } }
 * );
 */
export function mergeDefinedUserFields<T extends { id: string }>(
  users: T[],
  requestedIds: ReadonlySet<string>,
  fieldsByUserId: Record<string, Partial<T>>
): T[] {
  return users.map((user) => {
    if (!requestedIds.has(user.id)) {
      return user;
    }
    const fields = fieldsByUserId[user.id];
    if (!fields) {
      return user;
    }
    return { ...user, ...fields };
  });
}
