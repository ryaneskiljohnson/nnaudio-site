import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { normalizeMetaUserData } from "@/utils/meta-conversions-api";

describe("normalizeMetaUserData", () => {
  it("hashes external_id the same way as other PII", () => {
    const userId = "11111111-2222-3333-4444-555555555555";
    const expected = createHash("sha256")
      .update(userId.toLowerCase().trim())
      .digest("hex");

    expect(normalizeMetaUserData({ userId }).external_id).toBe(expected);
  });
});
