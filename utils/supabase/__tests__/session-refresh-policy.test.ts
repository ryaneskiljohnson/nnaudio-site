/**
 * @fileoverview Unit tests for homepage session-refresh skip policy.
 * @module utils/supabase/__tests__/session-refresh-policy.test
 */

import { describe, expect, it } from "vitest";
import {
  hasSupabaseAuthCookie,
  shouldSkipHomepageSessionRefresh,
} from "@/utils/supabase/session-refresh-policy";

describe("hasSupabaseAuthCookie", () => {
  it("detects Supabase SSR auth token cookies", () => {
    expect(hasSupabaseAuthCookie(["sb-xyz-auth-token"])).toBe(true);
    expect(hasSupabaseAuthCookie(["sb-test-auth-token.0"])).toBe(true);
  });

  it("ignores unrelated cookies", () => {
    expect(hasSupabaseAuthCookie(["attribution", "cart"])).toBe(false);
    expect(hasSupabaseAuthCookie(["sb-xyz-api-key"])).toBe(false);
  });
});

describe("shouldSkipHomepageSessionRefresh", () => {
  it("skips only anonymous visitors on /", () => {
    expect(shouldSkipHomepageSessionRefresh("/", [])).toBe(true);
    expect(
      shouldSkipHomepageSessionRefresh("/", ["sb-xyz-auth-token"])
    ).toBe(false);
    expect(shouldSkipHomepageSessionRefresh("/plugins", [])).toBe(false);
    expect(
      shouldSkipHomepageSessionRefresh("/plugins", ["sb-xyz-auth-token"])
    ).toBe(false);
  });
});
