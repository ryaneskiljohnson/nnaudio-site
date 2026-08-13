import { describe, expect, it } from "vitest";
import { absoluteAssetUrl } from "@/utils/seo/absolute-asset-url";

describe("absoluteAssetUrl", () => {
  it("returns absolute URLs unchanged", () => {
    expect(
      absoluteAssetUrl("https://cdn.example.com/og.webp", "https://nnaud.io")
    ).toBe("https://cdn.example.com/og.webp");
  });

  it("prefixes relative paths with the site origin", () => {
    expect(absoluteAssetUrl("/og.webp", "https://nnaud.io")).toBe(
      "https://nnaud.io/og.webp"
    );
  });

  it("returns the site origin when the asset is empty", () => {
    expect(absoluteAssetUrl("", "https://nnaud.io")).toBe("https://nnaud.io");
  });
});
