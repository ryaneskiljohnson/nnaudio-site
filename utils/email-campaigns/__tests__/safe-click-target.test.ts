import { describe, it, expect } from "vitest";
import { resolveSafeClickTarget } from "@/utils/email-campaigns/safe-click-target";

describe("resolveSafeClickTarget", () => {
  const site = "https://nnaud.io";

  it("allows same-host https URLs", () => {
    expect(resolveSafeClickTarget("https://nnaud.io/products", site)).toBe(
      "https://nnaud.io/products"
    );
  });

  it("rejects open redirects to other hosts", () => {
    expect(resolveSafeClickTarget("https://evil.example/phish", site)).toBe(site);
  });

  it("rejects javascript: and data: URLs", () => {
    expect(resolveSafeClickTarget("javascript:alert(1)", site)).toBe(site);
    expect(resolveSafeClickTarget("data:text/html,hi", site)).toBe(site);
  });

  it("allows extra hosts from EMAIL_LINK_ALLOWED_HOSTS", () => {
    const prev = process.env.EMAIL_LINK_ALLOWED_HOSTS;
    process.env.EMAIL_LINK_ALLOWED_HOSTS = "cdn.example.com";
    expect(
      resolveSafeClickTarget("https://cdn.example.com/asset.png", site)
    ).toBe("https://cdn.example.com/asset.png");
    if (prev === undefined) delete process.env.EMAIL_LINK_ALLOWED_HOSTS;
    else process.env.EMAIL_LINK_ALLOWED_HOSTS = prev;
  });
});
