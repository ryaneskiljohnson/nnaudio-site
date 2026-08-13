import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAllowedFetchUrl,
  getFileSizeFromUrl,
} from "@/utils/product-downloads";

describe("isAllowedFetchUrl / product-download SSRF", () => {
  const originalFetch = globalThis.fetch;
  const originalSite = process.env.NEXT_PUBLIC_SITE_URL;
  const originalSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nnaud.io";
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://xyzcompany.supabase.co";
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSite;
    if (originalSupabase === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabase;
  });

  it("rejects metadata IPs, http, and unknown hosts", () => {
    expect(isAllowedFetchUrl("http://169.254.169.254/latest/meta-data")).toBe(
      false
    );
    expect(isAllowedFetchUrl("https://169.254.169.254/latest/meta-data")).toBe(
      false
    );
    expect(isAllowedFetchUrl("https://evil.example/file.zip")).toBe(false);
  });

  it("allows the site host and supabase.co", () => {
    expect(isAllowedFetchUrl("https://nnaud.io/file.zip")).toBe(true);
    expect(
      isAllowedFetchUrl("https://xyzcompany.supabase.co/storage/v1/object/x")
    ).toBe(true);
  });

  it("does not issue a HEAD for a blocked URL", async () => {
    const size = await getFileSizeFromUrl("http://127.0.0.1:1/secret");
    expect(size).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
