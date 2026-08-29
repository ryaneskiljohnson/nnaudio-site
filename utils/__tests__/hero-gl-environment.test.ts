/**
 * @fileoverview CymaSynth oscillator-nest pose: in-plane spin, not tumble.
 * @module utils/__tests__/hero-gl-environment.test
 */

import { describe, expect, it } from "vitest";
import {
  createSynthOscRings,
  poseSynthOscRings,
} from "@/components/hero-gl/environment";
import {
  CYMASYNTH_OSC_RINGS,
  CYMASYNTH_RING_DISK_TILT_DEG,
  synthOscDiskEulerRad,
} from "@/utils/circuit-network-layout";

describe("poseSynthOscRings", () => {
  it("tilts the nest and spins around the disk normal", () => {
    const group = createSynthOscRings();
    poseSynthOscRings(group, { x: 10, height: 4, z: -6 }, 108, 90, 1);
    const euler = synthOscDiskEulerRad(90);
    expect(group.rotation.order).toBe("XYZ");
    expect(group.rotation.x).toBeCloseTo(euler.x);
    expect(group.rotation.y).toBeCloseTo(0);
    expect(group.rotation.z).toBeCloseTo(euler.z);
    expect(group.rotation.x).toBeCloseTo(
      (CYMASYNTH_RING_DISK_TILT_DEG * Math.PI) / 180
    );
    for (let i = 0; i < CYMASYNTH_OSC_RINGS.length; i += 1) {
      const ring = CYMASYNTH_OSC_RINGS[i];
      const line = group.children[i];
      expect(line.rotation.x).toBeCloseTo((ring.tiltX * Math.PI) / 180);
      expect(line.rotation.z).toBeCloseTo((ring.tiltZ * Math.PI) / 180);
    }
  });

  it("fades the nest out instead of leaving it fully drawn", () => {
    const group = createSynthOscRings();
    poseSynthOscRings(group, { x: 0, height: 0, z: 0 }, 108, 0, 0);
    expect(group.visible).toBe(false);
    poseSynthOscRings(group, { x: 0, height: 0, z: 0 }, 108, 0, 0.5);
    expect(group.visible).toBe(true);
  });
});
