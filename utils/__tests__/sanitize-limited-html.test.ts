import { describe, expect, it } from "vitest";
import { FAQ_DEFAULT_QUESTIONS } from "@/lib/faq-default-questions";
import {
  isSafeHref,
  sanitizeLimitedHtml,
} from "@/utils/sanitize-limited-html";

describe("isSafeHref", () => {
  it("allows site paths, hashes, and http(s)/mailto", () => {
    expect(isSafeHref("/dashboard")).toBe(true);
    expect(isSafeHref("#faq")).toBe(true);
    expect(isSafeHref("https://nnaud.io")).toBe(true);
    expect(isSafeHref("mailto:support@nnaud.io")).toBe(true);
  });

  it("rejects javascript, data, and protocol-relative URLs", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,x")).toBe(false);
    expect(isSafeHref("//evil.example/x")).toBe(false);
  });
});

describe("sanitizeLimitedHtml", () => {
  it("keeps the FAQ allowlist and drops script", () => {
    const html =
      '<a href="/dashboard" target="_self" rel="noopener noreferrer">Go</a>' +
      "<strong>Bold</strong><script>alert(1)</script>";
    expect(sanitizeLimitedHtml(html)).toBe(
      '<a href="/dashboard" target="_self" rel="noopener noreferrer">Go</a>' +
        "<strong>Bold</strong>"
    );
  });

  it("strips event handlers and unsafe hrefs", () => {
    expect(
      sanitizeLimitedHtml('<a href="javascript:alert(1)" onclick="evil()">x</a>')
    ).toBe("<a>x</a>");
  });

  it("preserves default FAQ answers and their links", () => {
    for (const item of FAQ_DEFAULT_QUESTIONS) {
      const out = sanitizeLimitedHtml(item.answer);
      expect(out).not.toContain("<script");
      if (item.answer.includes("<a ")) {
        expect(out).toContain("<a href=");
        expect(out).toContain("noopener");
      }
      if (item.answer.includes("<strong>")) {
        expect(out).toContain("<strong>");
      }
    }
  });
});
