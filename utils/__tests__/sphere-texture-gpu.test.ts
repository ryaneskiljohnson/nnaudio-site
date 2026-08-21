/**
 * @fileoverview CI coverage for the GPU drawImage warp path. The pure
 * geometry tables are covered in sphere-texture.test.ts; this file
 * exercises the actual composition (v-warp pre-bake, phase-wrapped
 * slices, chord bands, rim mask) by polyfilling the DOM canvas with the
 * node `canvas` package and diffing against the per-pixel CPU reference.
 * Kept separate so the DOM polyfill never leaks into the pure tests.
 * @module utils/__tests__/sphere-texture-gpu.test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCanvas, ImageData as NodeImageData } from "canvas";
import {
  bakeSphereStripFromPixels,
  getWarpLUT,
  warpStripToCanvas,
  warpStripToCanvasGpu,
} from "@/utils/sphere-texture";

const SIZE = 96;

beforeAll(() => {
  (globalThis as { document?: unknown }).document = {
    createElement: () => createCanvas(2, 2),
  };
  (globalThis as { ImageData?: unknown }).ImageData = NodeImageData;
});

afterAll(() => {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { ImageData?: unknown }).ImageData;
});

/**
 * @brief Gradient + checker source so both hue drift and edge frequency
 * survive a warp comparison.
 * @returns RGBA pixels, SIZE × SIZE.
 */
function checkerSource(): Uint8ClampedArray {
  const src = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4;
      src[i] = Math.round((x / SIZE) * 255);
      src[i + 1] = Math.round((y / SIZE) * 255);
      src[i + 2] = ((((x / 8) | 0) + ((y / 8) | 0)) % 2) * 255;
      src[i + 3] = 255;
    }
  }
  return src;
}

/**
 * @brief Counts checker edges along the equator row — a proxy for limb
 * compression (a flat scroll would change the frequency profile).
 * @param data Canvas RGBA pixels.
 * @returns Blue-channel flip count across the middle row.
 */
function equatorFlips(data: Uint8ClampedArray): number {
  const mid = (SIZE / 2) | 0;
  let flips = 0;
  for (let x = 4; x < SIZE - 5; x += 1) {
    const a = data[(mid * SIZE + x) * 4 + 2] > 127;
    const b = data[(mid * SIZE + x + 1) * 4 + 2] > 127;
    if (a !== b) flips += 1;
  }
  return flips;
}

describe("warpStripToCanvasGpu vs CPU reference", () => {
  const tex = bakeSphereStripFromPixels(checkerSource(), SIZE);

  it.each([0, 0.13, 0.37, 0.5] as const)(
    "matches the per-pixel warp at phase %s",
    (phase) => {
      const cpu = createCanvas(SIZE, SIZE);
      const gpu = createCanvas(SIZE, SIZE);
      warpStripToCanvas(
        tex,
        getWarpLUT(SIZE),
        phase,
        cpu as unknown as HTMLCanvasElement,
        "bilinear"
      );
      const ok = warpStripToCanvasGpu(
        tex,
        phase,
        gpu as unknown as HTMLCanvasElement
      );
      expect(ok).toBe(true);

      const d1 = cpu.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
      const d2 = gpu.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
      let sum = 0;
      let n = 0;
      let blank = 0;
      for (let p = 0; p < SIZE * SIZE; p += 1) {
        const i = p * 4;
        if (d1[i + 3] < 200) continue; // solid interior only
        n += 1;
        if (d2[i + 3] < 100) blank += 1;
        for (let c = 0; c < 3; c += 1) {
          sum += Math.abs(d1[i + c] - d2[i + c]);
        }
      }
      expect(n).toBeGreaterThan(SIZE * SIZE * 0.5);
      expect(blank).toBe(0);
      expect(sum / (n * 3)).toBeLessThan(8);
      // Limb compression intact: same checker frequency at the equator.
      expect(Math.abs(equatorFlips(d1) - equatorFlips(d2))).toBeLessThanOrEqual(
        2
      );
    }
  );
});
