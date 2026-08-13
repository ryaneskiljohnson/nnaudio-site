import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const update = vi.fn();

vi.mock("@/utils/supabase/service", () => ({
  createSupabaseServiceRole: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: "sub-1", email: "a@b.com", status: "active" }, error: null }),
        }),
      }),
      update,
    }),
  })),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  })),
}));

import { POST } from "../route";

describe("POST /api/unsubscribe", () => {
  beforeEach(() => {
    update.mockReset();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  });

  it("does not mutate when no token is provided", async () => {
    const request = new NextRequest("http://localhost/api/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", action: "unsubscribe" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("does not mutate when the token is invalid", async () => {
    const request = new NextRequest("http://localhost/api/unsubscribe", {
      method: "POST",
      body: JSON.stringify({
        email: "a@b.com",
        action: "unsubscribe",
        token: "garbage",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
  });
});
