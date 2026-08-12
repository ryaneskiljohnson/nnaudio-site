/**
 * @fileoverview Tests for GET /auth/callback PKCE code exchange.
 * @module app/auth/callback/__tests__/route.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockExchangeCodeForSession = vi.fn();
const cookiesSet: Array<{ name: string; value: string }> = [];

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: {
        cookies: {
          setAll: (
            cookies: Array<{ name: string; value: string; options?: object }>
          ) => void;
        };
      }
    ) => {
      options.cookies.setAll([
        { name: "sb-test-auth-token", value: "session", options: { path: "/" } },
      ]);
      return {
        auth: {
          exchangeCodeForSession: (...args: unknown[]) =>
            mockExchangeCodeForSession(...args),
        },
      };
    }
  ),
}));

import { GET } from "../route";

function callbackRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/auth/callback${query}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    cookiesSet.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("redirects to reset-password with invalid_link when code is missing", async () => {
    const response = await GET(callbackRequest("?next=/reset-password"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password?error=invalid_link"
    );
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges the code and redirects to next on success", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(
      callbackRequest("?code=abc&next=/reset-password")
    );
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password"
    );
  });

  it("rejects an open-redirect next param", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(
      callbackRequest("?code=abc&next=https://evil.example")
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password"
    );
  });

  it("redirects to invalid_link when the code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid code" },
    });
    const response = await GET(callbackRequest("?code=dead"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password?error=invalid_link"
    );
  });
});
