/**
 * @fileoverview Tests for password-reset email callback URL classification.
 * @module utils/auth/__tests__/password-reset-callback.test
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectPasswordResetCallback,
  isPasswordSetCallbackType,
  parseAuthHash,
} from "../password-reset-callback";

describe("parseAuthHash", () => {
  it("parses a hash with a leading #", () => {
    const params = parseAuthHash(
      "#access_token=aaa&refresh_token=bbb&type=recovery"
    );
    expect(params.get("access_token")).toBe("aaa");
    expect(params.get("refresh_token")).toBe("bbb");
    expect(params.get("type")).toBe("recovery");
  });

  it("parses a hash without a leading #", () => {
    const params = parseAuthHash("type=invite&access_token=x");
    expect(params.get("type")).toBe("invite");
    expect(params.get("access_token")).toBe("x");
  });
});

describe("isPasswordSetCallbackType", () => {
  it("accepts recovery and invite", () => {
    expect(isPasswordSetCallbackType("recovery")).toBe(true);
    expect(isPasswordSetCallbackType("invite")).toBe(true);
  });

  it("rejects other types", () => {
    expect(isPasswordSetCallbackType("signup")).toBe(false);
    expect(isPasswordSetCallbackType(null)).toBe(false);
  });
});

describe("inspectPasswordResetCallback", () => {
  it("returns none when the URL has no callback data", () => {
    expect(
      inspectPasswordResetCallback(new URLSearchParams(), "")
    ).toEqual({ kind: "none" });
  });

  it("classifies a PKCE code query param", () => {
    expect(
      inspectPasswordResetCallback(new URLSearchParams("code=abc123"), "")
    ).toEqual({ kind: "pkce", code: "abc123" });
  });

  it("classifies implicit recovery hash tokens", () => {
    expect(
      inspectPasswordResetCallback(
        new URLSearchParams(),
        "#access_token=tok&refresh_token=ref&type=recovery"
      )
    ).toEqual({
      kind: "hash-session",
      accessToken: "tok",
      refreshToken: "ref",
      type: "recovery",
    });
  });

  it("classifies implicit invite hash tokens", () => {
    expect(
      inspectPasswordResetCallback(
        new URLSearchParams(),
        "#access_token=tok&refresh_token=ref&type=invite"
      )
    ).toEqual({
      kind: "hash-session",
      accessToken: "tok",
      refreshToken: "ref",
      type: "invite",
    });
  });

  it("treats expired OTP errors as an invalid-link message", () => {
    const result = inspectPasswordResetCallback(
      new URLSearchParams("error=access_denied&error_code=otp_expired"),
      ""
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toMatch(/invalid or has expired/i);
    }
  });

  it("treats confirm-route invalid_link as an expired-link message", () => {
    const result = inspectPasswordResetCallback(
      new URLSearchParams("error=invalid_link"),
      ""
    );
    expect(result.kind).toBe("error");
  });

  it("prefers an error over a leftover PKCE code", () => {
    const result = inspectPasswordResetCallback(
      new URLSearchParams("code=abc&error=access_denied"),
      ""
    );
    expect(result.kind).toBe("error");
  });

  it("humanizes plus-encoded error_description values", () => {
    const result = inspectPasswordResetCallback(
      new URLSearchParams("error=server_error&error_description=Not+allowed"),
      ""
    );
    expect(result).toEqual({ kind: "error", message: "Not allowed" });
  });
});

describe("nnaudio-reset-password email template", () => {
  it("uses the confirm-route token_hash callback instead of ConfirmationURL", () => {
    const html = readFileSync(
      resolve(
        process.cwd(),
        "supabase/templates/nnaudio-reset-password.html"
      ),
      "utf8"
    );
    expect(html).toContain(
      "{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
    );
    expect(html).not.toContain("{{ .ConfirmationURL }}");
  });
});
