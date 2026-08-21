import { describe, expect, it } from "vitest";
import {
  type SphereShadeOut,
  createOrbitalSystem,
  keplerPeriodSec,
  moonAxialTilt,
  orbitPlaneTilt,
  orbitRingAngleCss,
  orbitRingBasisCss,
  orbitRingDash,
  orbitRingGapHalf,
  orbitRingMatrix3d,
  solveKepler,
  sphereShade,
  stepOrbitalSystem,
} from "@/utils/orbital-physics";

const seeds = [
  { key: "cymasynth", radius: 100, startDeg: -90, periodSec: 20 },
  { key: "prod-a", radius: 200, startDeg: 0, periodSec: 40 },
  { key: "prod-b", radius: 300, startDeg: 120, periodSec: 80 },
];

describe("keplerPeriodSec", () => {
  it("follows Kepler's third law above the clamp", () => {
    expect(keplerPeriodSec(0.8) / keplerPeriodSec(0.4)).toBeCloseTo(
      Math.pow(2, 1.5),
      3
    );
  });

  it("clamps very close orbits to stay watchable", () => {
    expect(keplerPeriodSec(0.01)).toBe(16);
  });
});

describe("solveKepler", () => {
  it("returns the mean anomaly for circular orbits", () => {
    expect(solveKepler(1.3, 0)).toBeCloseTo(1.3);
  });

  it("satisfies Kepler's equation for eccentric orbits", () => {
    const E = solveKepler(2.1, 0.2);
    expect(E - 0.2 * Math.sin(E)).toBeCloseTo(2.1, 6);
  });
});

describe("stepOrbitalSystem", () => {
  it("starts each body near its seat angle for the credits camera", () => {
    const pos = stepOrbitalSystem(createOrbitalSystem(seeds), 0);
    seeds.forEach((seed, i) => {
      const deg = (Math.atan2(pos[i * 3], pos[i * 3 + 2]) * 180) / Math.PI;
      let diff = deg - seed.startDeg;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      expect(Math.abs(diff)).toBeLessThan(14);
    });
  });

  it("keeps every body inside its elliptical bounds over time", () => {
    const sys = createOrbitalSystem(seeds);
    for (let t = 0; t < 200; t += 7) {
      const pos = stepOrbitalSystem(sys, t);
      seeds.forEach((seed, i) => {
        const r = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        expect(r).toBeGreaterThan(seed.radius * 0.85);
        expect(r).toBeLessThan(seed.radius * 1.15);
      });
    }
  });

  it("moves bodies as time advances", () => {
    const sys = createOrbitalSystem(seeds);
    const before = [...stepOrbitalSystem(sys, 0)];
    const after = stepOrbitalSystem(sys, 5);
    expect(Math.abs(after[0] - before[0]) + Math.abs(after[2] - before[2]))
      .toBeGreaterThan(1);
  });

  it("reuses one position buffer with no per-frame allocation", () => {
    const sys = createOrbitalSystem(seeds);
    const first = stepOrbitalSystem(sys, 1);
    const second = stepOrbitalSystem(sys, 2);
    expect(second).toBe(first);
    expect(second).toBe(sys.pos);
  });

  it("is deterministic for the same product keys", () => {
    const a = stepOrbitalSystem(createOrbitalSystem(seeds), 12.5);
    const b = stepOrbitalSystem(createOrbitalSystem(seeds), 12.5);
    expect([...a]).toEqual([...b]);
  });

  it("precesses each ellipse slowly (not exactly periodic)", () => {
    const sys = createOrbitalSystem(seeds);
    const start = [...stepOrbitalSystem(sys, 0)];
    seeds.forEach((seed, i) => {
      const after = stepOrbitalSystem(sys, seed.periodSec);
      const a0 = Math.atan2(start[i * 3], start[i * 3 + 2]);
      const a1 = Math.atan2(after[i * 3], after[i * 3 + 2]);
      let drift = a1 - a0;
      while (drift > Math.PI) drift -= 2 * Math.PI;
      while (drift < -Math.PI) drift += 2 * Math.PI;
      expect(Math.abs(drift)).toBeGreaterThan(0.005);
      expect(Math.abs(drift)).toBeLessThan(0.6);
      expect(Math.abs(sys.prec[i])).toBeGreaterThan(0);
    });
  });
});

describe("moonAxialTilt", () => {
  it("is stable per key and stays a mild lean", () => {
    const a = moonAxialTilt("reiya");
    expect(moonAxialTilt("reiya")).toEqual(a);
    expect(Math.hypot(a.tiltX, a.tiltZ)).toBeGreaterThan(3);
    expect(Math.hypot(a.tiltX, a.tiltZ)).toBeLessThan(17);
    expect(moonAxialTilt("curio")).not.toEqual(a);
  });
});

describe("orbit rings", () => {
  it("keeps every moon on its circular ring over time", () => {
    const sys = createOrbitalSystem(seeds);
    for (let t = 0; t < 200; t += 11) {
      const pos = stepOrbitalSystem(sys, t);
      seeds.forEach((seed, i) => {
        const x = pos[i * 3];
        const h = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        expect(Math.hypot(x, h, z)).toBeCloseTo(seed.radius, 4);
        const { ex, ey } = orbitRingBasisCss(
          sys.sinNode[i],
          sys.cosNode[i],
          sys.sinI[i],
          sys.cosI[i]
        );
        const nx = ex[1] * ey[2] - ex[2] * ey[1];
        const ny = ex[2] * ey[0] - ex[0] * ey[2];
        const nz = ex[0] * ey[1] - ex[1] * ey[0];
        // CSS (x, -h, z) lies in the ring plane.
        expect(nx * x + ny * -h + nz * z).toBeCloseTo(0, 5);
      });
    }
  });

  it("maps the SVG +X seat onto the λ=0 Kepler seat", () => {
    const sys = createOrbitalSystem([
      { key: "ring-seat", radius: 240, startDeg: 0, periodSec: 40 },
    ]);
    const localR = 510;
    const matrix = orbitRingMatrix3d(
      sys.a[0],
      sys.sinNode[0],
      sys.cosNode[0],
      sys.sinI[0],
      sys.cosI[0],
      localR
    );
    const nums = matrix
      .slice("matrix3d(".length, -1)
      .split(",")
      .map(Number);
    const cssX = nums[0] * localR;
    const cssY = nums[1] * localR;
    const cssZ = nums[2] * localR;
    const { ex } = orbitRingBasisCss(
      sys.sinNode[0],
      sys.cosNode[0],
      sys.sinI[0],
      sys.cosI[0]
    );
    expect(cssX).toBeCloseTo(ex[0] * 240);
    expect(cssY).toBeCloseTo(ex[1] * 240);
    expect(cssZ).toBeCloseTo(ex[2] * 240);
  });

  it("punches a hole at each moon so the stroke cannot cross it", () => {
    const solid = orbitRingDash(1000, []);
    expect(solid.dasharray).toBe("1000");
    const gapped = orbitRingDash(1000, [{ angle: 0, half: Math.PI / 4 }]);
    const nums = gapped.dasharray.split(" ").map(Number);
    expect(nums[0]).toBe(0);
    expect(nums[1]).toBeCloseTo(125, 0);
    const covered = nums
      .filter((_, i) => i % 2 === 1)
      .reduce((s, n) => s + n, 0);
    expect(covered).toBeGreaterThan(200);
    expect(orbitRingGapHalf(40, 400)).toBeGreaterThan(0.08);
    expect(orbitRingGapHalf(40, 400)).toBeLessThan(0.2);
    const { ex, ey } = orbitRingBasisCss(0, 1, 0, 1);
    expect(orbitRingAngleCss(0, 0, 100, ex, ey)).toBeCloseTo(0);
  });
});

describe("orbitPlaneTilt", () => {
  it("gives each ring a mild shared tilt", () => {
    const sys = createOrbitalSystem([
      { key: "a", radius: 200, startDeg: 0, periodSec: 40 },
      { key: "b", radius: 200, startDeg: 90, periodSec: 40 },
      { key: "c", radius: 400, startDeg: 0, periodSec: 80 },
    ]);
    const innerA = orbitPlaneTilt(sys, 0);
    const innerB = orbitPlaneTilt(sys, 1);
    const outer = orbitPlaneTilt(sys, 2);
    expect(innerA).toEqual(innerB);
    expect(Math.abs(innerA.inclDeg)).toBeGreaterThan(6);
    expect(Math.abs(innerA.inclDeg)).toBeLessThan(22);
    expect(outer.inclDeg).not.toBeCloseTo(innerA.inclDeg);
  });
});

describe("sphereShade", () => {
  it("shows the night side when a moon passes in front of the sun", () => {
    const out: SphereShadeOut = { litX: 0, litY: 0, shade: 0 };
    sphereShade(0, 0, 100, out);
    expect(out.shade).toBeCloseTo(1);
    sphereShade(0, 0, -100, out);
    expect(out.shade).toBeCloseTo(0);
  });

  it("puts the highlight on the side facing the sun", () => {
    const out: SphereShadeOut = { litX: 0, litY: 0, shade: 0 };
    sphereShade(100, 0, 0, out);
    expect(out.litX).toBeLessThan(50);
    sphereShade(-100, 0, 0, out);
    expect(out.litX).toBeGreaterThan(50);
  });

  it("lights a moon above the plane from below (CSS y grows downward)", () => {
    const out: SphereShadeOut = { litX: 0, litY: 0, shade: 0 };
    sphereShade(0, 100, 0, out);
    expect(out.litY).toBeGreaterThan(50);
    sphereShade(0, -100, 0, out);
    expect(out.litY).toBeLessThan(50);
  });
});
