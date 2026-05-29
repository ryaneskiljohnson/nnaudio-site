/**
 * @fileoverview Tests for email-based purchase linking utility.
 * @module utils/stripe/__tests__/link-purchases-to-user.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStripeCustomersList = vi.fn();
const mockStripeCustomersRetrieve = vi.fn();
const mockStripeCustomersUpdate = vi.fn();
const mockStripePaymentIntentsList = vi.fn();
const mockStripePaymentIntentsUpdate = vi.fn();

vi.mock("@/utils/stripe/client", () => ({
  stripe: {
    customers: {
      list: (...args: unknown[]) => mockStripeCustomersList(...args),
      retrieve: (...args: unknown[]) => mockStripeCustomersRetrieve(...args),
      update: (...args: unknown[]) => mockStripeCustomersUpdate(...args),
    },
    paymentIntents: {
      list: (...args: unknown[]) => mockStripePaymentIntentsList(...args),
      update: (...args: unknown[]) => mockStripePaymentIntentsUpdate(...args),
    },
  },
}));

const mockProfileSelect = vi.fn();
const mockProfileUpdate = vi.fn();
const mockGrantsUpdate = vi.fn();
const mockFollowupsUpdate = vi.fn();

vi.mock("@/utils/supabase/service", () => ({
  createSupabaseServiceRole: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockProfileSelect,
            }),
          }),
          update: (payload: unknown) => ({
            eq: () => mockProfileUpdate(payload),
          }),
        };
      }
      if (table === "product_grants") {
        return {
          update: (payload: unknown) => ({
            is: () => ({
              ilike: () => ({
                select: mockGrantsUpdate.bind(null, payload),
              }),
            }),
          }),
        };
      }
      if (table === "review_followups") {
        return {
          update: (payload: unknown) => ({
            is: () => ({
              ilike: () => ({
                select: mockFollowupsUpdate.bind(null, payload),
              }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

vi.mock("@/lib/product-cache", () => ({
  invalidateUserProductCache: vi.fn(),
}));

import {
  linkPurchasesToUserByEmail,
  normalizePurchaseEmail,
} from "../link-purchases-to-user";
import { invalidateUserProductCache } from "@/lib/product-cache";

describe("normalizePurchaseEmail", () => {
  it("lowercases and trims email", () => {
    expect(normalizePurchaseEmail("  Buyer@Example.COM ")).toBe("buyer@example.com");
  });
});

describe("linkPurchasesToUserByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileSelect.mockResolvedValue({ data: { customer_id: null } });
    mockProfileUpdate.mockResolvedValue({ error: null });
    mockGrantsUpdate.mockResolvedValue({ data: [{ id: "g1" }] });
    mockFollowupsUpdate.mockResolvedValue({ data: [] });
    mockStripeCustomersUpdate.mockResolvedValue({});
    mockStripePaymentIntentsList.mockResolvedValue({ data: [] });
    mockStripePaymentIntentsUpdate.mockResolvedValue({});
  });

  it("returns linked false when email is empty", async () => {
    const result = await linkPurchasesToUserByEmail({
      userId: "user-1",
      email: "   ",
    });
    expect(result.linked).toBe(false);
    expect(mockStripeCustomersList).not.toHaveBeenCalled();
  });

  it("sets profiles.customer_id and updates customer metadata", async () => {
    mockStripeCustomersList.mockResolvedValue({
      data: [{ id: "cus_abc", email: "buyer@example.com" }],
    });
    mockStripeCustomersRetrieve.mockResolvedValue({
      id: "cus_abc",
      email: "buyer@example.com",
      deleted: false,
      metadata: {},
    });

    const result = await linkPurchasesToUserByEmail({
      userId: "user-1",
      email: "buyer@example.com",
      preferredCustomerId: "cus_abc",
    });

    expect(result.linked).toBe(true);
    expect(result.canonicalCustomerId).toBe("cus_abc");
    expect(mockProfileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cus_abc" })
    );
    expect(mockStripeCustomersUpdate).toHaveBeenCalledWith(
      "cus_abc",
      expect.objectContaining({
        metadata: expect.objectContaining({ user_id: "user-1" }),
      })
    );
    expect(invalidateUserProductCache).toHaveBeenCalledWith("user-1");
  });

  it("backfills anonymous payment intent metadata", async () => {
    mockStripeCustomersList.mockResolvedValue({
      data: [{ id: "cus_abc", email: "buyer@example.com" }],
    });
    mockStripeCustomersRetrieve.mockResolvedValue({
      id: "cus_abc",
      email: "buyer@example.com",
      deleted: false,
      metadata: {},
    });
    mockStripePaymentIntentsList.mockResolvedValue({
      data: [
        {
          id: "pi_1",
          status: "succeeded",
          metadata: { user_id: "anonymous" },
        },
      ],
    });

    const result = await linkPurchasesToUserByEmail({
      userId: "user-1",
      email: "buyer@example.com",
      preferredCustomerId: "cus_abc",
    });

    expect(result.paymentIntentsUpdated).toBe(1);
    expect(mockStripePaymentIntentsUpdate).toHaveBeenCalledWith("pi_1", {
      metadata: expect.objectContaining({ user_id: "user-1" }),
    });
  });

  it("ignores stripe customers whose email does not exactly match", async () => {
    mockStripeCustomersList.mockResolvedValue({
      data: [{ id: "cus_other", email: "other@example.com" }],
    });

    const result = await linkPurchasesToUserByEmail({
      userId: "user-1",
      email: "buyer@example.com",
    });

    expect(result.linked).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });
});
