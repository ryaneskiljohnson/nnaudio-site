/**
 * @fileoverview Sun/moon scale and wrap-shader contracts for the hero.
 * @module utils/__tests__/hero-gl-bodies.test
 */

import { Texture } from "three";
import { describe, expect, it } from "vitest";
import {
  applyBodyOpacity,
  applyBodyTexture,
  bodyOpacity,
  createBodyMesh,
  createSunMesh,
  heroBodyRadius,
  heroSunRadius,
} from "@/components/hero-gl/bodies";
import { HERO_SUN_DIAMETER_PX } from "@/components/hero-gl/caps";
import { createSphereWrapMaterial } from "@/components/hero-gl/sphereWrapMaterial";

describe("createBodyMesh", () => {
  it("hides catalog moons until the tour stages them", () => {
    const moon = createBodyMesh({
      key: "n",
      slug: "n",
      name: "n",
      kind: "moon",
      diameter: 48,
      spinDur: 40,
      spinRev: false,
    });
    expect(moon.mesh.visible).toBe(false);
    expect(bodyOpacity(moon)).toBe(0);
    expect(createSunMesh().mesh.visible).toBe(true);
  });

  it("fades a moon instead of toggling visibility as a cut", () => {
    const moon = createBodyMesh({
      key: "n",
      slug: "n",
      name: "n",
      kind: "moon",
      diameter: 48,
      spinDur: 40,
      spinRev: false,
    });
    applyBodyOpacity(moon, 0.4);
    expect(moon.mesh.visible).toBe(true);
    expect(bodyOpacity(moon)).toBeCloseTo(0.4);
    applyBodyOpacity(moon, 0);
    expect(moon.mesh.visible).toBe(false);
  });
});

describe("heroBodyRadius", () => {
  it("matches the old CSS 0.96 + focus boost", () => {
    expect(heroBodyRadius(100, 0)).toBeCloseTo(48, 5);
    expect(heroBodyRadius(100, 1)).toBeCloseTo(73, 5);
  });
});

describe("heroSunRadius", () => {
  it("is half the world disk, like a planet", () => {
    expect(heroSunRadius()).toBeCloseTo(HERO_SUN_DIAMETER_PX / 2, 5);
    expect(heroSunRadius(180)).toBeCloseTo(90, 5);
  });
});

describe("applyBodyTexture", () => {
  it("wraps Cymasphere like the other planets and leaves the poster prelit", () => {
    const sun = createSunMesh();
    applyBodyTexture(sun, new Texture());
    expect(sun.wrap).not.toBeNull();
    expect(sun.wrap?.uniforms.uSurfaceShade?.value).toBe(0);
    expect(sun.wrap?.uniforms.uPlanar?.value).toBe(0);
    expect(sun.wrap?.uniforms.uPrelit?.value).toBe(1);
  });

  it("skips meridian shade so catalog moons take the same gloss", () => {
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
    expect(moon.wrap?.uniforms.uSurfaceShade?.value).toBe(0);
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

  it("exposes opacity so staged moons can fade", () => {
    const mat = createSphereWrapMaterial(new Texture(), true);
    expect(mat.uniforms.uOpacity?.value).toBe(1);
    expect(mat.transparent).toBe(true);
    mat.dispose();
  });
});

describe("applyBodyOpacity", () => {
  it("goes solid at full fade so globes are not see-through", () => {
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
    applyBodyOpacity(moon, 1);
    expect(moon.wrap?.transparent).toBe(false);
    expect(moon.wrap?.depthWrite).toBe(true);
    applyBodyOpacity(moon, 0.4);
    expect(moon.wrap?.transparent).toBe(true);
  });
});
