import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

describe("getClientIp", () => {
  it("prefers x-vercel-forwarded-for over spoofable x-forwarded-for", () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "x-vercel-forwarded-for") return "1.1.1.1, 2.2.2.2";
          if (name === "x-forwarded-for") return "9.9.9.9";
          return null;
        },
      },
    };
    expect(getClientIp(req)).toBe("1.1.1.1");
  });

  it("falls back to 127.0.0.1", () => {
    const req = { headers: { get: () => null } };
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("checkRateLimit", () => {
  it("namespaces keys independently", () => {
    const unique = `test-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(`a:${unique}`, 1, 60)).toBe(true);
    expect(checkRateLimit(`a:${unique}`, 1, 60)).toBe(false);
    expect(checkRateLimit(`b:${unique}`, 1, 60)).toBe(true);
  });
});
