/**
 * @fileoverview CSS perspective → Three.js camera mapping.
 * @module utils/__tests__/tour-camera-rig.test
 */

import { describe, expect, it } from "vitest";
import {
  TOUR_OPENING_TRANSLATE_Z,
  TOUR_PERSPECTIVE_PX,
  lookAtMoon,
} from "@/utils/circuit-network-layout";
import {
  composeCssTourMatrix,
  cssMatrixToYUp,
  cssPerspectiveFovDeg,
  keplerToThree,
  multiplyMat4,
  projectKeplerToBoard,
  transformCssPoint,
} from "@/components/hero-gl/tourCameraRig";

describe("cssPerspectiveFovDeg", () => {
  it("matches 2*atan((H/2)/P)", () => {
    const h = 800;
    const expected =
      (2 * Math.atan(h / 2 / TOUR_PERSPECTIVE_PX) * 180) / Math.PI;
    expect(cssPerspectiveFovDeg(h)).toBeCloseTo(expected, 8);
  });

  it("uses CSS height, not the drawing buffer", () => {
    expect(cssPerspectiveFovDeg(2160)).toBeGreaterThan(
      cssPerspectiveFovDeg(1080)
    );
  });
});

describe("composeCssTourMatrix", () => {
  it("is identity at a zero pose", () => {
    const m = composeCssTourMatrix({
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
    });
    expect(Array.from(m)).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  });

  it("applies opening dolly as a Z translate", () => {
    const m = composeCssTourMatrix({
      translateX: 0,
      translateY: 0,
      translateZ: TOUR_OPENING_TRANSLATE_Z,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
    });
    const p = transformCssPoint(m, 0, 0, 0);
    expect(p.z).toBeCloseTo(TOUR_OPENING_TRANSLATE_Z, 6);
  });

  it("rotateY(+90) sends +X toward +Z (CSS right edge comes forward)", () => {
    const m = composeCssTourMatrix({
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotateX: 0,
      rotateY: 90,
      rotateZ: 0,
    });
    const p = transformCssPoint(m, 1, 0, 0);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(1, 6);
  });
});

describe("cssMatrixToYUp", () => {
  it("flips CSS Y so Kepler height is Three +Y", () => {
    const css = composeCssTourMatrix({
      translateX: 0,
      translateY: 40,
      translateZ: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
    });
    const yUp = cssMatrixToYUp(css);
    // CSS +Y (down) becomes Three −Y.
    expect(yUp[13]).toBeCloseTo(-40, 6);
  });

  it("F·F is identity", () => {
    const flip = new Float64Array([
      1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    const id = multiplyMat4(flip, flip);
    expect(id[0]).toBe(1);
    expect(id[5]).toBe(1);
    expect(id[10]).toBe(1);
  });
});

describe("keplerToThree", () => {
  it("keeps height as +Y", () => {
    expect(keplerToThree(10, 20, 30)).toEqual({ x: 10, y: 20, z: 30 });
  });
});

describe("projectKeplerToBoard", () => {
  it("puts a lookAtMoon target near the frame center when eclipse is 0", () => {
    const pose = lookAtMoon(400, 0, 0, 64, 0, 0, 0);
    const hit = projectKeplerToBoard(pose, 1200, 800, 400, 0, 0);
    expect(hit.x).toBeCloseTo(600, 0);
    expect(hit.y).toBeCloseTo(400, 0);
  });

  it("keeps the sun at center for a pure Z dolly", () => {
    const hit = projectKeplerToBoard(
      {
        translateX: 0,
        translateY: 0,
        translateZ: -200,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
      },
      1200,
      800,
      0,
      0,
      0
    );
    expect(hit.x).toBeCloseTo(600, 5);
    expect(hit.y).toBeCloseTo(400, 5);
  });
});
