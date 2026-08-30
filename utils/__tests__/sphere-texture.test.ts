import { describe, afterEach, expect, it } from "vitest";
import { CREDIT_MS, CREDIT_TRAVEL_MS } from "@/utils/circuit-network-layout";
import {
  bakeSphereStripFromPixels,
  faceOnAlign,
  getWarpLUT,
  lookupSphereTexture,
  moonSpinPhase,
  releaseAllSphereTextureResources,
  resolveWarpLUT,
  resolvedSphereTexture,
  seedSphereTextureCacheEntry,
  stripSeamBlend,
  stripUFrac,
  stripV,
  trimSphereTextureCache,
  warpBandRanges,
  warpDensityForSize,
  warpSliceRanges,
} from "@/utils/sphere-texture";

/** 1×1 PNG for cache tests. */
const TEST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("moonSpinPhase", () => {
  it("keeps the day-length spin even while a product is featured", () => {
    expect(moonSpinPhase(15000, 60, false, true, 0)).toBeCloseTo(0.25);
    expect(moonSpinPhase(30000, 60, false, true, 0)).toBeCloseTo(0.5);
  });

  it("adds the turntable boost on top of the day spin", () => {
    expect(moonSpinPhase(15000, 60, false, true, 0.2)).toBeCloseTo(0.45);
  });

  it("keeps the turntable offset after a hold so zooms do not snap", () => {
    expect(moonSpinPhase(15000, 60, false, false, 0.9)).toBeCloseTo(0.15);
    expect(moonSpinPhase(15000, 60, true, false, 0)).toBeCloseTo(0.75);
  });

  it("can zero the wrap so a hold starts with the artwork facing the camera", () => {
    const align = faceOnAlign(18000, 48, true);
    expect(moonSpinPhase(18000, 48, true, false, 0, align)).toBeCloseTo(0);
    const later = moonSpinPhase(21400, 48, true, true, 0, align);
    const turned = Math.min(later, 1 - later);
    expect(turned).toBeGreaterThan(0.05);
    expect(turned).toBeLessThan(0.12);
  });

  it("starts a hold face-on, then turns enough for the limb to read", () => {
    const daySec = 48;
    const lockMs = CREDIT_MS - CREDIT_TRAVEL_MS;
    const turntableMs = 22000;
    const t0 = 12000;
    const align = faceOnAlign(t0, daySec, false);
    const start = moonSpinPhase(t0, daySec, false, true, 0, align);
    const end = moonSpinPhase(
      t0 + lockMs,
      daySec,
      false,
      true,
      lockMs / turntableMs,
      align
    );
    expect(start).toBeCloseTo(0);
    const turned = Math.min(Math.abs(end - start), 1 - Math.abs(end - start));
    expect(turned).toBeGreaterThan(0.08);
  });

  it("turns a visible but stately amount during a catalog credit hold", () => {
    // ~48s day (the middle of the 40–64s ambient range): a hold should
    // show clear rotation without racing.
    const a = moonSpinPhase(0, 48, false, false, 0);
    const b = moonSpinPhase(3400, 48, false, false, 0);
    const raw = Math.abs(b - a);
    const turned = Math.min(raw, 1 - raw);
    expect(turned).toBeGreaterThan(0.05);
    expect(turned).toBeLessThan(0.12);
  });
});

describe("warpDensityForSize", () => {
  it("keeps facets around 3–4 px and grows with the bake", () => {
    const small = warpDensityForSize(640);
    const retina = warpDensityForSize(1280);
    expect(small.slices).toBeGreaterThanOrEqual(96);
    expect(small.bands).toBeGreaterThanOrEqual(64);
    expect(retina.slices).toBeGreaterThan(small.slices);
    expect(retina.bands).toBeGreaterThan(small.bands);
    expect(1280 / retina.slices).toBeLessThanOrEqual(4);
    expect(1280 / retina.bands).toBeLessThanOrEqual(5);
  });
});

describe("warpSliceRanges", () => {
  it("covers exactly the visible hemisphere, in order", () => {
    const slices = warpSliceRanges(128);
    expect(slices[0].su0).toBeCloseTo(0.25, 6);
    expect(slices[slices.length - 1].su1).toBeCloseTo(0.75, 6);
    for (let i = 1; i < slices.length; i += 1) {
      expect(slices[i].su0).toBeCloseTo(slices[i - 1].su1, 6);
      expect(slices[i].dx0).toBeCloseTo(slices[i - 1].dx1, 6);
    }
    expect(slices[0].dx0).toBe(0);
    expect(slices[slices.length - 1].dx1).toBeCloseTo(1, 6);
  });

  it("matches the exact sine map at every slice boundary", () => {
    // Slice edges must agree with the per-pixel warp: at disk position nx
    // the longitude is asin(nx), i.e. u = 0.5 + asin(nx) / 2π.
    warpSliceRanges(64).forEach((s) => {
      const nx = s.dx0 * 2 - 1;
      expect(s.su0).toBeCloseTo(0.5 + Math.asin(nx) / (2 * Math.PI), 6);
    });
  });

  it("compresses more longitude into the limb than the center", () => {
    const slices = warpSliceRanges(128);
    const limb = slices[0].su1 - slices[0].su0;
    const mid = slices[64].su1 - slices[64].su0;
    expect(limb).toBeGreaterThan(mid * 3);
  });
});

describe("warpBandRanges", () => {
  it("tiles the disk height and peaks at the equator", () => {
    const bands = warpBandRanges(64);
    expect(bands[0].y0).toBe(0);
    expect(bands[bands.length - 1].y1).toBeCloseTo(1, 6);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i].y0).toBeCloseTo(bands[i - 1].y1, 6);
    }
    const chords = bands.map((b) => b.chord);
    const peak = Math.max(...chords);
    expect(chords[31]).toBeCloseTo(peak, 3);
    expect(chords[0]).toBeLessThan(0.3);
    // Symmetric: same chord mirrored about the equator.
    expect(chords[0]).toBeCloseTo(chords[chords.length - 1], 6);
  });

  it("matches the exact circle chord at each band middle", () => {
    warpBandRanges(48).forEach((b) => {
      const ny = b.y0 + b.y1 - 1;
      expect(b.chord).toBeCloseTo(Math.sqrt(Math.max(0, 1 - ny * ny)), 6);
    });
  });
});

describe("getWarpLUT", () => {
  it("centers the artwork on the face with the seam behind the sphere", () => {
    const lut = getWarpLUT(16);
    const center = 8 * 16 + 8;
    expect(lut.uFrac[center]).toBeGreaterThan(0.49);
    expect(lut.uFrac[center]).toBeLessThan(0.56);
    expect(lut.alpha[center]).toBe(255);
    expect(lut.rowBase[center]).toBeGreaterThanOrEqual(0);
  });

  it("marks pixels outside the disk", () => {
    const lut = getWarpLUT(16);
    expect(lut.rowBase[0]).toBe(-1);
    expect(lut.alpha[0]).toBe(0);
  });

  it("fades the rim alpha for a soft limb", () => {
    const lut = getWarpLUT(64);
    const midRow = 32 * 64;
    expect(lut.alpha[midRow + 32]).toBe(255);
    expect(lut.alpha[midRow + 63]).toBeLessThan(40);
  });

  it("lists only in-disk pixels for the warp loop", () => {
    const lut = getWarpLUT(16);
    expect(lut.inside.length).toBeGreaterThan(16 * 16 * 0.6);
    expect(lut.inside.length).toBeLessThan(16 * 16);
    expect(lut.inside).toContain(8 * 16 + 8);
    expect(lut.inside).not.toContain(0);
  });
});

describe("bakeSphereStripFromPixels", () => {
  // 12×12 magenta source with a green square in the middle.
  const size = 12;
  const src = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const green = x >= 4 && x <= 7 && y >= 4 && y <= 7;
      src[i] = green ? 0 : 255;
      src[i + 1] = green ? 255 : 0;
      src[i + 2] = green ? 0 : 255;
      src[i + 3] = 255;
    }
  }
  const tex = bakeSphereStripFromPixels(src, size);
  const at = (x: number) => (6 * tex.strip.width + x) * 4;

  it("keeps a 360° strip so both hemispheres can hold a copy", () => {
    expect(tex.strip.width).toBe(size * 2);
    expect(tex.strip.height).toBe(size);
  });

  it("puts the full artwork on the front and the same copy on the back", () => {
    // Face center (u = 0.5) and back center (u = 0) both land on the
    // green square — two unstretched copies, not one image smeared 360°.
    // The back copy sits under the baked dark meridian, so it is dimmer
    // but still clearly green.
    expect(tex.strip.data[at(12) + 1]).toBeGreaterThan(200);
    expect(tex.strip.data[at(12)]).toBeLessThan(60);
    expect(tex.strip.data[at(0) + 1]).toBeGreaterThan(120);
    expect(tex.strip.data[at(0)]).toBeLessThan(60);
    // Left-of-center on the face is still magenta: the square is not
    // stretched so far that the green core fills the hemisphere.
    expect(tex.strip.data[at(8)]).toBeGreaterThan(200);
    expect(tex.strip.data[at(8) + 1]).toBeLessThan(80);
  });

  it("fills transparent artwork so the sphere body rotates with the logo", () => {
    const cut = new Uint8ClampedArray(size * size * 4);
    const mid = (6 * size + 6) * 4;
    cut[mid] = 255;
    cut[mid + 3] = 255;
    const baked = bakeSphereStripFromPixels(cut, size);
    const row = (x: number) => (6 * baked.strip.width + x) * 4;
    expect(baked.strip.data[row(12) + 3]).toBe(255);
    expect(baked.strip.data[row(0) + 3]).toBe(255);
    expect(baked.strip.data[row(0)]).toBeGreaterThan(0);
  });

  it("bakes surface shading that rotates with the wrap", () => {
    // A uniform white source isolates the longitude shading: the face
    // meridian is lit, the far side is dark, alpha untouched.
    const flat = new Uint8ClampedArray(size * size * 4).fill(255);
    const shaded = bakeSphereStripFromPixels(flat, size);
    const row = (x: number) => (6 * shaded.strip.width + x) * 4;
    const front = shaded.strip.data[row(12)];
    const back = shaded.strip.data[row(0)];
    expect(front).toBeGreaterThan(back * 1.3);
    expect(shaded.strip.data[row(12) + 3]).toBe(255);
    expect(shaded.strip.data[row(0) + 3]).toBe(255);
  });

  it("can keep source lighting for a pre-rendered planet", () => {
    const flat = new Uint8ClampedArray(size * size * 4).fill(255);
    const raw = bakeSphereStripFromPixels(flat, size, { surfaceShade: false });
    const row = (x: number) => (6 * raw.strip.width + x) * 4;
    expect(raw.strip.data[row(12)]).toBe(255);
    expect(raw.strip.data[row(0)]).toBe(255);
  });

  it("blends the hemisphere seams where the two copies meet", () => {
    // Seams sit at u = 0.25 and 0.75 (strip x = 6 and 18 on a 24-wide).
    expect(tex.strip.data[at(6) + 1]).toBeGreaterThan(8);
    expect(tex.strip.data[at(6)]).toBeLessThan(250);
    expect(tex.strip.data[at(18) + 1]).toBeGreaterThan(8);
    expect(tex.strip.data[at(18)]).toBeLessThan(250);
  });
});

describe("stripUFrac", () => {
  it("maps center to 0 and the limbs to a quarter wrap", () => {
    expect(stripUFrac(0, 0)).toBe(0);
    expect(stripUFrac(1, 0)).toBeCloseTo(0.25);
    expect(stripUFrac(-1, 0)).toBeCloseTo(-0.25);
  });

  it("compresses longitude at the limb — 3D warp, not a flat scroll", () => {
    // Equal screen steps must cover far more longitude near the limb than
    // at the center; a linear (2D-looking) mapping would make these equal.
    const center = stripUFrac(0.1, 0)! - stripUFrac(0, 0)!;
    const limb = stripUFrac(0.95, 0)! - stripUFrac(0.85, 0)!;
    expect(limb).toBeGreaterThan(center * 2);
  });

  it("returns null outside the disk", () => {
    expect(stripUFrac(0.9, 0.9)).toBeNull();
  });
});

describe("stripV", () => {
  it("maps the disk middle to the image middle and poles to the edges", () => {
    expect(stripV(0)).toBe(0.5);
    expect(stripV(-1)).toBeCloseTo(0);
    expect(stripV(1)).toBeCloseTo(1);
  });

  it("magnifies the middle like a real sphere wrap", () => {
    // Halfway down the disk should still be well inside the image: the
    // spherical mapping compresses rows toward the poles instead.
    const mid = stripV(0.5);
    expect(mid).toBeGreaterThan(0.6);
    expect(mid).toBeLessThan(0.75);
  });

  it("is monotonic top to bottom", () => {
    let prev = -1;
    for (let ny = -0.95; ny <= 0.95; ny += 0.1) {
      const v = stripV(ny);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("clamps out-of-range input", () => {
    expect(stripV(1.5)).toBeCloseTo(1);
    expect(stripV(-1.5)).toBeCloseTo(0);
  });
});

describe("stripSeamBlend", () => {
  it("fully blends at the hemisphere seams and not at either face", () => {
    expect(stripSeamBlend(0.25)).toBe(1);
    expect(stripSeamBlend(0.75)).toBe(1);
    expect(stripSeamBlend(0.5)).toBe(0);
    expect(stripSeamBlend(0)).toBe(0);
  });

  it("eases smoothly away from both seams", () => {
    const near = stripSeamBlend(0.27);
    const far = stripSeamBlend(0.31);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
    expect(stripSeamBlend(0.27)).toBeCloseTo(stripSeamBlend(0.23), 6);
    expect(stripSeamBlend(0.27)).toBeCloseTo(stripSeamBlend(0.73), 6);
  });
});

describe("resolvedSphereTexture", () => {
  it("is undefined until a bake for that url and size has finished", () => {
    expect(resolvedSphereTexture("/not-requested.png", 32)).toBeUndefined();
  });
});

describe("lookupSphereTexture", () => {
  const src = new Uint8ClampedArray(12 * 12 * 4).fill(255);
  const tex = bakeSphereStripFromPixels(src, 12);

  it("prefers the local map so rAF can spin before React state catches up", () => {
    const local = new Map([["moon-a", tex]]);
    expect(lookupSphereTexture("/pending.png", 12, local, "moon-a")).toBe(tex);
  });

  it("returns null when nothing is baked", () => {
    expect(lookupSphereTexture("/never-loaded.png", 12)).toBeNull();
  });
});

describe("resolveWarpLUT", () => {
  const src = new Uint8ClampedArray(12 * 12 * 4).fill(255);
  const tex = bakeSphereStripFromPixels(src, 12);

  it("remaps when the strip and table disagree", () => {
    const lut = resolveWarpLUT(tex, getWarpLUT(8));
    expect(lut.size).toBe(12);
  });

  it("keeps a matching table", () => {
    const lut = getWarpLUT(12);
    expect(resolveWarpLUT(tex, lut)).toBe(lut);
  });
});

describe("trimSphereTextureCache", () => {
  const tex = bakeSphereStripFromPixels(new Uint8ClampedArray(16 * 16 * 4).fill(255), 16);

  afterEach(() => {
    releaseAllSphereTextureResources();
  });

  it("evicts least-recently-used bakes until at most max remain", () => {
    seedSphereTextureCacheEntry(`${TEST_PNG}#a@16`, tex);
    seedSphereTextureCacheEntry(`${TEST_PNG}#b@16`, tex);
    seedSphereTextureCacheEntry(`${TEST_PNG}#c@16`, tex);
    trimSphereTextureCache(2);
    expect(resolvedSphereTexture(`${TEST_PNG}#a`, 16)).toBeUndefined();
    expect(resolvedSphereTexture(`${TEST_PNG}#b`, 16)).toBeTruthy();
    expect(resolvedSphereTexture(`${TEST_PNG}#c`, 16)).toBeTruthy();
  });

  it("does not evict protected keys", () => {
    seedSphereTextureCacheEntry(`${TEST_PNG}#a@16`, tex);
    seedSphereTextureCacheEntry(`${TEST_PNG}#b@16`, tex);
    seedSphereTextureCacheEntry(`${TEST_PNG}#c@16`, tex);
    trimSphereTextureCache(2, new Set([`${TEST_PNG}#a@16`]));
    expect(resolvedSphereTexture(`${TEST_PNG}#a`, 16)).toBeTruthy();
    expect(resolvedSphereTexture(`${TEST_PNG}#b`, 16)).toBeUndefined();
    expect(resolvedSphereTexture(`${TEST_PNG}#c`, 16)).toBeTruthy();
  });
});
