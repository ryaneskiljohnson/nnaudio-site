/**
 * @fileoverview Sun/moon scale and wrap-shader contracts for the hero.
 * @module utils/__tests__/hero-gl-bodies.test
 */

import { Texture } from "three";
import { describe, expect, it } from "vitest";
import {
  applyBodyTexture,
  createBodyMesh,
  createSunMesh,
  heroBodyRadius,
  heroSunRadius,
} from "@/components/hero-gl/bodies";
import { HERO_SUN_DIAMETER_PX } from "@/components/hero-gl/caps";
import { createSphereWrapMaterial } from "@/components/hero-gl/sphereWrapMaterial";

describe("heroBodyRadius", () => {
  it("matches the old CSS 0.96 + focus boost", () => {
    expect(heroBodyRadius(100, 0)).toBeCloseTo(48, 5);
    expect(heroBodyRadius(100, 1)).toBeCloseTo(73, 5);
  });
});

describe("heroSunRadius", () => {
  it("applies the tour sunScale cheat", () => {
    expect(heroSunRadius(1)).toBeCloseTo(HERO_SUN_DIAMETER_PX / 2, 5);
    expect(heroSunRadius(0.42)).toBeCloseTo((HERO_SUN_DIAMETER_PX / 2) * 0.42, 5);
    expect(heroSunRadius(1.55)).toBeGreaterThan(heroSunRadius(1));
  });
});

describe("applyBodyTexture", () => {
  it("wraps sun posters with the sphere shader, not UV-mapped photos", () => {
    const sun = createSunMesh();
    applyBodyTexture(sun, new Texture());
    expect(sun.wrap).not.toBeNull();
    expect(sun.wrap?.uniforms.uSurfaceShade?.value).toBe(0);
    expect(sun.wrap?.uniforms.uPlanar?.value).toBe(1);
  });

  it("shades catalog moons along the wrap meridian", () => {
    const moon = createBodyMesh({
      key: "n",
      slug: "n",
      name: "n",
      kind: "moon",
      diameter: 48,
      spinDur: 40,
      spinRev: false,
    });
    applyBodyTexture(moon, new Texture());
    expect(moon.wrap?.uniforms.uSurfaceShade?.value).toBe(1);
    expect(moon.wrap?.uniforms.uPlanar?.value).toBe(0);
  });
});

describe("createSphereWrapMaterial", () => {
  it("exposes a phase uniform the tour can spin", () => {
    const mat = createSphereWrapMaterial(new Texture(), false);
    expect(mat.uniforms.uPhase?.value).toBe(0);
    mat.dispose();
  });

  it("fills the camera-facing hemisphere so wraps are not black", () => {
    const mat = createSphereWrapMaterial(new Texture(), true);
    expect(mat.uniforms.uCamFill?.value).toBe(1);
    mat.dispose();
  });
});
