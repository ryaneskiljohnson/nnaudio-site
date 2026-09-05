/**
 * @fileoverview Tests for CRM search sanitization.
 * @module utils/crm/__tests__/escape-search.test
 */

import { describe, expect, it } from "vitest";
import {
  emailIlikeOrClause,
  escapePostgrestIlikeExact,
  sanitizeCrmSearchTerm,
} from "@/utils/crm/escape-search";

describe("sanitizeCrmSearchTerm", () => {
  it("returns null for missing or blank input", () => {
    expect(sanitizeCrmSearchTerm(undefined)).toBeNull();
    expect(sanitizeCrmSearchTerm("")).toBeNull();
    expect(sanitizeCrmSearchTerm("   ")).toBeNull();
  });

  it("keeps a normal name search", () => {
    expect(sanitizeCrmSearchTerm("ryan johnson")).toBe("ryan johnson");
  });

  it("strips PostgREST or() metacharacters and escapes LIKE wildcards", () => {
    expect(sanitizeCrmSearchTerm("foo,bar")).toBe("foo bar");
    expect(sanitizeCrmSearchTerm("100%")).toBe("100\\%");
    expect(sanitizeCrmSearchTerm("a_b")).toBe("a\\_b");
    expect(sanitizeCrmSearchTerm("(admin)")).toBe("admin");
  });

  it("returns an empty string when only metacharacters remain", () => {
    expect(sanitizeCrmSearchTerm(",,,")).toBe("");
    expect(sanitizeCrmSearchTerm("()")).toBe("");
  });
});

describe("escapePostgrestIlikeExact", () => {
  it("escapes underscore and percent so they are not LIKE wildcards", () => {
    expect(escapePostgrestIlikeExact("first_last@x.com")).toBe(
      "first\\_last@x.com"
    );
    expect(escapePostgrestIlikeExact("100%@x.com")).toBe("100\\%@x.com");
  });

  it("lowercases and drops or() metacharacters", () => {
    expect(escapePostgrestIlikeExact("A@X.com")).toBe("a@x.com");
    expect(escapePostgrestIlikeExact("a@(x).com")).toBe("a@x.com");
  });
});

describe("emailIlikeOrClause", () => {
  it("escapes wildcards so first_last does not match firstXlast", () => {
    expect(emailIlikeOrClause(["first_last@x.com", "A@X.com"])).toBe(
      "email.ilike.first\\_last@x.com,email.ilike.a@x.com"
    );
  });
});
