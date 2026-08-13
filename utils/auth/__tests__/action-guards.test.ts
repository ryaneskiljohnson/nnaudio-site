import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
    }),
  })),
}));

import { requireAdmin, requireAdminResponse } from "@/utils/auth/require-admin";
import {
  requireSessionUserId,
  requireAdminAction,
  requireSelfOrAdmin,
} from "@/utils/auth/action-guards";

beforeEach(() => {
  getUser.mockReset();
  maybeSingle.mockReset();
});

describe("requireAdmin", () => {
  it("returns 401 when there is no session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when the user is not in admins", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns ok for an admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    maybeSingle.mockResolvedValue({ data: { id: "admin-row" }, error: null });
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe("u1");
    expect(await requireAdminResponse()).toBeNull();
  });
});

describe("action-guards", () => {
  it("requireSessionUserId throws when unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireSessionUserId()).rejects.toThrow("Unauthorized");
  });

  it("requireAdminAction throws for non-admins", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireAdminAction()).rejects.toThrow("Forbidden");
  });

  it("requireSelfOrAdmin allows the owner", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await expect(requireSelfOrAdmin("u1")).resolves.toBeUndefined();
  });

  it("requireSelfOrAdmin forbids a different non-admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireSelfOrAdmin("u2")).rejects.toThrow("Forbidden");
  });
});
