/**
 * @fileoverview Source contracts for the Three.js hero (no 4K, no canvas warp).
 * @module utils/__tests__/hero-gl-sources.test
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { heroWebglAvailable } from "@/components/hero-gl/HeroScene";

const circuit = readFileSync(
  resolve(process.cwd(), "components/sections/CircuitNetwork.tsx"),
  "utf8"
);
const scene = readFileSync(
  resolve(process.cwd(), "components/hero-gl/HeroScene.ts"),
  "utf8"
);
const caps = readFileSync(
  resolve(process.cwd(), "components/hero-gl/caps.ts"),
  "utf8"
);
const wrap = readFileSync(
  resolve(process.cwd(), "components/hero-gl/sphereWrapMaterial.ts"),
  "utf8"
);

describe("hero source contracts", () => {
  it("does not decode the 4K sun or synth JPGs", () => {
    const joined = `${circuit}\n${scene}\n${caps}`;
    expect(joined).not.toContain("cymasphere-sun-sphere.jpg");
    expect(joined).not.toContain("cymasynth-sphere.jpg");
    expect(joined).toContain("cymasphere-sun-sphere-hero.webp");
    expect(joined).toContain("cymasynth-sphere-hero.webp");
  });

  it("does not call the Canvas 2D warp path", () => {
    expect(circuit).not.toContain("warpStripToCanvas");
    expect(circuit).not.toContain("TexCanvas");
  });

  it("keeps the CSS visibility budget and sunScale cheat", () => {
    expect(circuit).toContain("pickVisibleMoons");
    expect(circuit).toContain("poseSunScale");
    expect(circuit).toContain("billboardFacingCamera");
  });

  it("lights bodies from the camera so holds are not a new moon", () => {
    expect(scene).toContain("DirectionalLight");
    expect(scene).toContain("lookPlusZToward");
    expect(wrap).toContain("uCamFill");
    expect(wrap).toContain("facing = mix(0.82, 1.12, max(0.0, n.z))");
    expect(wrap).toContain("disk * 0.5 + 0.5");
  });

  it("scales the sun from the smoothed dolly, not the raw tour key", () => {
    expect(circuit).toContain("sunScaleFromCamera(follow.tz)");
  });
});

describe("heroWebglAvailable", () => {
  it("is false without a document / WebGL context", () => {
    expect(heroWebglAvailable()).toBe(false);
  });
});
