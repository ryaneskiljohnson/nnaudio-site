import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/stripe/client", () => ({
  stripe: {
    paymentIntents: {
      retrieve: vi.fn(async () => ({
        amount: 4900,
        amount_received: 4900,
        currency: "usd",
        customer: "cus_LEAKME",
        metadata: {},
      })),
    },
    invoices: {
      search: vi.fn(async () => ({ data: [] })),
    },
    checkout: {
      sessions: {
        retrieve: vi.fn(async () => ({
          mode: "payment",
          amount_total: 4900,
          currency: "usd",
          customer: "cus_LEAKME",
          metadata: { plan_type: "lifetime" },
        })),
      },
    },
  },
}));

import { GET } from "../route";

describe("GET /api/checkout-session-details", () => {
  it("does not return Stripe customerId", async () => {
    const request = new NextRequest(
      "http://localhost/api/checkout-session-details?session_id=cs_test_a1B2c3D4e5F6g7H8"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.customerId).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("cus_LEAKME");
  });

  it("rejects an invalid session id without calling Stripe", async () => {
    const request = new NextRequest(
      "http://localhost/api/checkout-session-details?session_id=not-a-stripe-id"
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
