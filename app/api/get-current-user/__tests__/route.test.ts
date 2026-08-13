import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "u1", email: "a@b.com" } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "u1",
                  first_name: "A",
                  last_name: "B",
                  full_name: "A B",
                  username: null,
                  website: null,
                  avatar_url: null,
                  subscription: "monthly",
                  subscription_expiration: null,
                  subscription_source: "stripe",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "admins") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "admin-secret-row", notes: "internal" },
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

import { GET } from "../route";

describe("GET /api/get-current-user", () => {
  it("returns isAdmin but never the admin row", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.isAdmin).toBe(true);
    expect(data.user.adminRecord).toBeUndefined();
    expect(data.user.profile.customer_id).toBeUndefined();
    expect(data.user.email).toBe("a@b.com");
  });
});
