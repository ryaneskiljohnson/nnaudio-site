/**
 * @fileoverview Tests for stale-safe CRM row patches.
 * @module utils/crm/__tests__/merge-defined-user-fields.test
 */

import { describe, expect, it } from "vitest";
import { mergeDefinedUserFields } from "@/utils/crm/merge-defined-user-fields";

describe("mergeDefinedUserFields", () => {
  it("updates only requested users and only defined keys", () => {
    const users = [
      { id: "a", productCount: -1, totalSpent: 5 },
      { id: "b", productCount: 4, totalSpent: 10 },
    ];
    const next = mergeDefinedUserFields(users, new Set(["a"]), {
      a: { productCount: 2 },
    });
    expect(next).toEqual([
      { id: "a", productCount: 2, totalSpent: 5 },
      { id: "b", productCount: 4, totalSpent: 10 },
    ]);
  });

  it("does not zero users that are not in the request", () => {
    const users = [{ id: "page-2", productCount: 7 }];
    const next = mergeDefinedUserFields(users, new Set(["page-1"]), {
      "page-1": { productCount: 1 },
    });
    expect(next).toEqual([{ id: "page-2", productCount: 7 }]);
  });
});
