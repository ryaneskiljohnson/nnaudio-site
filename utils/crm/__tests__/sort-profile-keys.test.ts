/**
 * @fileoverview Tests for full-set CRM profile sorting.
 * @module utils/crm/__tests__/sort-profile-keys.test
 */

import { describe, expect, it } from "vitest";
import {
  defaultCrmSortDirection,
  isDerivedCrmSortField,
  nextCrmSort,
  sortCrmProfileKeys,
  type CrmProfileSortKey,
} from "@/utils/crm/sort-profile-keys";

function key(
  id: string,
  overrides: Partial<CrmProfileSortKey> = {}
): CrmProfileSortKey {
  return {
    id,
    customer_id: null,
    email: null,
    created_at: null,
    updated_at: null,
    first_name: null,
    last_name: null,
    subscription: null,
    ...overrides,
  };
}

describe("defaultCrmSortDirection", () => {
  it("starts Total Spent and dates at highest / newest first", () => {
    expect(defaultCrmSortDirection("totalSpent")).toBe("desc");
    expect(defaultCrmSortDirection("createdAt")).toBe("desc");
    expect(defaultCrmSortDirection("email")).toBe("asc");
  });
});

describe("nextCrmSort", () => {
  it("starts Total Spent at highest first when leaving another column", () => {
    expect(nextCrmSort("createdAt", "desc", "totalSpent")).toEqual({
      field: "totalSpent",
      direction: "desc",
    });
  });

  it("flips Total Spent on the second click and back on the third", () => {
    const second = nextCrmSort("totalSpent", "desc", "totalSpent");
    expect(second).toEqual({ field: "totalSpent", direction: "asc" });
    expect(nextCrmSort(second.field, second.direction, "totalSpent")).toEqual({
      field: "totalSpent",
      direction: "desc",
    });
  });
});

describe("isDerivedCrmSortField", () => {
  it("flags fields that cannot be SQL-ordered before pagination", () => {
    expect(isDerivedCrmSortField("totalSpent")).toBe(true);
    expect(isDerivedCrmSortField("productCount")).toBe(true);
    expect(isDerivedCrmSortField("email")).toBe(false);
  });
});

describe("sortCrmProfileKeys", () => {
  it("ranks email-attributed spend above a stale customer_id of $0", () => {
    const keys = [
      key("linked-zero", { customer_id: "cus_stale" }),
      key("whale", { customer_id: "cus_stale", email: "whale@x.com" }),
    ];
    sortCrmProfileKeys(keys, "totalSpent", "desc", {
      spentCentsByUserId: { whale: 106227 },
      spentCentsByCustomerId: {},
    });
    expect(keys.map((row) => row.id)).toEqual(["whale", "linked-zero"]);
  });

  it("sorts spend descending and keeps zero-spend users last in desc", () => {
    const keys = [
      key("free"),
      key("paid-low", { customer_id: "cus_low" }),
      key("paid-high", { customer_id: "cus_high" }),
    ];
    sortCrmProfileKeys(keys, "totalSpent", "desc", {
      spentCentsByCustomerId: { cus_low: 500, cus_high: 2000 },
    });
    expect(keys.map((row) => row.id)).toEqual(["paid-high", "paid-low", "free"]);
  });

  it("treats a missing Total Spent direction as highest first", () => {
    const keys = [
      key("paid-low", { customer_id: "cus_low" }),
      key("paid-high", { customer_id: "cus_high" }),
    ];
    sortCrmProfileKeys(keys, "totalSpent", undefined, {
      spentCentsByCustomerId: { cus_low: 500, cus_high: 2000 },
    });
    expect(keys.map((row) => row.id)).toEqual(["paid-high", "paid-low"]);
  });

  it("breaks equal spend by customer id so pages do not shuffle", () => {
    const keys = [
      key("b", { customer_id: "cus_b" }),
      key("a", { customer_id: "cus_a" }),
    ];
    sortCrmProfileKeys(keys, "totalSpent", "desc", {
      spentCentsByCustomerId: { cus_a: 1000, cus_b: 1000 },
    });
    expect(keys.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("sorts spend ascending with $0 users first", () => {
    const keys = [
      key("paid-high", { customer_id: "cus_high" }),
      key("free"),
      key("paid-low", { customer_id: "cus_low" }),
    ];
    sortCrmProfileKeys(keys, "totalSpent", "asc", {
      spentCentsByCustomerId: { cus_low: 500, cus_high: 2000 },
    });
    expect(keys.map((row) => row.id)).toEqual(["free", "paid-low", "paid-high"]);
  });

  it("sorts last active with created_at fallback and nulls last", () => {
    const keys = [
      key("old", { created_at: "2020-01-01T00:00:00.000Z" }),
      key("new", { created_at: "2024-01-01T00:00:00.000Z" }),
      key("session"),
    ];
    sortCrmProfileKeys(keys, "lastActive", "desc", {
      lastActiveByUserId: { session: "2025-01-01T00:00:00.000Z" },
    });
    expect(keys.map((row) => row.id)).toEqual(["session", "new", "old"]);
  });

  it("puts empty names last when sorting by first name", () => {
    const keys = [
      key("anon"),
      key("zoe", { first_name: "Zoe" }),
      key("amy", { first_name: "Amy" }),
    ];
    sortCrmProfileKeys(keys, "firstName", "asc", {});
    expect(keys.map((row) => row.id)).toEqual(["amy", "zoe", "anon"]);
  });
});
