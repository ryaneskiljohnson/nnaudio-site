import { describe, expect, it } from "vitest";
import { pickTrustedCheckoutIdentity } from "@/utils/stripe/trusted-checkout-identity";

describe("pickTrustedCheckoutIdentity", () => {
  it("ignores a guest-supplied Stripe customer id", () => {
    expect(
      pickTrustedCheckoutIdentity(null, {
        email: "guest@example.com",
        customerId: "cus_attacker",
      })
    ).toEqual({
      email: "guest@example.com",
      customerId: undefined,
    });
  });

  it("uses the session customer id, not the body customer id", () => {
    expect(
      pickTrustedCheckoutIdentity(
        {
          userId: "user-1",
          email: "owner@example.com",
          customerId: "cus_owner",
        },
        { email: "other@example.com", customerId: "cus_attacker" }
      )
    ).toEqual({
      userId: "user-1",
      email: "owner@example.com",
      customerId: "cus_owner",
    });
  });

  it("falls back to body email when the session has no email", () => {
    expect(
      pickTrustedCheckoutIdentity(
        { userId: "user-1", email: null, customerId: null },
        { email: "fallback@example.com", customerId: "cus_x" }
      )
    ).toEqual({
      userId: "user-1",
      email: "fallback@example.com",
      customerId: undefined,
    });
  });
});
