/**
 * @fileoverview Maps Stripe customer spend onto CRM profile ids.
 * @module utils/crm/attribute-spend
 */

/**
 * @brief Profile fields needed to attach Stripe spend to a user.
 */
export type SpendProfileMatch = {
  id: string;
  customer_id: string | null;
  email: string | null;
  created_at?: string | null;
};

/**
 * @brief Picks one profile when several match the same Stripe customer.
 * @param profiles Candidate profiles (must be non-empty).
 * @returns The linked profile if any, else the oldest id.
 * @example
 * pickSpendProfile([
 *   { id: "b", customer_id: null, email: "a@x.com", created_at: "2024-01-01" },
 *   { id: "a", customer_id: "cus_1", email: "a@x.com", created_at: "2025-01-01" },
 * ]);
 * // profile "a"
 */
export function pickSpendProfile(
  profiles: readonly SpendProfileMatch[]
): SpendProfileMatch {
  return [...profiles].sort((a, b) => {
    const aLinked = a.customer_id ? 0 : 1;
    const bLinked = b.customer_id ? 0 : 1;
    if (aLinked !== bLinked) return aLinked - bLinked;
    const created = (a.created_at ?? "").localeCompare(b.created_at ?? "");
    if (created !== 0) return created;
    return a.id.localeCompare(b.id);
  })[0];
}

/**
 * @brief Attributes paid cents and order counts to profile ids.
 * @param spentCentsByCustomerId Net paid cents keyed by Stripe customer id.
 * @param orderCountByCustomerId Paid charge counts keyed by Stripe customer id.
 * @param emailByCustomerId Lowercased emails for customers (from the charge or Stripe).
 * @param profiles Profiles that match those customers by id or email.
 * @returns Per-user spend and order counts.
 * @note `customer_id` wins. Email is used only when that customer has no profile.
 * @example
 * attributeSpendToUsers(
 *   { cus_1: 2000 },
 *   { cus_1: 1 },
 *   { cus_1: "a@x.com" },
 *   [{ id: "u1", customer_id: null, email: "a@x.com" }]
 * );
 * // { spentCentsByUserId: { u1: 2000 }, orderCountByUserId: { u1: 1 } }
 */
export function attributeSpendToUsers(
  spentCentsByCustomerId: Record<string, number>,
  orderCountByCustomerId: Record<string, number>,
  emailByCustomerId: Record<string, string>,
  profiles: readonly SpendProfileMatch[]
): {
  spentCentsByUserId: Record<string, number>;
  orderCountByUserId: Record<string, number>;
} {
  const byCustomer = new Map<string, SpendProfileMatch[]>();
  const byEmail = new Map<string, SpendProfileMatch[]>();
  for (const profile of profiles) {
    if (profile.customer_id) {
      const list = byCustomer.get(profile.customer_id) ?? [];
      list.push(profile);
      byCustomer.set(profile.customer_id, list);
    }
    const email = profile.email?.toLowerCase().trim();
    if (email) {
      const list = byEmail.get(email) ?? [];
      list.push(profile);
      byEmail.set(email, list);
    }
  }

  const spentCentsByUserId: Record<string, number> = {};
  const orderCountByUserId: Record<string, number> = {};

  const add = (userId: string, customerId: string) => {
    spentCentsByUserId[userId] =
      (spentCentsByUserId[userId] ?? 0) +
      (spentCentsByCustomerId[customerId] ?? 0);
    orderCountByUserId[userId] =
      (orderCountByUserId[userId] ?? 0) +
      (orderCountByCustomerId[customerId] ?? 0);
  };

  for (const customerId of Object.keys(spentCentsByCustomerId)) {
    const direct = byCustomer.get(customerId);
    if (direct?.length) {
      add(pickSpendProfile(direct).id, customerId);
      continue;
    }
    const email = emailByCustomerId[customerId];
    const viaEmail = email ? byEmail.get(email) : undefined;
    if (!viaEmail?.length) continue;
    add(pickSpendProfile(viaEmail).id, customerId);
  }

  return { spentCentsByUserId, orderCountByUserId };
}
