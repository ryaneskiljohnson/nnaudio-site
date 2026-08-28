/**
 * @fileoverview Engine caps: 60 FPS skip and 1080p drawing buffer.
 * @module utils/__tests__/hero-gl-caps.test
 */

import { describe, expect, it } from "vitest";
import {
  HERO_FRAME_MIN_MS,
  HERO_MAX_BUFFER_HEIGHT,
  HERO_MAX_BUFFER_WIDTH,
  HERO_TEXTURE_MAX_PX,
  heroDrawingBufferSize,
  shouldSkipHeroFrame,
} from "@/components/hero-gl/caps";

describe("heroDrawingBufferSize", () => {
  it("leaves a 1080p board unchanged", () => {
    expect(heroDrawingBufferSize(1920, 1080)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it("scales a 4K board down to 1080p", () => {
    expect(heroDrawingBufferSize(3840, 2160)).toEqual({
      width: HERO_MAX_BUFFER_WIDTH,
      height: HERO_MAX_BUFFER_HEIGHT,
    });
  });

  it("does not upscale a laptop board", () => {
    expect(heroDrawingBufferSize(1440, 900)).toEqual({
      width: 1440,
      height: 900,
    });
  });

  it("keeps aspect when the long edge hits 1920", () => {
    const buf = heroDrawingBufferSize(2560, 1080);
    expect(buf.width).toBe(1920);
    expect(buf.height).toBe(Math.round(1080 * (1920 / 2560)));
  });
});

describe("shouldSkipHeroFrame", () => {
  it("never skips the first draw", () => {
    expect(shouldSkipHeroFrame(16, null)).toBe(false);
  });

  it("skips draws closer than one 60 FPS frame", () => {
    expect(shouldSkipHeroFrame(1008, 1000)).toBe(true);
    expect(shouldSkipHeroFrame(1000 + HERO_FRAME_MIN_MS + 1, 1000)).toBe(false);
  });
});

describe("texture cap", () => {
  it("matches a Next image width so 4K is never requested", () => {
    expect(HERO_TEXTURE_MAX_PX).toBe(1080);
  });
});
