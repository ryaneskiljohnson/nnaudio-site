/**
 * @fileoverview Tests for CRM total-spent ranking and paging.
 * @module utils/crm/__tests__/total-spent-page.test
 */

import { describe, expect, it } from "vitest";
import {
  canPageFromSpendersOnly,
  customerIdsRankedBySpend,
  idsRankedByText,
  resolveTotalSpentPage,
  sliceRankedPage,
  spendAmountsAreSorted,
} from "@/utils/crm/total-spent-page";

describe("idsRankedByText", () => {
  it("ranks ISO timestamps newest first for desc", () => {
    expect(
      idsRankedByText(
        { u2: "2024-01-01T00:00:00.000Z", u1: "2025-06-01T00:00:00.000Z" },
        "desc"
      )
    ).toEqual(["u1", "u2"]);
  });

  it("breaks ties by id", () => {
    expect(
      idsRankedByText({ u_b: "2025-01-01", u_a: "2025-01-01" }, "desc")
    ).toEqual(["u_a", "u_b"]);
  });
});

describe("customerIdsRankedBySpend", () => {
  it("puts the highest spender first for desc (CRM default)", () => {
    expect(
      customerIdsRankedBySpend(
        { cus_low: 500, cus_high: 2000, cus_mid: 900 },
        "desc"
      )
    ).toEqual(["cus_high", "cus_mid", "cus_low"]);
  });

  it("puts the lowest spender first for asc", () => {
    expect(
      customerIdsRankedBySpend({ cus_low: 500, cus_high: 2000 }, "asc")
    ).toEqual(["cus_low", "cus_high"]);
  });

  it("breaks spend ties by customer id so pages stay stable", () => {
    expect(
      customerIdsRankedBySpend({ cus_b: 1000, cus_a: 1000 }, "desc")
    ).toEqual(["cus_a", "cus_b"]);
  });

  it("returns an empty list when the spend index is empty", () => {
    expect(customerIdsRankedBySpend({}, "desc")).toEqual([]);
    expect(customerIdsRankedBySpend(undefined, "desc")).toEqual([]);
  });
});

describe("sliceRankedPage", () => {
  it("returns the first page of top spenders", () => {
    expect(sliceRankedPage(["high", "mid", "low", "zero"], 1, 2)).toEqual([
      "high",
      "mid",
    ]);
  });

  it("returns the next page without overlapping the first", () => {
    const ranked = ["a", "b", "c", "d", "e"];
    expect(sliceRankedPage(ranked, 1, 2)).toEqual(["a", "b"]);
    expect(sliceRankedPage(ranked, 2, 2)).toEqual(["c", "d"]);
    expect(sliceRankedPage(ranked, 3, 2)).toEqual(["e"]);
  });

  it("returns an empty list past the last ranked row", () => {
    expect(sliceRankedPage(["high"], 3, 10)).toEqual([]);
  });
});

describe("canPageFromSpendersOnly", () => {
  it("lets desc page 1 skip $0 users when enough spenders exist", () => {
    expect(canPageFromSpendersOnly(10, 1, 10, false, "desc")).toBe(true);
    expect(canPageFromSpendersOnly(9, 1, 10, false, "desc")).toBe(false);
  });

  it("requires a full scan for asc of all users ($0 rows come first)", () => {
    expect(canPageFromSpendersOnly(100, 1, 10, false, "asc")).toBe(false);
  });

  it("never needs $0 users when the paying filter is on", () => {
    expect(canPageFromSpendersOnly(3, 1, 10, true, "asc")).toBe(true);
    expect(canPageFromSpendersOnly(3, 1, 10, true, "desc")).toBe(true);
  });
});

describe("resolveTotalSpentPage", () => {
  const spenders = [{ id: "high" }, { id: "mid" }, { id: "low" }];
  const zeros = [{ id: "free-a" }, { id: "free-b" }, { id: "high" }];

  it("desc page 1 is the top spenders, not $0 users", () => {
    expect(
      resolveTotalSpentPage(spenders, zeros, 1, 2, "desc").map((row) => row.id)
    ).toEqual(["high", "mid"]);
  });

  it("desc later pages continue spenders then $0 users, without duplicates", () => {
    expect(
      resolveTotalSpentPage(spenders, zeros, 2, 2, "desc").map((row) => row.id)
    ).toEqual(["low", "free-a"]);
    expect(
      resolveTotalSpentPage(spenders, zeros, 3, 2, "desc").map((row) => row.id)
    ).toEqual(["free-b"]);
  });

  it("asc page 1 is $0 users, then the lowest spenders", () => {
    expect(
      resolveTotalSpentPage(spenders, zeros, 1, 3, "asc").map((row) => row.id)
    ).toEqual(["free-a", "free-b", "high"]);
  });
});

describe("spendAmountsAreSorted", () => {
  it("accepts a desc CRM page and rejects a shuffled one", () => {
    expect(spendAmountsAreSorted([249, 99, 19.95, 0], "desc")).toBe(true);
    expect(spendAmountsAreSorted([19.95, 249, 0], "desc")).toBe(false);
  });

  it("ignores loading sentinels", () => {
    expect(spendAmountsAreSorted([-1, 80, 20], "desc")).toBe(true);
  });
});
