import { describe, it, expect, beforeEach } from "vitest";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/utils/email-campaigns/unsubscribe-tokens";

describe("unsubscribe tokens", () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_TOKEN_SECRET = "test-unsub-secret";
  });

  it("round-trips a valid token", () => {
    const token = generateUnsubscribeToken("User@Example.com");
    expect(verifyUnsubscribeToken(token)).toBe("user@example.com");
  });

  it("rejects a tampered token", () => {
    const token = generateUnsubscribeToken("user@example.com");
    expect(verifyUnsubscribeToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyUnsubscribeToken("not-a-token")).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
  });
});
