/**
 * @fileoverview Tests for attributing Stripe spend to CRM profiles.
 * @module utils/crm/__tests__/attribute-spend.test
 */

import { describe, expect, it } from "vitest";
import {
  attributeSpendToUsers,
  pickSpendProfile,
} from "@/utils/crm/attribute-spend";

describe("attributeSpendToUsers", () => {
  it("uses customer_id when the profile is linked", () => {
    const result = attributeSpendToUsers(
      { cus_1: 2000 },
      { cus_1: 2 },
      { cus_1: "a@x.com" },
      [{ id: "u1", customer_id: "cus_1", email: "a@x.com" }]
    );
    expect(result.spentCentsByUserId).toEqual({ u1: 2000 });
    expect(result.orderCountByUserId).toEqual({ u1: 2 });
  });

  it("falls back to email when customer_id is missing on the profile", () => {
    const result = attributeSpendToUsers(
      { cus_whale: 106227 },
      { cus_whale: 4 },
      { cus_whale: "whale@x.com" },
      [{ id: "u-whale", customer_id: "cus_stale", email: "whale@x.com" }]
    );
    expect(result.spentCentsByUserId).toEqual({ "u-whale": 106227 });
  });

  it("does not also email-match a customer that already has a profile", () => {
    const result = attributeSpendToUsers(
      { cus_1: 500 },
      { cus_1: 1 },
      { cus_1: "shared@x.com" },
      [
        { id: "linked", customer_id: "cus_1", email: "other@x.com" },
        { id: "same-email", customer_id: null, email: "shared@x.com" },
      ]
    );
    expect(result.spentCentsByUserId).toEqual({ linked: 500 });
  });

  it("attributes a shared email to only one profile", () => {
    const result = attributeSpendToUsers(
      { cus_1: 900 },
      { cus_1: 1 },
      { cus_1: "shared@x.com" },
      [
        {
          id: "newer",
          customer_id: null,
          email: "shared@x.com",
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "older",
          customer_id: null,
          email: "shared@x.com",
          created_at: "2020-01-01T00:00:00.000Z",
        },
      ]
    );
    expect(result.spentCentsByUserId).toEqual({ older: 900 });
  });

  it("sums two Stripe customers onto one profile via email", () => {
    const result = attributeSpendToUsers(
      { cus_a: 1000, cus_b: 250 },
      { cus_a: 1, cus_b: 1 },
      { cus_a: "a@x.com", cus_b: "a@x.com" },
      [{ id: "u1", customer_id: null, email: "a@x.com" }]
    );
    expect(result.spentCentsByUserId).toEqual({ u1: 1250 });
    expect(result.orderCountByUserId).toEqual({ u1: 2 });
  });
});

describe("pickSpendProfile", () => {
  it("prefers a linked customer_id over an email-only duplicate", () => {
    const winner = pickSpendProfile([
      { id: "email-only", customer_id: null, email: "a@x.com" },
      { id: "linked", customer_id: "cus_1", email: "a@x.com" },
    ]);
    expect(winner.id).toBe("linked");
  });
});
