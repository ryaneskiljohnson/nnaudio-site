import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  })),
}));

vi.mock("@/utils/supabase/service", () => ({
  createSupabaseServiceRole: vi.fn(async () => {
    throw new Error("service role must not be used before admin check");
  }),
}));

import { GET } from "../list-buckets/route";

describe("GET /api/storage/list-buckets", () => {
  it("returns 401 for unauthenticated callers", async () => {
    const request = new NextRequest("http://localhost/api/storage/list-buckets");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
