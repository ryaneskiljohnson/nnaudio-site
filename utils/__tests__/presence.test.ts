import { describe, it, expect } from "vitest";
import {
  isExcludedPresenceIp,
  normalizePresenceIp,
  parseExcludedPresenceIps,
  sanitizePresencePath,
} from "@/utils/presence";

describe("normalizePresenceIp", () => {
  it("strips IPv4-mapped IPv6 prefixes", () => {
    expect(normalizePresenceIp("::ffff:203.0.113.10")).toBe("203.0.113.10");
  });
});

describe("parseExcludedPresenceIps", () => {
  it("splits and normalizes a comma-separated list", () => {
    expect(
      parseExcludedPresenceIps(" 203.0.113.10, ::ffff:1.2.3.4 "),
    ).toEqual(["203.0.113.10", "1.2.3.4"]);
  });

  it("returns an empty list when unset", () => {
    expect(parseExcludedPresenceIps(undefined)).toEqual([]);
  });
});

describe("isExcludedPresenceIp", () => {
  it("matches an excluded IP after normalization", () => {
    expect(
      isExcludedPresenceIp("::ffff:203.0.113.10", ["203.0.113.10"]),
    ).toBe(true);
  });

  it("does not match other IPs", () => {
    expect(isExcludedPresenceIp("8.8.8.8", ["203.0.113.10"])).toBe(false);
  });
});

describe("sanitizePresencePath", () => {
  it("strips query and hash", () => {
    expect(sanitizePresencePath("/plugins?ref=1#top")).toBe("/plugins");
  });
});
