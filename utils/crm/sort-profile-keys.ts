/**
 * @fileoverview In-memory CRM profile sort used when SQL pagination cannot see Stripe or session data.
 * @module utils/crm/sort-profile-keys
 */

/**
 * @brief Profile columns needed to sort a full CRM result set, then page.
 */
export type CrmProfileSortKey = {
  id: string;
  customer_id: string | null;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  subscription: string | null;
};

/**
 * @brief Extra maps attached after the key list is loaded.
 */
export type CrmProfileSortExtras = {
  spentCentsByUserId?: Record<string, number>;
  spentCentsByCustomerId?: Record<string, number>;
  orderCountByUserId?: Record<string, number>;
  lastActiveByUserId?: Record<string, string>;
  ticketTotalByUserId?: Record<string, number>;
  productCountByUserId?: Record<string, number>;
};

/**
 * @brief Default direction when switching the CRM table to a new sort column.
 * @param sortField Frontend sort field.
 * @returns `desc` for spend, counts, and dates; `asc` for names and email.
 */
export function defaultCrmSortDirection(
  sortField: string
): "asc" | "desc" {
  switch (sortField) {
    case "totalSpent":
    case "orderCount":
    case "productCount":
    case "supportTickets":
    case "lastActive":
    case "createdAt":
      return "desc";
    default:
      return "asc";
  }
}

/**
 * @brief Next CRM sort after a column header click.
 * @param currentField Column the table is already sorted by.
 * @param currentDirection Current direction for that column.
 * @param clickedField Column the admin clicked.
 * @returns Field and direction to send to the server (always resets to page 1).
 * @note Switching to Total Spent starts at highest first. Clicking it again flips.
 * @example
 * nextCrmSort("createdAt", "desc", "totalSpent");
 * // { field: "totalSpent", direction: "desc" }
 */
export function nextCrmSort(
  currentField: string,
  currentDirection: "asc" | "desc",
  clickedField: string
): { field: string; direction: "asc" | "desc" } {
  if (currentField === clickedField) {
    return {
      field: clickedField,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }
  return {
    field: clickedField,
    direction: defaultCrmSortDirection(clickedField),
  };
}

/**
 * @brief True when this CRM sort cannot be applied with a single SQL `order` + `range`.
 * @param sortField Frontend sort field.
 * @returns Whether the caller must load all matching keys first.
 */
export function isDerivedCrmSortField(sortField?: string): boolean {
  return (
    sortField === "totalSpent" ||
    sortField === "orderCount" ||
    sortField === "lastActive" ||
    sortField === "supportTickets" ||
    sortField === "productCount"
  );
}

/**
 * @brief Reads a comparable sort value for one profile key.
 * @param key Profile sort key.
 * @param sortField Frontend sort field.
 * @param extras Derived maps (spend, orders, sessions, tickets, products).
 * @returns Number, string, or null (nulls sort last).
 */
export function crmSortValue(
  key: CrmProfileSortKey,
  sortField: string | undefined,
  extras: CrmProfileSortExtras
): number | string | null {
  switch (sortField) {
    case "totalSpent": {
      const byUser = extras.spentCentsByUserId?.[key.id];
      if (byUser != null) return byUser;
      return key.customer_id
        ? (extras.spentCentsByCustomerId?.[key.customer_id] ?? 0)
        : 0;
    }
    case "orderCount":
      return extras.orderCountByUserId?.[key.id] ?? 0;
    case "lastActive":
      return (
        extras.lastActiveByUserId?.[key.id] ||
        key.created_at ||
        key.updated_at ||
        null
      );
    case "supportTickets":
      return extras.ticketTotalByUserId?.[key.id] ?? 0;
    case "productCount":
      return extras.productCountByUserId?.[key.id] ?? 0;
    case "email":
      return key.email?.trim().toLowerCase() || null;
    case "subscription":
      return key.subscription || null;
    case "createdAt":
      return key.created_at || key.updated_at || null;
    case "firstName":
      return nameSortValue(key.first_name, key.last_name);
    case "lastName":
      return nameSortValue(key.last_name, key.first_name);
    default:
      return key.created_at || key.updated_at || null;
  }
}

/**
 * @brief Builds a lowercase "primary secondary" name key, or null when both are empty.
 * @param primary First name field to consider.
 * @param secondary Tie-breaker name field.
 * @returns Combined name, or null.
 */
function nameSortValue(
  primary: string | null,
  secondary: string | null
): string | null {
  const first = primary?.trim().toLowerCase() ?? "";
  const second = secondary?.trim().toLowerCase() ?? "";
  if (!first && !second) {
    return null;
  }
  return `${first} ${second}`.trim();
}

/**
 * @brief Sorts CRM keys in place for full-set pagination.
 * @param keys Profile keys to sort.
 * @param sortField Frontend sort field.
 * @param sortDirection Ascending or descending.
 * @param extras Derived maps.
 * @returns The same array, sorted.
 * @example
 * sortCrmProfileKeys(keys, "totalSpent", "desc", { spentCentsByCustomerId });
 */
export function sortCrmProfileKeys(
  keys: CrmProfileSortKey[],
  sortField: string | undefined,
  sortDirection: "asc" | "desc" | undefined,
  extras: CrmProfileSortExtras
): CrmProfileSortKey[] {
  const ascending = sortDirection === "asc";
  return keys.sort((a, b) => {
    const aValue = crmSortValue(a, sortField, extras);
    const bValue = crmSortValue(b, sortField, extras);
    if (aValue == null && bValue == null) {
      return a.id.localeCompare(b.id);
    }
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    if (typeof aValue === "number" && typeof bValue === "number") {
      const spendCmp = ascending ? aValue - bValue : bValue - aValue;
      if (spendCmp !== 0) return spendCmp;
      if (sortField === "totalSpent") {
        const customerCmp = (a.customer_id ?? "").localeCompare(
          b.customer_id ?? ""
        );
        if (customerCmp !== 0) return customerCmp;
      }
      return a.id.localeCompare(b.id);
    }
    const aStr = String(aValue);
    const bStr = String(bValue);
    const cmp = aStr.localeCompare(bStr);
    if (cmp !== 0) {
      return ascending ? cmp : -cmp;
    }
    return a.id.localeCompare(b.id);
  });
}
