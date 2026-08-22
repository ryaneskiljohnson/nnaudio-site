import { describe, expect, it } from "vitest";
import {
  NEXT_IMAGE_WIDTHS,
  imageUrlNeedsCrossOrigin,
  isOptimizableImageSrc,
  nearestNextImageWidth,
  optimizedImageUrl,
} from "@/utils/optimized-image-url";

describe("nearestNextImageWidth", () => {
  it("rounds up to the next configured optimizer width", () => {
    expect(nearestNextImageWidth(52)).toBe(64);
    expect(nearestNextImageWidth(74)).toBe(96);
    expect(nearestNextImageWidth(384)).toBe(384);
    expect(nearestNextImageWidth(640)).toBe(640);
    expect(nearestNextImageWidth(1120)).toBe(1200);
  });

  it("caps at the largest configured width", () => {
    expect(nearestNextImageWidth(10_000)).toBe(3840);
  });

  it("matches Next default imageSizes + deviceSizes", () => {
    expect([...NEXT_IMAGE_WIDTHS]).toEqual([
      16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
      3840,
    ]);
  });
});

describe("isOptimizableImageSrc", () => {
  it("allows root-relative and already-optimized URLs", () => {
    expect(isOptimizableImageSrc("/images/icon.png")).toBe(true);
    expect(isOptimizableImageSrc("/_next/image?url=%2Fa.png&w=64&q=70")).toBe(
      true
    );
  });

  it("allows configured remote hosts", () => {
    expect(
      isOptimizableImageSrc(
        "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/product-images/a.png"
      )
    ).toBe(true);
    expect(isOptimizableImageSrc("https://nnaud.io/images/icon.png")).toBe(
      true
    );
    expect(
      isOptimizableImageSrc("https://foo.supabase.co/auth/v1/user.png")
    ).toBe(false);
  });

  it("rejects unknown hosts, data URLs, and protocol-relative URLs", () => {
    expect(isOptimizableImageSrc("https://evil.example/a.png")).toBe(false);
    expect(isOptimizableImageSrc("https://cdn.example.com/a.png")).toBe(false);
    expect(isOptimizableImageSrc("data:image/png;base64,xx")).toBe(false);
    expect(isOptimizableImageSrc("//znecvzfogwkzinkduyuq.supabase.co/a.png")).toBe(
      false
    );
    expect(isOptimizableImageSrc("")).toBe(false);
  });
});

describe("optimizedImageUrl", () => {
  it("wraps allowlisted remote and local paths in /_next/image", () => {
    expect(optimizedImageUrl("https://nnaud.io/a.png", 52)).toBe(
      "/_next/image?url=https%3A%2F%2Fnnaud.io%2Fa.png&w=64&q=70"
    );
    expect(optimizedImageUrl("/images/icon.png", 128)).toBe(
      "/_next/image?url=%2Fimages%2Ficon.png&w=128&q=70"
    );
  });

  it("leaves unknown hosts and data URLs as the original src", () => {
    expect(optimizedImageUrl("https://cdn.example.com/a.png", 52)).toBe(
      "https://cdn.example.com/a.png"
    );
    expect(optimizedImageUrl("data:image/png;base64,xx", 52)).toBe(
      "data:image/png;base64,xx"
    );
  });

  it("leaves already-optimized URLs alone", () => {
    expect(optimizedImageUrl("/_next/image?url=%2Fa.png&w=64&q=70", 52)).toBe(
      "/_next/image?url=%2Fa.png&w=64&q=70"
    );
  });

  it("returns an empty string unchanged", () => {
    expect(optimizedImageUrl("", 52)).toBe("");
  });
});

describe("imageUrlNeedsCrossOrigin", () => {
  const origin = "https://nnaud.io";

  it("is false for same-origin optimizer and local paths", () => {
    expect(
      imageUrlNeedsCrossOrigin("/_next/image?url=%2Fa.png&w=64&q=70", origin)
    ).toBe(false);
    expect(imageUrlNeedsCrossOrigin("/images/icon.png", origin)).toBe(false);
  });

  it("is true for cross-origin product images", () => {
    expect(
      imageUrlNeedsCrossOrigin(
        "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/a.png",
        origin
      )
    ).toBe(true);
  });

  it("is false for data URLs", () => {
    expect(imageUrlNeedsCrossOrigin("data:image/png;base64,xx", origin)).toBe(
      false
    );
  });
});
