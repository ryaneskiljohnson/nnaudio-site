/**
 * @fileoverview Tests for GET /api/auth/confirm password-recovery redirects.
 * @module app/api/auth/confirm/__tests__/route.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const redirectMock = vi.fn((url: string): never => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  })),
}));

vi.mock("@/utils/stripe/link-purchases-to-user", () => ({
  linkPurchasesToUserByEmail: vi.fn(),
}));

import { GET } from "../route";

function confirmRequest(query: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/auth/confirm${query ? `?${query}` : ""}`
  );
}

async function redirectedTo(request: NextRequest): Promise<string> {
  try {
    await GET(request);
    throw new Error("expected redirect");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT:")) {
      return error.message.slice("NEXT_REDIRECT:".length);
    }
    throw error;
  }
}

describe("GET /api/auth/confirm recovery", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    mockVerifyOtp.mockReset();
    mockGetUser.mockReset();
  });

  it("redirects to reset-password after a successful recovery OTP", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const url = await redirectedTo(
      confirmRequest("token_hash=abc&type=recovery")
    );
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "abc",
    });
    expect(url).toBe("/reset-password");
  });

  it("redirects to reset-password after a successful invite OTP", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const url = await redirectedTo(
      confirmRequest("token_hash=abc&type=invite")
    );
    expect(url).toBe("/reset-password");
  });

  it("keeps a recovery session on reset-password when the link was already used", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "Token expired" } });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.com" } },
    });
    const url = await redirectedTo(
      confirmRequest("token_hash=abc&type=recovery")
    );
    expect(url).toBe("/reset-password");
  });

  it("sends a failed recovery with no session back to reset-password to request a new link", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "Token expired" } });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const url = await redirectedTo(
      confirmRequest("token_hash=abc&type=recovery")
    );
    expect(url).toBe("/reset-password?error=invalid_link");
  });

  it("still sends failed signup verification without a session to login", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "Token expired" } });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const url = await redirectedTo(
      confirmRequest("token_hash=abc&type=signup")
    );
    expect(url).toBe("/login?auth_error=verification_failed");
  });
});
