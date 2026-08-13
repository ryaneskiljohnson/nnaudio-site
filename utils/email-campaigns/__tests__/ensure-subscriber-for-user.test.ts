import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();
const update = vi.fn();
const insert = vi.fn();

vi.mock("@/utils/supabase/service", () => ({
  createSupabaseServiceRole: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        ilike: () => ({
          maybeSingle,
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        update(payload);
        return {
          eq: vi.fn(async () => ({ error: null })),
        };
      },
      insert,
    }),
  })),
}));

import { ensureSubscriberForUser } from "@/utils/email-campaigns/ensure-subscriber-for-user";

beforeEach(() => {
  maybeSingle.mockReset();
  update.mockReset();
  insert.mockReset();
  insert.mockResolvedValue({ error: null });
});

describe("ensureSubscriberForUser", () => {
  it("refuses to rebind a subscriber owned by a different user", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "sub-1",
        user_id: "other-user",
        status: "active",
        tags: [],
        metadata: {},
      },
      error: null,
    });

    const result = await ensureSubscriberForUser({
      userId: "new-user",
      email: "a@b.com",
      source: "signup",
    });

    expect(result).toBe("Subscriber already linked to a different user");
    expect(update).not.toHaveBeenCalled();
  });

  it("does not reactivate an unsubscribed row", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "sub-1",
        user_id: "u1",
        status: "unsubscribed",
        tags: [],
        metadata: {},
      },
      error: null,
    });

    const result = await ensureSubscriberForUser({
      userId: "u1",
      email: "a@b.com",
      source: "signup",
    });

    expect(result).toBeNull();
    expect(update).toHaveBeenCalled();
    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.status).toBeUndefined();
  });
});
