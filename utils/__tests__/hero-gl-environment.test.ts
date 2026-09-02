/**
 * @fileoverview CymaSynth oscillator-nest pose: Saturn plate in world
 * space, each loop spinning in its own plane.
 * @module utils/__tests__/hero-gl-environment.test
 */

import {
  Group,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  TubeGeometry,
} from "three";
import { describe, expect, it } from "vitest";
import {
  createSynthOscRings,
  poseSynthOscRings,
} from "@/components/hero-gl/environment";
import {
  createHeroSkybox,
  poseHeroSkybox,
  wrapSkyLongitude,
} from "@/components/hero-gl/skyboxMaterial";
import {
  CYMASYNTH_OSC_RING_SETS,
  CYMASYNTH_RING_DISK_TILT_DEG,
  synthOscDiskEulerRad,
  synthOscPlateSpinDeg,
  synthOscRingSpinRad,
} from "@/utils/circuit-network-layout";

describe("poseSynthOscRings", () => {
  it("tilts the nest and spins each loop around its disk normal", () => {
    const group = createSynthOscRings();
    poseSynthOscRings(group, 3500, 1);
    const euler = synthOscDiskEulerRad(synthOscPlateSpinDeg(3500));
    expect(group.rotation.order).toBe("XYZ");
    expect(group.rotation.x).toBeCloseTo(euler.x);
    expect(group.rotation.y).toBeCloseTo(0);
    expect(group.rotation.z).toBeCloseTo(euler.z);
    expect(group.rotation.x).toBeCloseTo(
      (CYMASYNTH_RING_DISK_TILT_DEG * Math.PI) / 180
    );
    expect(group.children).toHaveLength(CYMASYNTH_OSC_RING_SETS.length);
    for (let s = 0; s < CYMASYNTH_OSC_RING_SETS.length; s += 1) {
      const set = CYMASYNTH_OSC_RING_SETS[s];
      const plate = group.children[s];
      expect(plate.rotation.x).toBeCloseTo((set.tiltX * Math.PI) / 180);
      expect(plate.rotation.z).toBeCloseTo((set.tiltZ * Math.PI) / 180);
      expect(plate.children).toHaveLength(set.rings.length);
      for (let i = 0; i < set.rings.length; i += 1) {
        const ring = set.rings[i];
        const line = plate.children[i];
        expect(line.rotation.x).toBeCloseTo(0);
        expect(line.rotation.y).toBeCloseTo(0);
        expect(line.rotation.z).toBeCloseTo(
          synthOscRingSpinRad(3500, ring.periodSec)
        );
        expect(line).toHaveProperty("geometry");
        expect((line as { geometry?: unknown }).geometry).toBeInstanceOf(
          TubeGeometry
        );
      }
    }
  });

  it("scales the nest with the posed moon diameter", () => {
    const group = createSynthOscRings();
    poseSynthOscRings(group, 0, 1, 216);
    expect(group.scale.x).toBeCloseTo(2);
  });

  it("fades the nest out instead of leaving it fully drawn", () => {
    const group = createSynthOscRings();
    poseSynthOscRings(group, 0, 0);
    expect(group.visible).toBe(false);
    poseSynthOscRings(group, 0, 0.5);
    expect(group.visible).toBe(true);
  });
});

describe("hero skybox", () => {
  it("keeps stars on the far plane with no nebula", () => {
    const root = createHeroSkybox();
    expect(root.name).toBe("hero-skybox");
    expect(root.getObjectByName("hero-nebula")).toBeUndefined();
    expect(root.getObjectByName("hero-aurora")).toBeUndefined();
    const stars = root.getObjectByName("hero-stars") as Mesh;
    const starMat = stars.material as ShaderMaterial;
    expect(starMat.uniforms.uStarCount.value).toBe(135);
    expect(starMat.uniforms.uCellDensity.value).toBe(22);
    const camera = new PerspectiveCamera(50, 1, 2, 20000);
    camera.position.set(0, 0, 900);
    camera.updateMatrixWorld();
    const world = new Group();
    poseHeroSkybox(root, camera, world, 0.25);
    expect(starMat.uniforms.uSpin.value).toBe(0.25);
    expect(starMat.uniforms.uTime).toBeUndefined();
    expect(starMat.uniforms.uInvProj.value.elements[0]).not.toBe(1);
    const before = starMat.uniforms.uViewToLocal.value.elements.slice();
    world.rotation.y = 0.4;
    poseHeroSkybox(root, camera, world, 0.25);
    expect(starMat.uniforms.uViewToLocal.value.elements).not.toEqual(before);
    expect(starMat.uniforms.uSpin.value).toBe(0.25);
  });

  it("wraps spun longitude onto (-π, π] so the seam stays on a ±π cut", () => {
    for (const turns of [0, 0.25, 0.5, 0.75, 1.25]) {
      const spin = turns * Math.PI * 2;
      for (const raw of [-Math.PI, -1, 0, 1, Math.PI, Math.PI + spin]) {
        const wrapped = wrapSkyLongitude(raw);
        expect(wrapped).toBeGreaterThan(-Math.PI - 1e-10);
        expect(wrapped).toBeLessThanOrEqual(Math.PI + 1e-10);
      }
      expect(wrapSkyLongitude(Math.PI + spin)).toBeCloseTo(
        wrapSkyLongitude(-Math.PI + spin),
        10
      );
    }
    expect(Math.abs(wrapSkyLongitude(Math.PI))).toBeCloseTo(Math.PI, 10);
  });
});
