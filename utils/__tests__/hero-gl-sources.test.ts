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
const bodies = readFileSync(
  resolve(process.cwd(), "components/hero-gl/bodies.ts"),
  "utf8"
);
const ecosystem = readFileSync(
  resolve(process.cwd(), "components/sections/EcosystemHero.tsx"),
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
    expect(bodies).not.toContain("createElement(\"canvas\")");
  });

  it("wraps credit names at whitespace, not mid-letter", () => {
    expect(circuit).toContain("overflow-wrap: normal");
    expect(circuit).toContain("word-break: normal");
    expect(circuit).toContain("hyphens: none");
    expect(circuit).toContain("fillNameWords");
    expect(circuit).toContain('word.className = "hero-nowrap whitespace-nowrap"');
    expect(circuit).toContain("white-space: nowrap");
    expect(circuit).not.toContain("overflow-wrap: anywhere");
    expect(circuit).not.toContain("overflow-wrap: break-word");
  });

  it("keeps the CSS visibility budget and a fixed sun diameter", () => {
    expect(circuit).toContain("creditStageKeys");
    expect(circuit).toContain("catalogOrbitSeats");
    expect(circuit).toContain("catalogSlotOccupants");
    expect(circuit).toContain("buildHeroCredits");
    expect(circuit).toContain("DEFAULT_CYMASYNTH_NODE");
    expect(circuit).toContain("setSunDiameter");
    expect(circuit).toContain("billboardFacingCamera");
  });

  it("keys bodies from the camera so the visible side stays lit", () => {
    expect(scene).toContain("SRGBColorSpace");
    expect(scene).toContain("DirectionalLight");
    expect(scene).not.toContain("PointLight");
    expect(scene).toContain("this.camera.add(key)");
    expect(scene).toContain("lookPlusZToward");
    expect(bodies).toContain("createSunAura");
    expect(scene).toContain("this.sun.mesh.add(this.nebulae)");
    expect(scene).not.toContain("this.sky.add(this.nebulae)");
    expect(scene).toContain("this.world.add(this.synthRings)");
    expect(scene).not.toContain("synth.mesh.add(this.synthRings)");
    expect(scene).toContain("alignSynthSeat");
    expect(scene).toContain("handle.kind !== \"synth\"");
    expect(scene).toContain("facingPhaseFromDir");
    expect(wrap).toContain("uOpacity");
    expect(wrap).not.toContain("uPrelit");
    expect(wrap).not.toContain("uCamFill");
    expect(wrap).not.toContain("specTight");
    expect(wrap).toContain("#include <colorspace_fragment>");
    expect(wrap).toContain("atan(n.x, n.z)");
    expect(wrap).toContain("texture2DLodEXT");
    expect(wrap).toContain("stripSeamBlend");
    expect(wrap).toContain("1.0 - srcU");
    expect(wrap).not.toContain("uPad");
    expect(wrap).not.toContain("samplePadded");
    expect(wrap).not.toContain("uLight1");
    expect(wrap).not.toContain("mix(globe, color.rgb");
    expect(wrap).not.toContain("vec3(0.62, 0.52, 0.82)");
  });

  it("does not resize the sun from camera dolly", () => {
    expect(circuit).not.toContain("sunScaleFromCamera");
    expect(circuit).not.toContain("poseSunDiameter");
    expect(circuit).toContain("heroSunFitDiameterPx");
  });

  it("draws at 60 FPS and snaps moon holds, then eases hops", () => {
    expect(caps).toContain("HERO_FPS = 60");
    expect(circuit).toContain("trackingMoon");
    expect(circuit).toContain("holdingMoon");
    expect(circuit).toContain("heroCameraFollowTau");
    expect(circuit).toContain("poseBodyOpacity");
    expect(circuit).not.toContain("jump > 10 ? 32");
    expect(circuit).toContain("arrivingSpinPhase");
    expect(circuit).toContain("HERO_WRAP_ARRIVE_PHASE");
    expect(circuit).toContain("beginArrive");
    expect(circuit).not.toContain("latchFaceOn");
  });

  it("keeps the still up until the sun wrap is on the GPU", () => {
    expect(circuit).toContain("tourArmedRef");
    expect(circuit).toContain("revealAtRef");
    expect(circuit).toContain("HERO_STILL_FADE_MS");
    expect(circuit).toContain("heroStillSunPose");
    expect(circuit).toContain("onReveal");
    expect(ecosystem).toContain("StillCover");
    expect(ecosystem).toContain("HERO_STILL_FADE_MS");
    expect(ecosystem).toContain("onReveal={setTourRevealed}");
    expect(ecosystem).toContain("tourRevealed");
  });
});

describe("heroWebglAvailable", () => {
  it("is false without a document / WebGL context", () => {
    expect(heroWebglAvailable()).toBe(false);
  });
});
