import { describe, it, expect, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/utils/auth/require-cron";

function makeRequest(authorization?: string, extra?: Record<string, string>): NextRequest {
  const headers = new Map<string, string>();
  if (authorization) headers.set("authorization", authorization);
  for (const [k, v] of Object.entries(extra ?? {})) {
    headers.set(k.toLowerCase(), v);
  }
  return {
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
  } as unknown as NextRequest;
}

describe("isAuthorizedCronRequest", () => {
  const original = process.env.CRON_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("fails closed when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(makeRequest("Bearer anything"))).toBe(false);
  });

  it("accepts the matching bearer secret", () => {
    process.env.CRON_SECRET = "super-secret";
    expect(isAuthorizedCronRequest(makeRequest("Bearer super-secret"))).toBe(true);
  });

  it("rejects a wrong bearer secret", () => {
    process.env.CRON_SECRET = "super-secret";
    expect(isAuthorizedCronRequest(makeRequest("Bearer other"))).toBe(false);
  });

  it("does not trust spoofable x-vercel-cron headers", () => {
    process.env.CRON_SECRET = "super-secret";
    expect(
      isAuthorizedCronRequest(
        makeRequest(undefined, { "x-vercel-cron": "1", "x-vercel-cron-signature": "x" })
      )
    ).toBe(false);
  });
});
