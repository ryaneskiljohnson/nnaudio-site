import { describe, it, expect } from "vitest";
import { isValidLocalRedirect, getSafeRedirectUrl } from "@/utils/redirectValidation";

describe("isValidLocalRedirect", () => {
  it("accepts simple local paths", () => {
    expect(isValidLocalRedirect("/dashboard")).toBe(true);
    expect(isValidLocalRedirect("/reset-password?token=abc")).toBe(true);
    expect(isValidLocalRedirect("/a/b/c")).toBe(true);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isValidLocalRedirect("//evil.com")).toBe(false);
    expect(isValidLocalRedirect("//evil.com/path")).toBe(false);
  });

  it("rejects absolute external URLs", () => {
    expect(isValidLocalRedirect("https://evil.example")).toBe(false);
    expect(isValidLocalRedirect("http://evil.example/x")).toBe(false);
  });

  it("rejects dangerous schemes", () => {
    expect(isValidLocalRedirect("javascript:alert(1)")).toBe(false);
    expect(isValidLocalRedirect("data:text/html,x")).toBe(false);
    expect(isValidLocalRedirect("mailto:a@b.com")).toBe(false);
  });

  it("rejects backslash host tricks", () => {
    expect(isValidLocalRedirect("/\\evil.com")).toBe(false);
    expect(isValidLocalRedirect("\\\\evil.com")).toBe(false);
  });

  it("rejects CRLF / control characters (header injection / smuggling)", () => {
    expect(isValidLocalRedirect("/path%0d%0aLocation:%20https://evil.com")).toBe(false);
    expect(isValidLocalRedirect("/path\r\nSet-Cookie:x=1")).toBe(false);
    expect(isValidLocalRedirect("/foo\nbar")).toBe(false);
    expect(isValidLocalRedirect("/%00//evil.com")).toBe(false);
  });

  it("rejects leading/trailing whitespace (trim asymmetry)", () => {
    expect(isValidLocalRedirect("%20/evil")).toBe(false);
    expect(isValidLocalRedirect("/evil%20")).toBe(false);
  });

  it("rejects empty / non-string", () => {
    expect(isValidLocalRedirect("")).toBe(false);
    // @ts-expect-error testing runtime guard
    expect(isValidLocalRedirect(null)).toBe(false);
  });
});

describe("getSafeRedirectUrl", () => {
  it("returns the normalized path for valid input", () => {
    expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/reset-password%3Ffoo")).toBe("/reset-password?foo");
  });

  it("returns null for invalid/malicious input", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBeNull();
    expect(getSafeRedirectUrl("https://evil.example")).toBeNull();
    expect(getSafeRedirectUrl("/path%0d%0aLocation:x")).toBeNull();
    expect(getSafeRedirectUrl(null)).toBeNull();
  });
});
