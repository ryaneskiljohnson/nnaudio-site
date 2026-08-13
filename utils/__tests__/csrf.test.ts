import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { validateCsrfToken, CSRF_COOKIE_NAME } from "@/utils/csrf";

/**
 * Minimal NextRequest stub with the header/cookie surface validateCsrfToken uses.
 */
function makeRequest(opts: {
  headers?: Record<string, string>;
  cookieToken?: string;
}): NextRequest {
  const headers = new Map(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    cookies: {
      get: (name: string) =>
        name === CSRF_COOKIE_NAME && opts.cookieToken
          ? { value: opts.cookieToken }
          : undefined,
    },
  } as unknown as NextRequest;
}

describe("validateCsrfToken", () => {
  it("accepts a matching cookie + body token", () => {
    const req = makeRequest({ cookieToken: "tok123" });
    expect(validateCsrfToken(req, "tok123")).toBe(true);
  });

  it("rejects a mismatched token", () => {
    const req = makeRequest({ cookieToken: "tok123" });
    expect(validateCsrfToken(req, "different")).toBe(false);
  });

  it("rejects when a token is sent but no cookie exists", () => {
    const req = makeRequest({});
    expect(validateCsrfToken(req, "tok123")).toBe(false);
  });

  it("REQUIRES a token for browser requests (Origin / Sec-Fetch-Site present)", () => {
    const withOrigin = makeRequest({ headers: { origin: "https://nnaud.io" } });
    expect(validateCsrfToken(withOrigin, undefined)).toBe(false);

    const withSecFetch = makeRequest({ headers: { "sec-fetch-site": "same-origin" } });
    expect(validateCsrfToken(withSecFetch, "")).toBe(false);
  });

  it("allows a missing token for genuine native-app requests", () => {
    // No browser signals at all.
    const noSignals = makeRequest({});
    expect(validateCsrfToken(noSignals, undefined)).toBe(true);

    // Explicit native-app UA even if a browser-ish header sneaks in.
    const nativeUa = makeRequest({
      headers: { "user-agent": "cymasphere:1.0", origin: "https://nnaud.io" },
    });
    expect(validateCsrfToken(nativeUa, undefined)).toBe(true);

    // Explicit app header.
    const appHeader = makeRequest({ headers: { "x-nnaudio-app": "1" } });
    expect(validateCsrfToken(appHeader, undefined)).toBe(true);
  });
});
