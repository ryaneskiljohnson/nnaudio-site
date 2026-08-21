import { describe, it, expect } from "vitest";
import {
  CREDIT_MS,
  CREDIT_TRAVEL_MS,
  SUN_FOCUS_KEY,
  SUN_YAW_DEG_PER_SEC,
  TOUR_INTRO_MS,
  TOUR_OUTRO_MS,
  creditHoldMs,
  aimYawAt,
  cameraTour,
  closeupMagnification,
  lookAtMoon,
  holdFrameOffset,
  cymasynthOrbit,
  sunScaleFromCamera,
  moonDepth,
  moonDiameter,
  moonPlacements,
  moonTheta,
  orbitRadiusPx,
  orderCredits,
  pickVisibleMoons,
  tourDurationMs,
  type TourCamera,
} from "@/utils/circuit-network-layout";

/**
 * @brief Applies the scene's CSS rotation order to a world moon.
 * @param x World x (screen right).
 * @param height World height (up).
 * @param z World z (toward the camera).
 * @param cam Camera pose.
 * @returns View-space (x, y) after rotateZ → rotateY → rotateX + translate.
 * A centered product is (0, 0).
 */
function projectThroughCamera(
  x: number,
  height: number,
  z: number,
  cam: Pick<
    TourCamera,
    "rotateX" | "rotateY" | "rotateZ" | "translateX" | "translateY"
  >
): { x: number; y: number } {
  const rz = (cam.rotateZ * Math.PI) / 180;
  const ry = (cam.rotateY * Math.PI) / 180;
  const rx = (cam.rotateX * Math.PI) / 180;
  let px = x;
  let py = -height;
  let pz = z;
  const x1 = px * Math.cos(rz) - py * Math.sin(rz);
  const y1 = px * Math.sin(rz) + py * Math.cos(rz);
  px = x1 * Math.cos(ry) + pz * Math.sin(ry);
  py = y1;
  pz = -x1 * Math.sin(ry) + pz * Math.cos(ry);
  const y2 = py * Math.cos(rx) - pz * Math.sin(rx);
  return { x: px + cam.translateX, y: y2 + cam.translateY };
}

/**
 * @brief How far the camera moved between two poses.
 * @param a First pose.
 * @param b Second pose.
 * @returns Combined rotation (deg) plus truck/dolly (px).
 */
function poseTravel(a: TourCamera, b: TourCamera): number {
  return (
    Math.abs(a.rotateX - b.rotateX) +
    Math.abs(a.rotateY - b.rotateY) +
    Math.hypot(
      a.translateX - b.translateX,
      a.translateY - b.translateY,
      a.translateZ - b.translateZ
    )
  );
}

describe("holdFrameOffset", () => {
  it("is stable per key and can sit left or right of the sun", () => {
    expect(holdFrameOffset("reiya")).toEqual(holdFrameOffset("reiya"));
    const signs = ["reiya", "curio", "x", "synth", "pack"].map(
      (key) => Math.sign(holdFrameOffset(key).x)
    );
    expect(new Set(signs).size).toBeGreaterThan(1);
    expect(holdFrameOffset("reiya").y).toBeLessThan(40);
  });
});

describe("moonPlacements", () => {
  it.each([0, 1, 8, 22, 44, 70, 80] as const)(
    "assigns every product an orbit: count=%s",
    (count) => {
      const moons = moonPlacements(count, false);
      expect(moons).toHaveLength(count);
      const indexes = moons.map((m) => m.index).sort((a, b) => a - b);
      expect(indexes).toEqual([...Array(count).keys()]);
    }
  );

  it("puts inner rings closer and faster than outer rings", () => {
    const moons = moonPlacements(70, false);
    const inner = moons.filter((m) => m.ring === 0);
    const outer = moons.filter((m) => m.ring === Math.max(...moons.map((m) => m.ring)));
    expect(inner.length).toBeGreaterThan(0);
    expect(outer.length).toBeGreaterThan(0);
    expect(Math.max(...inner.map((m) => m.radius))).toBeLessThan(
      Math.min(...outer.map((m) => m.radius))
    );
    expect(inner[0].periodSec).toBeLessThan(outer[0].periodSec);
    moons.forEach((moon) => {
      expect(moon.size.w).toBe(moon.size.h);
    });
  });

  it("spaces a ring evenly around the planet", () => {
    const moons = moonPlacements(8, false).filter((m) => m.ring === 0);
    const step = 360 / moons.length;
    const offsets = moons
      .map((m) => m.startDeg)
      .sort((a, b) => a - b)
      .map((deg, i, all) =>
        i === 0 ? deg : deg - all[i - 1]
      );
    offsets.slice(1).forEach((gap) => {
      expect(gap).toBeCloseTo(step, 5);
    });
  });

  it("casts moons at various sizes", () => {
    const moons = moonPlacements(70, false);
    const sizes = moons.map((m) => m.size.w);
    expect(new Set(sizes).size).toBeGreaterThan(6);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeGreaterThan(40);
    expect(moonDiameter(0, 0, false)).not.toBe(moonDiameter(7, 0, false));
  });
});

describe("cymasynthOrbit", () => {
  it("sits closer than the first catalog ring", () => {
    const synth = cymasynthOrbit(false);
    const inner = moonPlacements(8, false)[0];
    expect(synth.radius).toBeLessThan(inner.radius);
    expect(synth.size.w).toBeGreaterThan(inner.size.w);
    expect(synth.size.w).toBe(synth.size.h);
  });

  it("clears the sun disk so a trip to the first moon shrinks Cymasphere", () => {
    const synth = cymasynthOrbit(false);
    expect(synth.radius).toBeGreaterThan(1.15);
    expect(moonPlacements(8, false)[0].radius).toBeGreaterThan(synth.radius + 0.7);
  });
});

describe("sunScaleFromCamera", () => {
  it("shrinks the sun as the camera leaves Cymasphere", () => {
    expect(sunScaleFromCamera(20)).toBeGreaterThan(1.4);
    expect(sunScaleFromCamera(-2000)).toBeLessThan(0.45);
    expect(sunScaleFromCamera(-6000)).toBeLessThan(sunScaleFromCamera(-2000));
  });
});

describe("orbitRadiusPx", () => {
  it("grows with the board so moons use the section", () => {
    expect(orbitRadiusPx(0.86, 1800, 800)).toBeGreaterThan(
      orbitRadiusPx(0.86, 1100, 600)
    );
  });
});

describe("moonDepth", () => {
  it("is closest when the moon is toward the camera", () => {
    expect(moonDepth(0)).toBeCloseTo(1);
    expect(moonDepth(Math.PI)).toBeCloseTo(0);
    expect(moonDepth(Math.PI / 2)).toBeCloseTo(0.5);
  });

  it("advances with elapsed time", () => {
    const a = moonTheta(0, 10, 0);
    const b = moonTheta(0, 10, 2500);
    expect(b - a).toBeCloseTo(Math.PI / 2);
  });
});

describe("cameraTour", () => {
  it("starts far from the sun and flies in", () => {
    const far = cameraTour(0, false);
    const close = cameraTour(8000, false);
    expect(far.translateZ).toBeLessThan(-800);
    expect(close.translateZ).toBeGreaterThan(far.translateZ);
    expect(close.sunScale).toBeGreaterThan(far.sunScale);
  });

  it("holds a beauty shot when motion is reduced", () => {
    expect(cameraTour(0, true).labelOpacity).toBe(1);
    expect(cameraTour(0, true).translateZ).toBe(-20);
    expect(cameraTour(0, true).focusKey).toBeNull();
  });

  it("holds on each product like show credits", () => {
    const credits = orderCredits([
      {
        key: "small",
        name: "Small",
        startDeg: 0,
        periodSec: 40,
        radius: 0.8,
        size: 28,
      },
      {
        key: "lead",
        name: "Lead",
        startDeg: 90,
        periodSec: 24,
        radius: 0.2,
        size: 110,
      },
    ]);
    expect(credits.map((c) => c.key)).toEqual(["lead", "small"]);
    expect(tourDurationMs(2)).toBe(TOUR_INTRO_MS + CREDIT_MS * 2 + TOUR_OUTRO_MS);

    const intro = cameraTour(200, false, credits);
    expect(intro.focusKey).toBeNull();
    expect(intro.translateZ).toBeLessThan(-400);

    const first = cameraTour(TOUR_INTRO_MS + 400, false, credits);
    expect(first.focusKey).toBe("lead");
    expect(first.creditOpacity).toBeGreaterThan(0.5);

    const second = cameraTour(TOUR_INTRO_MS + CREDIT_MS + 400, false, credits);
    expect(second.focusKey).toBe("small");
  });

  it("holds Cymasphere 4× and CymaSynth 2× before the rest", () => {
    const credits = orderCredits([
      { key: "pack", name: "Pack", startDeg: 0, periodSec: 40, radius: 0.8, size: 80, weight: 1 },
      {
        key: "synth",
        name: "CymaSynth",
        startDeg: 90,
        periodSec: 24,
        radius: 0.2,
        size: 108,
        weight: 2,
      },
      {
        key: SUN_FOCUS_KEY,
        name: "Cymasphere",
        startDeg: 0,
        periodSec: 1,
        radius: 0,
        size: 0,
        sun: true,
        weight: 4,
      },
    ]);
    expect(credits.map((c) => c.key)).toEqual([SUN_FOCUS_KEY, "synth", "pack"]);
    expect(creditHoldMs(credits[0])).toBe(CREDIT_MS * 4);
    expect(creditHoldMs(credits[1])).toBe(CREDIT_MS * 2);
    expect(creditHoldMs(credits[2])).toBe(CREDIT_MS);
    expect(tourDurationMs(credits)).toBe(
      TOUR_INTRO_MS + CREDIT_MS * 7 + TOUR_OUTRO_MS
    );

    const sun = cameraTour(TOUR_INTRO_MS + 400, false, credits);
    expect(sun.focusKey).toBe(SUN_FOCUS_KEY);
    expect(sun.creditOpacity).toBeGreaterThan(0.5);
    const stillSun = cameraTour(TOUR_INTRO_MS + CREDIT_MS * 3, false, credits);
    expect(stillSun.focusKey).toBe(SUN_FOCUS_KEY);
    const synth = cameraTour(TOUR_INTRO_MS + CREDIT_MS * 4 + 400, false, credits);
    expect(synth.focusKey).toBe("synth");
    const pack = cameraTour(TOUR_INTRO_MS + CREDIT_MS * 6 + 400, false, credits);
    expect(pack.focusKey).toBe("pack");
  });

  it("keeps the credit card opacity continuous at every boundary", () => {
    const credits = orderCredits([
      { key: "a", name: "A", startDeg: 0, periodSec: 40, radius: 0.5, size: 40 },
      { key: "b", name: "B", startDeg: 90, periodSec: 24, radius: 0.2, size: 110 },
      { key: "c", name: "C", startDeg: 180, periodSec: 60, radius: 0.8, size: 28 },
    ]);
    const boundaries = [
      TOUR_INTRO_MS,
      TOUR_INTRO_MS + CREDIT_MS,
      TOUR_INTRO_MS + 2 * CREDIT_MS,
      TOUR_INTRO_MS + 3 * CREDIT_MS,
    ];
    boundaries.forEach((boundary) => {
      const before = cameraTour(boundary - 1, false, credits).creditOpacity;
      const after = cameraTour(boundary + 1, false, credits).creditOpacity;
      expect(Math.abs(after - before)).toBeLessThan(0.05);
    });
  });

  it("dollies in much closer for small moons than big ones", () => {
    const closeup = (size: number) =>
      cameraTour(TOUR_INTRO_MS + CREDIT_MS / 2, false, [
        {
          key: "x",
          name: "X",
          startDeg: 0,
          periodSec: 40,
          radius: 0.5,
          radiusPx: 300,
          size,
        },
      ]);
    const small = closeup(28);
    const large = closeup(120);
    expect(small.translateZ).toBeGreaterThan(large.translateZ + 150);
    // Both are genuine close-ups: far beyond the old ~150px push-in.
    expect(large.translateZ).toBeGreaterThan(-50);
    expect(small.focusKey).toBe("x");
  });

  it("aims the hold at the live moon, not a flat circular seat", () => {
    const world = new Map([
      ["x", { x: 400, height: 80, z: 0 }],
    ]);
    const cam = cameraTour(
      TOUR_INTRO_MS + CREDIT_MS / 2,
      false,
      [
        {
          key: "x",
          name: "X",
          startDeg: 0,
          periodSec: 40,
          radius: 0.5,
          radiusPx: 300,
          size: 80,
        },
      ],
      world
    );
    const elapsed = TOUR_INTRO_MS + CREDIT_MS / 2;
    const frame = holdFrameOffset("x");
    const aimed = lookAtMoon(400, 80, 0, 80, elapsed, frame.x, frame.y);
    expect(cam.rotateY).toBeCloseTo(aimed.rotateY, 5);
    expect(cam.rotateX).toBeCloseTo(aimed.rotateX, 5);
    expect(cam.rotateZ).toBe(0);
    expect(cam.translateX).toBeCloseTo(aimed.translateX, 5);
    expect(cam.translateY).toBeCloseTo(aimed.translateY, 5);
    // With the eclipse offset zeroed, the yaw is a pure look-at.
    expect(aimYawAt(400, 0).rotateY).toBeCloseTo(
      lookAtMoon(400, 80, 0, 80, 0, 0, 0).rotateY,
      5
    );
  });

  it("frames an inclined moon at the eclipse offset, off the sun", () => {
    const x = 240;
    const height = 110;
    const z = -180;
    const cam = cameraTour(
      TOUR_INTRO_MS + CREDIT_MS / 2,
      false,
      [
        {
          key: "x",
          name: "X",
          startDeg: 90,
          periodSec: 40,
          radius: 1,
          radiusPx: 500,
          size: 64,
        },
      ],
      new Map([["x", { x, height, z }]])
    );
    // The moon is pinned off frame center; the sun (origin) projects to
    // translate(X, Y), which only sways by the small inspection truck.
    // Together the planet no longer eclipses Cymasphere.
    const mag = closeupMagnification(64);
    const frame = holdFrameOffset("x");
    const onScreen = projectThroughCamera(x, height, z, cam);
    expect(onScreen.x).toBeCloseTo(frame.x / mag, 3);
    // Inspection truck adds a few px of pitch sway; stay off the sun.
    expect(Math.abs(onScreen.y - frame.y / mag)).toBeLessThan(3);
    expect(Math.abs(cam.translateX)).toBeLessThan(20);
  });

  it("makes the sun smaller when holding a distant moon than the sun itself", () => {
    const sunHold = cameraTour(TOUR_INTRO_MS + 400, false, [
      {
        key: SUN_FOCUS_KEY,
        name: "Cymasphere",
        startDeg: 0,
        periodSec: 1,
        radius: 0,
        size: 0,
        sun: true,
        weight: 4,
      },
    ]);
    const farHold = cameraTour(TOUR_INTRO_MS + 400, false, [
      {
        key: "outer",
        name: "Outer",
        startDeg: 0,
        periodSec: 80,
        radius: 15,
        radiusPx: 4200,
        size: 48,
      },
    ]);
    expect(farHold.sunScale).toBeLessThan(sunHold.sunScale * 0.5);
    expect(farHold.translateZ).toBeLessThan(sunHold.translateZ - 2000);
  });

  it("pulls out mid-journey so hops read as travel", () => {
    const credits = orderCredits([
      {
        key: "a",
        name: "A",
        startDeg: 0,
        periodSec: 60,
        radius: 0.5,
        radiusPx: 300,
        size: 40,
      },
      {
        key: "b",
        name: "B",
        startDeg: 140,
        periodSec: 90,
        radius: 1.2,
        radiusPx: 600,
        size: 110,
      },
    ]);
    const holdA = cameraTour(TOUR_INTRO_MS + 500, false, credits).translateZ;
    const mid = cameraTour(
      TOUR_INTRO_MS + CREDIT_MS - CREDIT_TRAVEL_MS / 2,
      false,
      credits
    ).translateZ;
    const holdB = cameraTour(
      TOUR_INTRO_MS + CREDIT_MS + 500,
      false,
      credits
    ).translateZ;
    expect(mid).toBeLessThan(Math.min(holdA, holdB) - 80);
  });

  it("sweeps continuously from one product to the next, no cut", () => {
    const world = new Map([
      ["a", { x: 300, height: 40, z: 80 }],
      ["b", { x: -200, height: -30, z: 420 }],
    ]);
    const credits = [
      {
        key: "a",
        name: "A",
        startDeg: 0,
        periodSec: 60,
        radius: 0.5,
        radiusPx: 300,
        size: 40,
      },
      {
        key: "b",
        name: "B",
        startDeg: 140,
        periodSec: 90,
        radius: 1.2,
        radiusPx: 600,
        size: 110,
      },
    ];
    const yawGap = (a: number, b: number) =>
      Math.abs(((((b - a) % 360) + 540) % 360) - 180);
    // No yaw jump anywhere across hold → travel → next hold.
    for (
      let t = TOUR_INTRO_MS + CREDIT_MS - CREDIT_TRAVEL_MS - 200;
      t < TOUR_INTRO_MS + CREDIT_MS + 200;
      t += 40
    ) {
      const a = cameraTour(t, false, credits, world);
      const b = cameraTour(t + 40, false, credits, world);
      expect(yawGap(a.rotateY, b.rotateY)).toBeLessThan(9);
    }
    // Mid-travel the aim is genuinely between the two stops: the
    // outgoing planet has already left its held framing.
    const mid = cameraTour(
      TOUR_INTRO_MS + CREDIT_MS - CREDIT_TRAVEL_MS / 2,
      false,
      credits,
      world
    );
    const holdA = cameraTour(TOUR_INTRO_MS + 200, false, credits, world);
    const holdB = cameraTour(
      TOUR_INTRO_MS + CREDIT_MS + 200,
      false,
      credits,
      world
    );
    const total = yawGap(holdA.rotateY, holdB.rotateY);
    expect(yawGap(holdA.rotateY, mid.rotateY)).toBeGreaterThan(total * 0.1);
    expect(yawGap(mid.rotateY, holdB.rotateY)).toBeGreaterThan(total * 0.1);
    expect(yawGap(holdA.rotateY, mid.rotateY)).toBeLessThan(total);
    const off = Math.abs(holdFrameOffset("a").x) / closeupMagnification(40);
    const aMid = projectThroughCamera(300, 40, 80, mid);
    expect(Math.abs(Math.abs(aMid.x) - off)).toBeGreaterThan(10);
  });

  it("keeps creeping during a focus instead of parking", () => {
    const world = new Map([["x", { x: 400, height: 80, z: 0 }]]);
    const credits = [
      {
        key: "x",
        name: "X",
        startDeg: 0,
        periodSec: 40,
        radius: 0.5,
        radiusPx: 300,
        size: 80,
      },
    ];
    const t0 = TOUR_INTRO_MS + 400;
    const a = cameraTour(t0, false, credits, world);
    const b = cameraTour(t0 + 200, false, credits, world);
    expect(a.focusKey).toBe("x");
    expect(poseTravel(a, b)).toBeGreaterThan(0.2);
    // The framing offset holds steady while the camera creeps.
    const off = holdFrameOffset("x").x / closeupMagnification(80);
    const onA = projectThroughCamera(400, 80, 0, a);
    const onB = projectThroughCamera(400, 80, 0, b);
    expect(onA.x).toBeCloseTo(off, 3);
    expect(onB.x).toBeCloseTo(off, 3);
  });

  it("moves faster between products than while reading one", () => {
    const world = new Map([
      ["a", { x: 300, height: 40, z: 80 }],
      ["b", { x: -200, height: -30, z: 420 }],
    ]);
    const credits = [
      {
        key: "a",
        name: "A",
        startDeg: 0,
        periodSec: 60,
        radius: 0.5,
        radiusPx: 300,
        size: 40,
      },
      {
        key: "b",
        name: "B",
        startDeg: 140,
        periodSec: 90,
        radius: 1.2,
        radiusPx: 600,
        size: 110,
      },
    ];
    const holdT = TOUR_INTRO_MS + 500;
    const travelT = TOUR_INTRO_MS + CREDIT_MS - CREDIT_TRAVEL_MS * 0.75;
    const holdMove = poseTravel(
      cameraTour(holdT, false, credits, world),
      cameraTour(holdT + 160, false, credits, world)
    );
    const travelMove = poseTravel(
      cameraTour(travelT, false, credits, world),
      cameraTour(travelT + 160, false, credits, world)
    );
    expect(travelMove).toBeGreaterThan(holdMove * 1.6);
  });

  it("keeps the sun turning instead of rocking to a stop", () => {
    const credits = [
      {
        key: SUN_FOCUS_KEY,
        name: "Cymasphere",
        startDeg: 0,
        periodSec: 1,
        radius: 0,
        size: 0,
        sun: true,
        weight: 4,
      },
    ];
    const t0 = TOUR_INTRO_MS + 400;
    const a = cameraTour(t0, false, credits);
    const b = cameraTour(t0 + 200, false, credits);
    expect(b.rotateY).toBeGreaterThan(a.rotateY);
    expect(b.rotateY - a.rotateY).toBeCloseTo(SUN_YAW_DEG_PER_SEC * 0.2, 5);
  });

  it("drops focus and hides the card during the outro", () => {
    const credits = orderCredits([
      { key: "solo", name: "Solo", startDeg: 0, periodSec: 40, radius: 0.5, size: 40 },
    ]);
    const outro = cameraTour(TOUR_INTRO_MS + CREDIT_MS + 900, false, credits);
    expect(outro.focusKey).toBeNull();
    expect(outro.nextKey).toBeNull();
    expect(outro.creditOpacity).toBe(0);
  });

  it("names the next credit during the intro and each hold", () => {
    const credits = orderCredits([
      { key: "a", name: "A", startDeg: 0, periodSec: 40, radius: 0.5, size: 40 },
      { key: "b", name: "B", startDeg: 90, periodSec: 24, radius: 0.2, size: 110 },
    ]);
    expect(cameraTour(200, false, credits).nextKey).toBe(credits[0].key);
    const first = cameraTour(TOUR_INTRO_MS + 400, false, credits);
    expect(first.focusKey).toBe(credits[0].key);
    expect(first.nextKey).toBe(credits[1].key);
  });
});

describe("pickVisibleMoons", () => {
  const pack = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      key: `m${i}`,
      camSpaceX: (i - count / 2) * 80,
      camSpaceZ: 40 - i * 12,
      aPx: 280,
    }));

  it("caps the stage to a handful", () => {
    const keys = pickVisibleMoons(pack(40), {
      focusKey: null,
      nextKey: null,
      sunFocus: false,
      dollyZ: 0,
      viewHalfW: 600,
      budget: 8,
    });
    expect(keys.length).toBeLessThanOrEqual(8);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("always keeps the focused moon and the next credit", () => {
    const moons = pack(20);
    moons[18] = { key: "focus", camSpaceX: 900, camSpaceZ: -200, aPx: 400 };
    moons[19] = { key: "next", camSpaceX: -800, camSpaceZ: -180, aPx: 500 };
    const keys = pickVisibleMoons(moons, {
      focusKey: "focus",
      nextKey: "next",
      sunFocus: false,
      dollyZ: 0,
      viewHalfW: 600,
      budget: 6,
    });
    expect(keys).toContain("focus");
    expect(keys).toContain("next");
    expect(keys.length).toBeLessThanOrEqual(6);
  });

  it("keeps the stage empty during the sun hold so disks cannot silhouette", () => {
    const keys = pickVisibleMoons(
      [
        { key: "front", camSpaceX: 0, camSpaceZ: 120, aPx: 200 },
        { key: "back", camSpaceX: 40, camSpaceZ: -180, aPx: 260 },
        { key: "next", camSpaceX: 80, camSpaceZ: -90, aPx: 220 },
      ],
      {
        focusKey: null,
        nextKey: "next",
        sunFocus: true,
        dollyZ: 20,
        viewHalfW: 600,
        budget: 4,
      }
    );
    expect(keys).toEqual([]);
  });
});
