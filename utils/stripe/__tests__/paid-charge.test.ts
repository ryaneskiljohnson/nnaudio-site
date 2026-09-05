/**
 * @fileoverview Tests for paid-charge helpers used by CRM paying-customer filter.
 * @module utils/stripe/__tests__/paid-charge.test
 */

import { describe, expect, it } from "vitest";
import {
  emailFromStripeCharge,
  isPaidStripeCharge,
  stripeCustomerIdFromCharge,
} from "@/utils/stripe/paid-charge";

describe("isPaidStripeCharge", () => {
  it("accepts a paid, unrefunded charge", () => {
    expect(
      isPaidStripeCharge({
        paid: true,
        refunded: false,
        amount: 1995,
        amount_refunded: 0,
      })
    ).toBe(true);
  });

  it("rejects unpaid, fully refunded, or zero-net charges", () => {
    expect(
      isPaidStripeCharge({ paid: false, refunded: false, amount: 1995 })
    ).toBe(false);
    expect(
      isPaidStripeCharge({ paid: true, refunded: true, amount: 1995 })
    ).toBe(false);
    expect(
      isPaidStripeCharge({
        paid: true,
        refunded: false,
        amount: 1995,
        amount_refunded: 1995,
      })
    ).toBe(false);
  });
});

describe("stripeCustomerIdFromCharge", () => {
  it("reads string and expanded customer ids", () => {
    expect(stripeCustomerIdFromCharge({ customer: "cus_abc" })).toBe("cus_abc");
    expect(stripeCustomerIdFromCharge({ customer: { id: "cus_xyz" } })).toBe(
      "cus_xyz"
    );
    expect(stripeCustomerIdFromCharge({ customer: null })).toBeNull();
  });
});

describe("emailFromStripeCharge", () => {
  it("prefers receipt email and lowercases it", () => {
    expect(
      emailFromStripeCharge({
        receipt_email: "A@X.com",
        billing_details: { email: "b@x.com" },
      })
    ).toBe("a@x.com");
  });

  it("falls back to billing email", () => {
    expect(
      emailFromStripeCharge({ billing_details: { email: "B@X.com" } })
    ).toBe("b@x.com");
  });
});
