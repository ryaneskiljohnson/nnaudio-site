/**
 * @fileoverview Facebook ads campaigns POST must reject unauthenticated callers.
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { code: "PGRST116" } }),
        }),
      }),
    }),
  })),
}));

import { POST } from "../campaigns/route";

describe("POST /api/facebook-ads/campaigns (unauthenticated)", () => {
  it("returns 401 when there is no session", async () => {
    const request = new NextRequest("http://localhost/api/facebook-ads/campaigns", {
      method: "POST",
      body: JSON.stringify({ name: "Attack", objective: "OUTCOME_TRAFFIC" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
