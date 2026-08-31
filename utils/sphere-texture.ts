/**
 * @fileoverview True 3D sphere texturing for the homepage moons. Each
 * square artwork is baked onto both hemispheres of a 360° wrap strip
 * (front copy + matching back copy) with the meridians blended so the
 * seams don't flash a hard edge while spinning. A per-size warp lookup
 * table maps every screen pixel of the visible disk to a longitude /
 * latitude on that strip. The visible face shows one full, unstretched
 * copy of the square; as the moon spins, the same image rolls around
 * from the back. Rotation is a phase offset applied at warp time, so
 * re-warping a moon's canvas advances its spin with full spherical
 * distortion (a static bake + CSS pan cannot do this).
 *
 * Two warp paths exist. The GPU path (warpStripToCanvasGpu) decomposes
 * the warp into drawImage slices: the latitude remap is phase-independent
 * and pre-baked once per texture, the longitude warp is the same sine
 * mapping on every row (column slices), and each row is then scaled to
 * its disk chord (row bands). ~200 GPU blits per warp, no per-pixel JS
 * and no putImageData upload. Slice/band counts scale with bake size so
 * a Retina close-up stays around 3–4 px facets. The CPU path
 * (warpStripToCanvas) is the exact per-pixel reference used for
 * fallback and tests.
 *
 * Bakes are cached in a small LRU (TEXTURE_CACHE_MAX). The hero tour
 * loops through the whole catalog forever; an unbounded cache left every
 * visited product's strip pixels and v-warped canvas alive for the life
 * of the page, which walked iOS Safari into its memory limit and a
 * kill-and-reload loop. Eviction frees the canvas backing store too.
 * @module utils/sphere-texture
 */

import { imageUrlNeedsCrossOrigin } from "@/utils/optimized-image-url";

/** Raw strip pixels; a plain record so the bake core is unit-testable. */
export interface StripPixels {
  /** 2 × size: full 360° of longitude. */
  width: number;
  /** = size. */
  height: number;
  data: Uint8ClampedArray;
}

/** A baked wrap strip plus artwork-derived tints ("r, g, b" strings). */
export interface SphereTexture {
  /** Seam-blended full-360° wrap of the artwork. */
  strip: StripPixels;
  /** Bright tint for the lit side of the base sphere. */
  tintHi: string;
  /** Mid tint for the body of the base sphere. */
  tintMid: string;
  /** Dark tint for the shadowed limb of the base sphere. */
  tintLo: string;
}

/** Precomputed disk→strip mapping for one texture size. */
export interface WarpLUT {
  size: number;
  /** −1 outside the disk; unused for sampling (vFrac holds the row). */
  rowBase: Int32Array;
  /** Per-pixel wrap fraction at phase 0 (0–1 around the full 360°). */
  uFrac: Float32Array;
  /** Per-pixel strip row as a float (0…size−1) for vertical bilinear. */
  vFrac: Float32Array;
  /** Per-pixel rim alpha (soft limb edge). */
  alpha: Uint8Array;
  /** Indices of in-disk pixels; warps skip the empty corners. */
  inside: Int32Array;
}

/**
 * @brief Vertical texture coordinate for a disk row, as if the image were
 * wrapped over a sphere: the middle of the artwork is magnified and the
 * poles compress, matching real spherical foreshortening.
 * @param ny Disk y in [-1, 1].
 * @returns Texture v in [0, 1].
 * @example
 * stripV(0) === 0.5; stripV(1) === 1
 */
export function stripV(ny: number): number {
  const clamped = Math.max(-1, Math.min(1, ny));
  return 0.5 + Math.asin(clamped) / Math.PI;
}

/**
 * @brief Longitude of a disk pixel as a fraction of the full 360° wrap.
 * Non-linear: equal screen steps near the limb cover more longitude than
 * steps near the center — this is the spherical warp that makes the
 * artwork read as 3D instead of a flat scroll.
 * @param nx Disk x in [-1, 1].
 * @param ny Disk y in [-1, 1].
 * @returns Wrap fraction in [-0.25, 0.25], or null outside the disk.
 * @example
 * stripUFrac(0, 0) === 0
 */
export function stripUFrac(nx: number, ny: number): number | null {
  const r2 = nx * nx + ny * ny;
  if (r2 > 1) return null;
  return Math.atan2(nx, Math.sqrt(1 - r2)) / (2 * Math.PI);
}

/**
 * @brief How strongly a column blends at a hemisphere seam. The square
 * is tiled twice, so left and right edges meet at u = 0.25 and 0.75
 * (the limbs when the artwork is face-on).
 * @param u Horizontal position across the full wrap, 0–1.
 * @returns Blend factor: 1 at either seam, easing to 0 by 7% in.
 * @example
 * stripSeamBlend(0.25) === 1; stripSeamBlend(0.5) === 0
 */
export function stripSeamBlend(u: number): number {
  const seamD = Math.min(Math.abs(u - 0.25), Math.abs(u - 0.75));
  const t = Math.min(1, Math.max(0, 1 - seamD / 0.07));
  return t * t * (3 - 2 * t);
}

/**
 * @brief Wraps a texture coordinate onto [0, 1).
 * @param t Any real.
 * @returns Fraction in [0, 1).
 */
function wrap01(t: number): number {
  return ((t % 1) + 1) % 1;
}

const lutCache = new Map<number, WarpLUT>();

/**
 * @brief Builds (or returns cached) warp table for one texture size.
 * Shared by every moon of that size; ~size² entries built once.
 * @param size Disk/canvas edge in px.
 * @returns Lookup table for warpStripToCanvas.
 */
export function getWarpLUT(size: number): WarpLUT {
  let lut = lutCache.get(size);
  if (lut) return lut;
  const n = size * size;
  const rowBase = new Int32Array(n);
  const uFrac = new Float32Array(n);
  const vFrac = new Float32Array(n);
  const alpha = new Uint8Array(n);
  const insideBuf = new Int32Array(n);
  let insideN = 0;
  const lastRow = size - 1;
  for (let y = 0; y < size; y += 1) {
    const ny = ((y + 0.5) / size) * 2 - 1;
    for (let x = 0; x < size; x += 1) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const p = y * size + x;
      const u = stripUFrac(nx, ny);
      if (u === null) {
        rowBase[p] = -1;
        continue;
      }
      rowBase[p] = 0;
      // +0.5 centers the artwork on the face at phase 0, putting the wrap
      // seam on the far side of the sphere.
      uFrac[p] = 0.5 + u;
      vFrac[p] = Math.min(lastRow, Math.max(0, stripV(ny) * lastRow));
      const r = Math.sqrt(nx * nx + ny * ny);
      const fadeT = Math.min(1, Math.max(0, (r - 0.9) / 0.1));
      alpha[p] = Math.round(255 * (1 - fadeT * fadeT * (3 - 2 * fadeT)));
      insideBuf[insideN] = p;
      insideN += 1;
    }
  }
  lut = {
    size,
    rowBase,
    uFrac,
    vFrac,
    alpha,
    inside: insideBuf.subarray(0, insideN),
  };
  lutCache.set(size, lut);
  return lut;
}

const outBuffers = new WeakMap<HTMLCanvasElement, ImageData>();
const ctxCache = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();

/**
 * @brief Cached 2D context for a warp canvas.
 * @param canvas Destination.
 * @returns Context, or null.
 */
function canvasCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  let ctx = ctxCache.get(canvas);
  if (ctx) return ctx;
  ctx = canvas.getContext("2d", { alpha: true }) ?? undefined;
  if (!ctx) return null;
  ctxCache.set(canvas, ctx);
  return ctx;
}

/**
 * @brief Warps the strip onto a moon's canvas at the given spin phase.
 * Bilinear sample (wraps in longitude, clamps in latitude) so close-ups
 * stay sharp instead of showing nearest-neighbor grain. No trig and no
 * allocation after the first call per canvas.
 * @param tex Baked strip for this product.
 * @param lut Warp table; remapped to `tex.strip.height` if sizes disagree.
 * @param phase Spin phase 0–1 (fraction of a full revolution).
 * @param canvas Destination canvas (resized to the strip height if needed).
 * @param quality `bilinear` for close-ups; `nearest` for cheap ambient updates.
 */
export function warpStripToCanvas(
  tex: SphereTexture,
  lut: WarpLUT,
  phase: number,
  canvas: HTMLCanvasElement,
  quality: "bilinear" | "nearest" = "bilinear"
): void {
  lut = resolveWarpLUT(tex, lut);
  const ctx = canvasCtx(canvas);
  if (!ctx) return;
  const size = lut.size;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  let out = outBuffers.get(canvas);
  if (!out || out.width !== size) {
    out = ctx.createImageData(size, size);
    outBuffers.set(canvas, out);
  }
  const src = tex.strip.data;
  const d = out.data;
  const { uFrac, vFrac, alpha, inside } = lut;
  const stripW = size * 2;
  const lastRow = size - 1;
  const ph = ((phase % 1) + 1) % 1;
  const bilinear = quality === "bilinear";
  for (let n = 0; n < inside.length; n += 1) {
    const p = inside[n];
    const o = p * 4;
    let u = uFrac[p] + ph;
    if (u >= 1) u -= 1;
    if (u < 0) u += 1;
    const fx = u * stripW;
    const fy = vFrac[p];
    if (!bilinear) {
      let x0 = (fx + 0.5) | 0;
      if (x0 >= stripW) x0 = 0;
      const y0 = fy < lastRow ? (fy + 0.5) | 0 : lastRow;
      const i = (y0 * stripW + x0) * 4;
      const a = alpha[p];
      d[o] = src[i];
      d[o + 1] = src[i + 1];
      d[o + 2] = src[i + 2];
      d[o + 3] = (src[i + 3] * a) / 255;
      continue;
    }
    let x0 = fx | 0;
    if (x0 >= stripW) x0 = 0;
    const x1 = x0 + 1 < stripW ? x0 + 1 : 0;
    const tx = fx - x0;
    const y0 = fy | 0;
    const y1 = y0 < lastRow ? y0 + 1 : lastRow;
    const ty = fy - y0;
    const w00 = (1 - tx) * (1 - ty);
    const w10 = tx * (1 - ty);
    const w01 = (1 - tx) * ty;
    const w11 = tx * ty;
    const i00 = (y0 * stripW + x0) * 4;
    const i10 = (y0 * stripW + x1) * 4;
    const i01 = (y1 * stripW + x0) * 4;
    const i11 = (y1 * stripW + x1) * 4;
    d[o] = src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
    d[o + 1] =
      src[i00 + 1] * w00 +
      src[i10 + 1] * w10 +
      src[i01 + 1] * w01 +
      src[i11 + 1] * w11;
    d[o + 2] =
      src[i00 + 2] * w00 +
      src[i10 + 2] * w10 +
      src[i01 + 2] * w01 +
      src[i11 + 2] * w11;
    d[o + 3] =
      ((src[i00 + 3] * w00 +
        src[i10 + 3] * w10 +
        src[i01 + 3] * w01 +
        src[i11 + 3] * w11) *
        alpha[p]) /
      255;
  }
  ctx.putImageData(out, 0, 0);
}

/** Floor on GPU longitude slices (small disks / tests). */
const WARP_SLICES_MIN = 96;
/** Cap so a 2× retina bake stays under ~400 slice blits. */
const WARP_SLICES_MAX = 384;
/** Floor on GPU latitude bands. */
const WARP_BANDS_MIN = 64;
/** Cap on GPU latitude bands. */
const WARP_BANDS_MAX = 288;

/**
 * @brief GPU tessellation for one disk size. Facets stay around 3–4 px
 * so a close-up spin does not crawl as visible grain. Larger bakes get
 * more slices/bands; small test disks keep the old minimums.
 * @param size Disk edge in px.
 * @returns Slice count (longitude) and band count (latitude).
 * @example
 * warpDensityForSize(1280).bands > warpDensityForSize(640).bands
 */
export function warpDensityForSize(size: number): {
  slices: number;
  bands: number;
} {
  const edge = Math.max(1, size);
  return {
    slices: Math.min(
      WARP_SLICES_MAX,
      Math.max(WARP_SLICES_MIN, Math.round(edge / 3.4))
    ),
    bands: Math.min(
      WARP_BANDS_MAX,
      Math.max(WARP_BANDS_MIN, Math.round(edge / 4.5))
    ),
  };
}

/** One horizontal slice of the GPU warp, in normalized units. */
export interface WarpSlice {
  /** Source start across the full wrap (u, 0–1) at phase 0. */
  su0: number;
  /** Source end across the full wrap (u, 0–1) at phase 0. */
  su1: number;
  /** Destination start as a fraction of the disk width. */
  dx0: number;
  /** Destination end as a fraction of the disk width. */
  dx1: number;
}

/** One vertical band of the GPU warp, in normalized units. */
export interface WarpBand {
  /** Band top as a fraction of the disk height. */
  y0: number;
  /** Band bottom as a fraction of the disk height. */
  y1: number;
  /** Row chord (cos latitude): the band's width as a disk fraction. */
  chord: number;
}

/**
 * @brief Horizontal slice table for the GPU warp. Output columns are
 * uniform across the disk; each maps back to the longitude range that
 * projects onto it (u = 0.5 + asin(nx) / 2π), so drawing each slice with
 * a plain drawImage reproduces the spherical limb compression.
 * @param slices Slice count.
 * @returns Slices at phase 0, left to right. Source spans [0.25, 0.75].
 * @example
 * warpSliceRanges(2)[0].su0 === 0.25
 */
export function warpSliceRanges(slices: number): WarpSlice[] {
  const out: WarpSlice[] = [];
  for (let k = 0; k < slices; k += 1) {
    const nx0 = Math.max(-1, (k / slices) * 2 - 1);
    const nx1 = Math.min(1, ((k + 1) / slices) * 2 - 1);
    out.push({
      su0: 0.5 + Math.asin(nx0) / (2 * Math.PI),
      su1: 0.5 + Math.asin(nx1) / (2 * Math.PI),
      dx0: k / slices,
      dx1: (k + 1) / slices,
    });
  }
  return out;
}

/**
 * @brief Vertical band table for the GPU warp. Each band of rows is
 * drawn at its middle chord width (cos of the latitude), centered, which
 * shapes the full-width hemisphere into the circular disk.
 * @param bands Band count.
 * @returns Bands top to bottom.
 * @example
 * warpBandRanges(4)[1].chord > warpBandRanges(4)[0].chord
 */
export function warpBandRanges(bands: number): WarpBand[] {
  const out: WarpBand[] = [];
  for (let b = 0; b < bands; b += 1) {
    const y0 = b / bands;
    const y1 = (b + 1) / bands;
    const nyMid = (y0 + y1) - 1;
    out.push({ y0, y1, chord: Math.sqrt(Math.max(0, 1 - nyMid * nyMid)) });
  }
  return out;
}

const sliceCache = new Map<number, WarpSlice[]>();
const bandCache = new Map<number, WarpBand[]>();

/** Per-texture pre-baked strip with the latitude warp applied. */
const vWarpedCache = new WeakMap<SphereTexture, HTMLCanvasElement | null>();
/** Shared per-size scratch hemispheres and rim masks. */
const hemiCache = new Map<number, HTMLCanvasElement>();
const maskCache = new Map<number, HTMLCanvasElement>();
/** Offscreen composite so the visible canvas is never cleared mid-warp. */
const frameCache = new Map<number, HTMLCanvasElement>();

/**
 * @brief Strip canvas with the vertical (latitude) warp pre-applied:
 * destination row y holds strip row stripV(ny). Phase-independent, so
 * it is baked once per texture and reused by every frame's GPU warp.
 * @param tex Baked strip.
 * @returns Canvas of strip size, or null without DOM/2D support.
 */
function vWarpedStrip(tex: SphereTexture): HTMLCanvasElement | null {
  const hit = vWarpedCache.get(tex);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return null;
  const size = tex.strip.height;
  const stripW = tex.strip.width;
  const raw = document.createElement("canvas");
  raw.width = stripW;
  raw.height = size;
  const rctx = raw.getContext("2d");
  const warped = document.createElement("canvas");
  warped.width = stripW;
  warped.height = size;
  const wctx = warped.getContext("2d");
  if (!rctx || !wctx) {
    vWarpedCache.set(tex, null);
    return null;
  }
  rctx.putImageData(
    new ImageData(new Uint8ClampedArray(tex.strip.data), stripW, size),
    0,
    0
  );
  wctx.imageSmoothingEnabled = true;
  const lastRow = size - 1;
  for (let y = 0; y < size; y += 1) {
    const ny = ((y + 0.5) / size) * 2 - 1;
    const v = Math.min(lastRow, Math.max(0, stripV(ny) * lastRow));
    wctx.drawImage(raw, 0, v, stripW, 1, 0, y, stripW, 1);
  }
  // The scratch canvas is garbage now, but Safari reclaims canvas
  // backing stores lazily; zeroing frees it immediately.
  raw.width = 0;
  raw.height = 0;
  vWarpedCache.set(tex, warped);
  return warped;
}

/**
 * @brief Rim-fade mask for one disk size, matching the CPU path's soft
 * limb (opaque to radius 0.9, smoothstep to transparent at 1.0).
 * @param size Disk edge in px.
 * @returns Mask canvas, or null without 2D support.
 */
function rimMask(size: number): HTMLCanvasElement | null {
  const hit = maskCache.get(size);
  if (hit) return hit;
  const mask = document.createElement("canvas");
  mask.width = size;
  mask.height = size;
  const ctx = mask.getContext("2d");
  if (!ctx) return null;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0.9, "rgba(255,255,255,1)");
  grad.addColorStop(0.925, "rgba(255,255,255,0.84)");
  grad.addColorStop(0.95, "rgba(255,255,255,0.5)");
  grad.addColorStop(0.975, "rgba(255,255,255,0.16)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  maskCache.set(size, mask);
  return mask;
}

/**
 * @brief GPU sphere warp: renders the strip onto the moon canvas at the
 * given phase using only drawImage blits (slices for the longitude sine
 * map, bands for the per-row chord, a radial mask for the rim). Replaces
 * the per-pixel JS loop and putImageData upload for per-frame spin.
 * @param tex Baked strip for this product.
 * @param phase Spin phase 0–1 (fraction of a full revolution).
 * @param canvas Destination canvas (resized to the strip height if needed).
 * @returns True on success; false when a caller should use the CPU path.
 */
export function warpStripToCanvasGpu(
  tex: SphereTexture,
  phase: number,
  canvas: HTMLCanvasElement
): boolean {
  const strip = vWarpedStrip(tex);
  if (!strip) return false;
  const size = tex.strip.height;
  const stripW = tex.strip.width;
  const mask = rimMask(size);
  if (!mask) return false;
  let hemi = hemiCache.get(size);
  if (!hemi) {
    hemi = document.createElement("canvas");
    hemi.width = size;
    hemi.height = size;
    hemiCache.set(size, hemi);
  }
  const hctx = hemi.getContext("2d");
  let frame = frameCache.get(size);
  if (!frame) {
    frame = document.createElement("canvas");
    frame.width = size;
    frame.height = size;
    frameCache.set(size, frame);
  }
  const fctx = frame.getContext("2d");
  const dctx = canvasCtx(canvas);
  if (!hctx || !fctx || !dctx) return false;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }

  const density = warpDensityForSize(size);
  let slices = sliceCache.get(density.slices);
  if (!slices) {
    slices = warpSliceRanges(density.slices);
    sliceCache.set(density.slices, slices);
  }
  let bands = bandCache.get(density.bands);
  if (!bands) {
    bands = warpBandRanges(density.bands);
    bandCache.set(density.bands, bands);
  }

  const ph = wrap01(phase);
  hctx.imageSmoothingEnabled = true;
  hctx.clearRect(0, 0, size, size);
  for (let k = 0; k < slices.length; k += 1) {
    const s = slices[k];
    const sw = (s.su1 - s.su0) * stripW;
    if (sw <= 0) continue;
    const sx = wrap01(s.su0 + ph) * stripW;
    const dx = s.dx0 * size;
    const dw = (s.dx1 - s.dx0) * size;
    if (sx + sw <= stripW) {
      hctx.drawImage(strip, sx, 0, sw, size, dx, 0, dw, size);
    } else {
      // Slice straddles the wrap seam: split at the strip edge.
      const w1 = stripW - sx;
      const f = w1 / sw;
      hctx.drawImage(strip, sx, 0, w1, size, dx, 0, dw * f, size);
      hctx.drawImage(strip, 0, 0, sw - w1, size, dx + dw * f, 0, dw * (1 - f), size);
    }
  }

  fctx.imageSmoothingEnabled = true;
  fctx.clearRect(0, 0, size, size);
  for (let b = 0; b < bands.length; b += 1) {
    const band = bands[b];
    const bw = band.chord * size;
    if (bw <= 0) continue;
    const y = band.y0 * size;
    const bh = (band.y1 - band.y0) * size;
    fctx.drawImage(hemi, 0, y, size, bh, (size - bw) / 2, y, bw, bh);
  }
  fctx.globalCompositeOperation = "destination-in";
  fctx.drawImage(mask, 0, 0);
  fctx.globalCompositeOperation = "source-over";
  // One blit onto the live canvas so a mid-warp clear never flashes black.
  if (dctx.globalCompositeOperation !== "copy") {
    dctx.globalCompositeOperation = "copy";
  }
  dctx.drawImage(frame, 0, 0);
  dctx.globalCompositeOperation = "source-over";
  return true;
}

/**
 * @brief Samples one horizontally-interpolated source pixel.
 * @param srcPx Square source pixels (size × size RGBA).
 * @param size Image edge.
 * @param srcU Horizontal fraction in [0, 1).
 * @param y Source row.
 * @returns RGBA at that column.
 */
function sampleSrcRow(
  srcPx: Uint8ClampedArray,
  size: number,
  srcU: number,
  y: number
): [number, number, number, number] {
  const max = size - 1;
  const fx = Math.min(max - 0.001, Math.max(0, srcU * max));
  const x0 = Math.floor(fx);
  const tx = fx - x0;
  const i00 = (y * size + x0) * 4;
  const i10 = i00 + 4;
  return [
    srcPx[i00] * (1 - tx) + srcPx[i10] * tx,
    srcPx[i00 + 1] * (1 - tx) + srcPx[i10 + 1] * tx,
    srcPx[i00 + 2] * (1 - tx) + srcPx[i10 + 2] * tx,
    srcPx[i00 + 3] * (1 - tx) + srcPx[i10 + 3] * tx,
  ];
}

/**
 * @brief Pure bake core: tiles the square onto both hemispheres of the
 * 360° wrap (width = 2 × size). The front copy is centered on the face
 * at phase 0 so the visible disk shows the whole image, not a stretched
 * half; the back is the same image again. Columns near either meridian
 * seam (and rows near the poles) blend the two edges into each other and
 * into the artwork's average color. A longitude-shading pass bakes a lit
 * meridian (face center) and a dark meridian (far side) into the wrap so
 * shading rotates with the surface. DOM-free so it can be unit-tested
 * pixel-for-pixel.
 * @param srcPx Square source pixels (size × size RGBA).
 * @param size Strip height in px (width is doubled).
 * @param options.surfaceShade When false, keep the source lighting
 *        (for a pre-rendered planet). Default true.
 * @returns Texture + tints.
 */
export function bakeSphereStripFromPixels(
  srcPx: Uint8ClampedArray,
  size: number,
  options: { surfaceShade?: boolean } = {}
): SphereTexture {
  // Average opaque color of the artwork drives seam blending + base tint.
  let ar = 0;
  let ag = 0;
  let ab = 0;
  let an = 0;
  for (let i = 0; i < srcPx.length; i += 64) {
    if (srcPx[i + 3] < 32) continue;
    ar += srcPx[i];
    ag += srcPx[i + 1];
    ab += srcPx[i + 2];
    an += 1;
  }
  if (an === 0) {
    ar = 108;
    ag = 99;
    ab = 255;
    an = 1;
  }
  ar /= an;
  ag /= an;
  ab /= an;

  const width = size * 2;
  const d = new Uint8ClampedArray(width * size * 4);

  for (let y = 0; y < size; y += 1) {
    const ny = ((y + 0.5) / size) * 2 - 1;
    const poleT = Math.min(1, Math.max(0, (Math.abs(ny) - 0.82) / 0.18));
    const poleBlend = poleT * poleT * (3 - 2 * poleT);
    const rowStart = y * width * 4;

    for (let x = 0; x < width; x += 1) {
      // Two copies, each covering 180°. Offset so u = 0.5 (face center)
      // lands on the middle of the artwork.
      const u = (x + 0.5) / width;
      const srcU = wrap01(u * 2 - 0.5);
      let [sr, sg, sb, sa] = sampleSrcRow(srcPx, size, srcU, y);

      const seam = stripSeamBlend(u);
      if (seam > 0) {
        // Crossfade the left and right edges of the square so the
        // meridian where the two copies meet isn't a hard cut.
        const [pr, pg, pb, pa] = sampleSrcRow(srcPx, size, wrap01(1 - srcU), y);
        const edgeMix = seam * 0.5;
        sr += (pr - sr) * edgeMix;
        sg += (pg - sg) * edgeMix;
        sb += (pb - sb) * edgeMix;
        sa += (pa - sa) * edgeMix;
      }

      const blend = Math.max(seam, poleBlend) * 0.7;
      sr += (ar - sr) * blend;
      sg += (ag - sg) * blend;
      sb += (ab - sb) * blend;

      // Logos are usually on a transparent plate. Leave those holes
      // and the CSS sphere (static highlight + terminator) shows
      // through — a mask that does not spin with the artwork. Composite
      // onto the sphere body so the whole surface rotates together.
      const cover = Math.max(0, Math.min(1, sa / 255));
      sr = sr * cover + ar * (1 - cover);
      sg = sg * cover + ag * (1 - cover);
      sb = sb * cover + ab * (1 - cover);

      // Surface shading baked into the wrap: a soft lit meridian on the
      // face and a dark one on the far side. Unlike the sun-fixed
      // terminator overlay, this rotates WITH the texture, so the spin
      // reads as a turning sphere instead of art scrolling behind a
      // static shaded ball. Skip it for a pre-rendered planet.
      if (options.surfaceShade !== false) {
        const lit = 0.82 + 0.18 * Math.cos((u - 0.5) * 2 * Math.PI);
        sr *= lit;
        sg *= lit;
        sb *= lit;
      }

      const idx = rowStart + x * 4;
      d[idx] = sr;
      d[idx + 1] = sg;
      d[idx + 2] = sb;
      d[idx + 3] = 255;
    }
  }

  const tint = (k: number, lift: number) =>
    `${Math.round(ar * k + 255 * lift)}, ${Math.round(ag * k + 255 * lift)}, ${Math.round(ab * k + 255 * lift)}`;
  return {
    strip: { width, height: size, data: d },
    tintHi: tint(0.55, 0.42),
    tintMid: tint(0.5, 0.04),
    tintLo: tint(0.2, 0.01),
  };
}

/**
 * @brief DOM wrapper: rasterizes the image to size × size and bakes it.
 * @param img Decoded source image (any size; resampled to `size`).
 * @param size Strip height in px (width is doubled).
 * @param options Forwarded to bakeSphereStripFromPixels.
 * @returns Texture + tints, or null when a 2D context is unavailable.
 * @note Throws if the image is CORS-tainted; callers catch and fall back.
 */
export function bakeSphereStrip(
  img: HTMLImageElement,
  size: number,
  options: { surfaceShade?: boolean } = {}
): SphereTexture | null {
  const src = document.createElement("canvas");
  src.width = size;
  src.height = size;
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(img, 0, 0, size, size);
  const pixels = sctx.getImageData(0, 0, size, size).data;
  // Free the rasterization scratch right away instead of waiting on GC.
  src.width = 0;
  src.height = 0;
  return bakeSphereStripFromPixels(pixels, size, options);
}

const textureCache = new Map<string, Promise<SphereTexture | null>>();
const resolvedTextures = new Map<string, SphereTexture | null>();

/**
 * Most bakes kept alive at once. Each entry pins the strip pixels plus
 * a same-size v-warped canvas (~2.4 MB combined at the phone bake size,
 * ~26 MB at the desktop Retina size). The tour's working set is three
 * (featured moon, next moon, sun), so six leaves comfortable slack
 * without letting a full catalog loop accumulate.
 */
const TEXTURE_CACHE_MAX = 6;

/**
 * @brief Drops one cached bake and frees its v-warped canvas.
 * A caller still holding the SphereTexture keeps working: the strip
 * pixels live on that reference, and vWarpedStrip rebuilds the canvas
 * on the next warp because its cache entry is deleted here.
 * @param key Cache key (`url@size[:raw]`).
 */
function releaseTextureKey(key: string): void {
  textureCache.delete(key);
  const tex = resolvedTextures.get(key);
  resolvedTextures.delete(key);
  if (!tex) return;
  const warped = vWarpedCache.get(tex);
  vWarpedCache.delete(tex);
  if (warped) {
    // Zeroing the dimensions releases the canvas backing store now —
    // iOS Safari budgets canvas memory far tighter than JS heap.
    warped.width = 0;
    warped.height = 0;
  }
}

/**
 * @brief Marks a cache key most-recently-used (Map order is LRU order).
 * @param key Cache key.
 */
function touchTextureKey(key: string): void {
  const pending = textureCache.get(key);
  if (pending) {
    textureCache.delete(key);
    textureCache.set(key, pending);
  }
  if (resolvedTextures.has(key)) {
    const tex = resolvedTextures.get(key) ?? null;
    resolvedTextures.delete(key);
    resolvedTextures.set(key, tex);
  }
}

/**
 * @brief Evicts least-recently-used bakes beyond TEXTURE_CACHE_MAX.
 */
function evictStaleTextures(): void {
  while (textureCache.size > TEXTURE_CACHE_MAX) {
    const oldest = textureCache.keys().next().value;
    if (oldest === undefined) break;
    releaseTextureKey(oldest);
  }
}

/**
 * @brief Zeroes and clears one map of shared scratch canvases.
 * @param cache Per-size canvas cache (hemi / frame / rim mask).
 */
function releaseCanvasCache(cache: Map<number, HTMLCanvasElement>): void {
  cache.forEach((canvas) => {
    canvas.width = 0;
    canvas.height = 0;
  });
  cache.clear();
}

/**
 * @brief Releases every cached bake, scratch canvas, and warp table.
 * The hero calls this when it parks the tour: nothing will warp again,
 * so all texture memory can go back to the browser. Every cache here
 * rebuilds on demand, so a later warp still works — it just re-bakes.
 */
export function releaseAllSphereTextureResources(): void {
  for (const key of Array.from(textureCache.keys())) {
    releaseTextureKey(key);
  }
  for (const key of Array.from(resolvedTextures.keys())) {
    releaseTextureKey(key);
  }
  releaseCanvasCache(hemiCache);
  releaseCanvasCache(maskCache);
  releaseCanvasCache(frameCache);
  lutCache.clear();
  sliceCache.clear();
  bandCache.clear();
}

/**
 * @brief Test helper: inserts a finished bake into the LRU cache.
 * @param key Full cache key (`url@size` or `url@size:raw`).
 * @param tex Baked strip.
 */
export function seedSphereTextureCacheEntry(
  key: string,
  tex: SphereTexture
): void {
  textureCache.set(key, Promise.resolve(tex));
  resolvedTextures.set(key, tex);
  touchTextureKey(key);
}

/**
 * @brief Drops least-recently-used bakes until at most `max` remain.
 * Phones call this after each focus bake so Safari never pins a
 * catalog-sized canvas set.
 * @param max Entries to keep (at least 1).
 * @param protect Keys that must not be evicted (staged moons).
 * @example
 * trimSphereTextureCache(2)
 * trimSphereTextureCache(2, new Set(["reiya"]))
 */
export function trimSphereTextureCache(
  max: number,
  protect?: ReadonlySet<string>
): void {
  const keep = Math.max(1, max);
  while (textureCache.size > keep) {
    let evicted = false;
    for (const key of textureCache.keys()) {
      if (protect?.has(key)) continue;
      releaseTextureKey(key);
      evicted = true;
      break;
    }
    if (!evicted) break;
  }
}

/**
 * @brief Returns a bake that has already finished, if any.
 * @param url Artwork URL.
 * @param size Strip height.
 * @returns Texture, null if the bake failed, or undefined if still loading.
 */
export function resolvedSphereTexture(
  url: string,
  size: number
): SphereTexture | null | undefined {
  return resolvedTextures.get(`${url}@${size}`);
}

/**
 * @brief Texture for a moon: local cache first, then a finished bake.
 * rAF must use this so a peek-only mount still keeps spinning.
 * @param url Artwork URL.
 * @param size Ambient strip height.
 * @param local React/rAF texture map.
 * @param localKey Moon key in `local`.
 * @returns Baked texture or null.
 */
export function lookupSphereTexture(
  url: string | undefined,
  size: number,
  local?: Map<string, SphereTexture> | null,
  localKey?: string
): SphereTexture | null {
  if (local && localKey) {
    const hit = local.get(localKey);
    if (hit) return hit;
  }
  if (!url) return null;
  return resolvedSphereTexture(url, size) ?? null;
}

/**
 * @brief LUT that matches the baked strip, even if the caller passed
 * a leftover table from a smaller canvas.
 * @param tex Baked strip.
 * @param lut Suggested table.
 * @returns Table whose size equals `tex.strip.height`.
 */
export function resolveWarpLUT(tex: SphereTexture, lut: WarpLUT): WarpLUT {
  return tex.strip.height === lut.size ? lut : getWarpLUT(tex.strip.height);
}

/**
 * @brief Wraps a spin phase onto [0, 1).
 * @param t Any real.
 * @returns Fraction in [0, 1).
 */
export function wrapPhase(t: number): number {
  return ((t % 1) + 1) % 1;
}

/**
 * @brief Wrap phase that puts art on the camera-facing meridian when
 * the mesh is not billboarded. Matches shader `atan(n.x, n.z)`.
 * @param x Object-space direction toward the camera (X).
 * @param z Object-space direction toward the camera (Z).
 * @returns Phase in [0, 1).
 */
export function facingPhaseFromDir(x: number, z: number): number {
  if (x * x + z * z < 1e-12) return 0;
  return wrapPhase(-Math.atan2(x, z) / (Math.PI * 2));
}

/**
 * @brief Texture longitude for one moon. Every moon keeps a day-length
 * ambient spin; featured moons add the turntable boost on top so a
 * close-up never freezes the texture.
 * @param elapsedMs Time since the tour started.
 * @param periodSec Ambient spin period.
 * @param reverse When true, ambient spin is retrograde.
 * @param featured Unused; boost is always applied so a zoom-out cannot
 * snap the wrap back to ambient-only.
 * @param boost Extra revolutions accumulated during a close-up (0–1).
 * @param align Extra phase offset (used to start a hold face-on).
 * @returns Phase in [0, 1).
 * @example
 * moonSpinPhase(15000, 60, false, true, 0.2) === 0.45
 */
export function moonSpinPhase(
  elapsedMs: number,
  periodSec: number,
  reverse: boolean,
  featured: boolean,
  boost: number,
  align = 0
): number {
  const period = Math.max(1, periodSec);
  const base = (elapsedMs / 1000 / period) % 1;
  const ambient = reverse ? 1 - base : base;
  return wrapPhase(ambient + boost + align);
}

/**
 * @brief Phase offset that puts the artwork on the camera-facing
 * meridian right now. A hold adds this once so the product starts
 * face-on, then the day spin and turntable continue from there.
 * @param elapsedMs Time since the tour started.
 * @param periodSec Ambient spin period.
 * @param reverse When true, ambient spin is retrograde.
 * @returns Align value for `moonSpinPhase`.
 * @example
 * moonSpinPhase(8000, 48, false, false, 0, faceOnAlign(8000, 48, false)) === 0
 */
export function faceOnAlign(
  elapsedMs: number,
  periodSec: number,
  reverse: boolean
): number {
  return wrapPhase(-moonSpinPhase(elapsedMs, periodSec, reverse, false, 0));
}

/**
 * @brief Shortest signed phase step in (−0.5, 0.5].
 * @param from Start phase.
 * @param to End phase.
 * @returns Delta in turns.
 */
export function phaseDelta(from: number, to: number): number {
  return ((((to - from) % 1) + 1.5) % 1) - 0.5;
}

/**
 * @brief Interpolates phase along the shortest arc.
 * @param from Start phase.
 * @param to End phase.
 * @param t Mix 0–1.
 * @returns Phase in [0, 1).
 */
export function lerpPhase(from: number, to: number, t: number): number {
  return wrapPhase(from + phaseDelta(from, to) * t);
}

/**
 * @brief Smoothstep progress for a spin-to-face-on hop.
 * @param elapsedMs Tour clock.
 * @param startMs When the hop began.
 * @param durMs Hop length (camera travel).
 * @returns 0–1, 1 after the camera arrives.
 */
export function spinArriveProgress(
  elapsedMs: number,
  startMs: number,
  durMs: number
): number {
  if (durMs <= 0) return 1;
  const u = Math.min(1, Math.max(0, (elapsedMs - startMs) / durMs));
  return u * u * (3 - 2 * u);
}

/**
 * @brief Phase that reaches `target` when the camera does, without a snap.
 * @param elapsedMs Tour clock.
 * @param from Phase when the hop started.
 * @param startMs When the hop began.
 * @param durMs Hop length (camera travel).
 * @param target Face-on phase (0).
 * @returns Current phase and whether the hop finished.
 */
export function arrivingSpinPhase(
  elapsedMs: number,
  from: number,
  startMs: number,
  durMs: number,
  target = 0
): { phase: number; done: boolean } {
  const t = spinArriveProgress(elapsedMs, startMs, durMs);
  return { phase: lerpPhase(from, target, t), done: t >= 1 };
}

/**
 * @brief Align that keeps `moonSpinPhase` at 0 after a hop lands.
 * @param elapsedMs Tour clock at arrival.
 * @param periodSec Ambient spin period.
 * @param reverse When true, ambient spin is retrograde.
 * @param boost Turntable offset already applied (usually 0).
 * @returns Align value for `moonSpinPhase`.
 */
export function continueAlignAfterArrive(
  elapsedMs: number,
  periodSec: number,
  reverse: boolean,
  boost = 0
): number {
  return wrapPhase(faceOnAlign(elapsedMs, periodSec, reverse) - boost);
}

/**
 * @brief Loads an image and bakes its wrap strip, cached per url+size in
 * an LRU capped at TEXTURE_CACHE_MAX (older bakes are released, canvas
 * backing store included). Cross-origin images are requested anonymously;
 * same-origin and `/_next/image` URLs are not, so a missing ACAO header
 * cannot taint the canvas. A tainted or failed load resolves null and
 * the moon stays an untextured tinted sphere.
 * @param url Artwork URL.
 * @param size Strip height in px.
 * @param options Forwarded to bakeSphereStrip.
 * @returns Baked texture or null on any failure.
 * @example
 * const tex = await loadSphereTexture("/img/product.png", 224);
 */
export function loadSphereTexture(
  url: string,
  size: number,
  options: { surfaceShade?: boolean } = {}
): Promise<SphereTexture | null> {
  const key = `${url}@${size}${options.surfaceShade === false ? ":raw" : ""}`;
  const hit = textureCache.get(key);
  if (hit) {
    touchTextureKey(key);
    return hit;
  }
  let settle: (tex: SphereTexture | null) => void = () => undefined;
  const pending = new Promise<SphereTexture | null>((resolve) => {
    settle = resolve;
  });
  // Cache before the load starts so a synchronously-firing onload
  // (node-canvas in tests) still finds its own entry in `finish`.
  textureCache.set(key, pending);
  evictStaleTextures();

  /**
   * @brief Caches and settles one finished bake (or failure).
   * @param baked Texture, or null when the load or bake failed.
   */
  const finish = (baked: SphereTexture | null) => {
    // Skip the cache when this key was evicted mid-flight; a later
    // request re-bakes instead of resurrecting an orphan entry.
    if (textureCache.get(key) === pending) {
      resolvedTextures.set(key, baked);
    }
    settle(baked);
  };
  const img = new Image();
  if (imageUrlNeedsCrossOrigin(url)) {
    img.crossOrigin = "anonymous";
  }
  img.onload = () => {
    try {
      finish(bakeSphereStrip(img, size, options));
    } catch {
      finish(null);
    }
  };
  img.onerror = () => finish(null);
  img.src = url;
  return pending;
}
