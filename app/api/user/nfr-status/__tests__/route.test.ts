import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "u1", email: "a@b.com" } },
        error: null,
      }),
    },
  })),
}));

vi.mock("@/utils/supabase/service", () => ({
  createSupabaseServiceRole: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              pro: true,
              notes: "INTERNAL: elite NFR grant — do not leak",
            },
            error: null,
          }),
        }),
      }),
    }),
  })),
}));

import { GET } from "../route";

describe("GET /api/user/nfr-status", () => {
  it("returns flags without admin notes", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasNfr).toBe(true);
    expect(data.hasElite).toBe(true);
    expect(data.notes).toBeUndefined();
  });
});
