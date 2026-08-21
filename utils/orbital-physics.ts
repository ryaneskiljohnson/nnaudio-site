/**
 * @fileoverview Analytic Kepler orbital physics for the homepage solar
 * system. Every body lives in packed Float32Arrays (structure-of-arrays)
 * and is advanced with a closed-form Kepler solve, so the per-frame cost
 * is O(bodies) with zero allocation and no numeric drift — positions are
 * exact for any elapsed time, which the looping camera tour relies on.
 * @module utils/orbital-physics
 */

/** Kepler's third law scale: T = KEPLER_K * a^1.5 seconds (a in half-span fractions). */
const KEPLER_K = 170;
/** Fastest allowed orbit so close moons stay watchable. */
const MIN_PERIOD_SEC = 16;
const TWO_PI = Math.PI * 2;

/** Orbit definition for one body entering the system. */
export interface OrbitalSeed {
  /** Stable product key; hashed into inclination and orientation. */
  key: string;
  /** Semi-major axis. Positions come out in the same unit. */
  radius: number;
  /** Apparent angle at t=0 in degrees; 0 = toward the camera. */
  startDeg: number;
  /** Orbital period in seconds. */
  periodSec: number;
}

/** Packed state for every orbiting body. */
export interface OrbitalSystem {
  count: number;
  /** Body keys in array order. */
  keys: string[];
  /** Semi-major axes. */
  a: Float32Array;
  /** Eccentricities. */
  e: Float32Array;
  /** Mean motion, rad/s. */
  n: Float32Array;
  /** Mean anomaly at epoch, rad. */
  m0: Float32Array;
  /** Argument of periapsis, rad. */
  peri: Float32Array;
  /** Apsidal precession rate, rad/s: the ellipse itself slowly rotates. */
  prec: Float32Array;
  cosNode: Float32Array;
  sinNode: Float32Array;
  cosI: Float32Array;
  sinI: Float32Array;
  /** x, height (up), z (toward camera) triplets written by stepOrbitalSystem. */
  pos: Float32Array;
}

/** Screen-space lighting for one sphere. */
export interface SphereShadeOut {
  /** Specular highlight x as a CSS percent (toward the sun). */
  litX: number;
  /** Specular highlight y as a CSS percent. */
  litY: number;
  /** 0 = fully lit face toward camera, 1 = night side toward camera. */
  shade: number;
}

/**
 * @brief Orbital period from Kepler's third law, clamped for watchability.
 * @param radius Semi-major axis as a fraction of the usable half-span.
 * @returns Period in seconds; closer orbits are faster.
 * @example
 * keplerPeriodSec(0.86) / keplerPeriodSec(0.43) ≈ 2^1.5
 */
export function keplerPeriodSec(radius: number): number {
  return Math.max(
    MIN_PERIOD_SEC,
    KEPLER_K * Math.pow(Math.max(0, radius), 1.5)
  );
}

/**
 * @brief FNV-1a hash of a product key.
 * @param key Product key (slug or id).
 * @returns Deterministic unsigned 32-bit integer.
 * @example
 * hashOrbitKey("cymasynth") === hashOrbitKey("cymasynth")
 */
export function hashOrbitKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @brief Deterministic PRNG (mulberry32).
 * @param seed Integer seed.
 * @returns Generator of floats in [0, 1).
 */
function mulberry32(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @brief Solves Kepler's equation M = E − e·sin(E) for E via Newton's method.
 * @param M Mean anomaly, rad.
 * @param e Eccentricity (0 ≤ e < 1).
 * @returns Eccentric anomaly, rad.
 * @example
 * solveKepler(1.3, 0) === 1.3
 */
export function solveKepler(M: number, e: number): number {
  let E = M;
  for (let k = 0; k < 4; k += 1) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

/**
 * @brief Builds the packed orbital system. Inclination and orbit
 * orientation are hashed from each product key (shared per ring so the
 * orbit stroke hits every moon on it). Orbits are circular so that
 * stroke can intersect the planets. The epoch anomaly is chosen so the
 * apparent angle at t=0 matches `startDeg` (used by the credits camera).
 * @param seeds One orbit definition per body, in render order.
 * @returns System ready for stepOrbitalSystem.
 * @example
 * createOrbitalSystem([{ key: "a", radius: 200, startDeg: 0, periodSec: 40 }])
 */
export function createOrbitalSystem(seeds: OrbitalSeed[]): OrbitalSystem {
  const count = seeds.length;
  const sys: OrbitalSystem = {
    count,
    keys: seeds.map((seed) => seed.key),
    a: new Float32Array(count),
    e: new Float32Array(count),
    n: new Float32Array(count),
    m0: new Float32Array(count),
    peri: new Float32Array(count),
    prec: new Float32Array(count),
    cosNode: new Float32Array(count),
    sinNode: new Float32Array(count),
    cosI: new Float32Array(count),
    sinI: new Float32Array(count),
    pos: new Float32Array(count * 3),
  };

  seeds.forEach((seed, i) => {
    const rand = mulberry32(hashOrbitKey(seed.key));
    // One plane per ring so the faint orbit line matches every planet on it.
    const plane = mulberry32(hashOrbitKey(`plane:${Math.round(seed.radius)}`));
    // Circular on purpose: a faint orbit stroke can only intersect the
    // moon if the moon stays on that circle. A few percent of
    // eccentricity looked organic and left every planet floating off
    // its line.
    const ecc = 0;
    const incl = (plane() < 0.5 ? -1 : 1) * (0.12 + plane() * 0.16);
    const periV = rand() * TWO_PI;
    const nodeV = plane() * TWO_PI;
    sys.a[i] = seed.radius;
    sys.e[i] = ecc;
    sys.n[i] = TWO_PI / Math.max(1, seed.periodSec);
    sys.peri[i] = periV;
    sys.prec[i] = (0.0012 + rand() * 0.0035) * (rand() < 0.5 ? -1 : 1);
    sys.cosNode[i] = Math.cos(nodeV);
    sys.sinNode[i] = Math.sin(nodeV);
    sys.cosI[i] = Math.cos(incl);
    sys.sinI[i] = Math.sin(incl);
    // ν ≈ M for small e, so apparent angle ≈ node + peri + M at epoch.
    sys.m0[i] = (seed.startDeg * Math.PI) / 180 - periV - nodeV;
  });

  return sys;
}

/**
 * @brief Node and inclination of one body's orbital plane, in degrees.
 * @param sys Packed system.
 * @param i Body index.
 * @returns Yaw of the ascending node and tilt off the XZ plane.
 */
export function orbitPlaneTilt(
  sys: OrbitalSystem,
  i: number
): { nodeDeg: number; inclDeg: number } {
  return {
    nodeDeg: (Math.atan2(sys.sinNode[i], sys.cosNode[i]) * 180) / Math.PI,
    inclDeg: (Math.atan2(sys.sinI[i], sys.cosI[i]) * 180) / Math.PI,
  };
}

/**
 * @brief Unit axes of one orbital plane in CSS space (X right, Y down,
 * Z toward camera). Local ring +X maps to `ex`, local +Y (down) to `ey`,
 * matching `stepOrbitalSystem` at λ = 0° and 90°.
 * @param sinNode Sine of the ascending node.
 * @param cosNode Cosine of the ascending node.
 * @param sinI Sine of inclination.
 * @param cosI Cosine of inclination.
 * @returns Orthonormal-enough plane basis in CSS coordinates.
 * @example
 * orbitRingBasisCss(0, 1, 0, 1).ex[2] === 1
 */
export function orbitRingBasisCss(
  sinNode: number,
  cosNode: number,
  sinI: number,
  cosI: number
): { ex: [number, number, number]; ey: [number, number, number] } {
  return {
    ex: [sinNode, 0, cosNode],
    ey: [cosNode * cosI, -sinI, -sinNode * cosI],
  };
}

/**
 * @brief CSS `matrix3d` that seats a centered 2D circle of radius
 * `localR` onto the Kepler circle of radius `a`, so the stroke
 * intersects the moon.
 * @param a Semi-major axis in world px.
 * @param sinNode Sine of the ascending node.
 * @param cosNode Cosine of the ascending node.
 * @param sinI Sine of inclination.
 * @param cosI Cosine of inclination.
 * @param localR Circle radius in the SVG's own pixels.
 * @returns matrix3d(...) string.
 */
export function orbitRingMatrix3d(
  a: number,
  sinNode: number,
  cosNode: number,
  sinI: number,
  cosI: number,
  localR: number
): string {
  const s = a / Math.max(1, localR);
  const { ex, ey } = orbitRingBasisCss(sinNode, cosNode, sinI, cosI);
  const x1 = ex[0] * s;
  const y1 = ex[1] * s;
  const z1 = ex[2] * s;
  const x2 = ey[0] * s;
  const y2 = ey[1] * s;
  const z2 = ey[2] * s;
  const x3 = y1 * z2 - z1 * y2;
  const y3 = z1 * x2 - x1 * z2;
  const z3 = x1 * y2 - y1 * x2;
  return `matrix3d(${x1},${y1},${z1},0,${x2},${y2},${z2},0,${x3},${y3},${z3},0,0,0,0,1)`;
}

/** One hole punched in an orbit stroke so it does not cross a planet. */
export interface OrbitRingGap {
  /** Angle around the ring in radians, 0 at local +X (CSS). */
  angle: number;
  /** Half-width of the hole in radians. */
  half: number;
}

/**
 * @brief Angle of a CSS-space point around an orbit ring.
 * @param x CSS x (screen right).
 * @param y CSS y (down).
 * @param z CSS z (toward camera).
 * @param ex Ring +X axis from orbitRingBasisCss.
 * @param ey Ring +Y axis from orbitRingBasisCss.
 * @returns Angle in (−π, π], matching an SVG circle from 3 o'clock.
 * @example
 * orbitRingAngleCss(0, 0, 100, [0, 0, 1], [1, 0, 0]) === 0
 */
export function orbitRingAngleCss(
  x: number,
  y: number,
  z: number,
  ex: [number, number, number],
  ey: [number, number, number]
): number {
  const px = x * ex[0] + y * ex[1] + z * ex[2];
  const py = x * ey[0] + y * ey[1] + z * ey[2];
  return Math.atan2(py, px);
}

/**
 * @brief Half-angle of the stroke hole that clears a moon of radius
 * `visualR` on a ring of radius `a`.
 * @param visualR Moon radius in world px (plus a small pad is applied).
 * @param a Ring radius in world px.
 * @returns Radians, clamped so a huge close-up cannot erase the ring.
 */
export function orbitRingGapHalf(visualR: number, a: number): number {
  const pad = 8;
  return Math.asin(
    Math.min(0.92, Math.max(0, (visualR + pad) / Math.max(1, a)))
  );
}

/**
 * @brief SVG stroke-dasharray that skips each planet seat. The pattern
 * sums to `circ` so it does not repeat mid-ring.
 * @param circ Circle path length (2π × local r).
 * @param gaps Moon seats and hole half-widths.
 * @returns dasharray string and dashoffset (always 0; holes are baked in).
 * @example
 * orbitRingDash(100, []).dasharray === "100"
 */
export function orbitRingDash(
  circ: number,
  gaps: readonly OrbitRingGap[]
): { dasharray: string; dashoffset: number } {
  if (circ <= 0 || gaps.length === 0) {
    return { dasharray: `${Math.max(0, circ)}`, dashoffset: 0 };
  }

  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < gaps.length; i += 1) {
    const half = Math.max(0, Math.min(Math.PI * 0.95, gaps[i].half));
    if (half * 2 >= TWO_PI * 0.98) {
      return { dasharray: `0 ${circ}`, dashoffset: 0 };
    }
    const a0 = ((gaps[i].angle - half) % TWO_PI + TWO_PI) % TWO_PI;
    const a1 = ((gaps[i].angle + half) % TWO_PI + TWO_PI) % TWO_PI;
    if (a0 <= a1) {
      ranges.push({ start: a0, end: a1 });
    } else {
      ranges.push({ start: a0, end: TWO_PI });
      ranges.push({ start: 0, end: a1 });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (let i = 0; i < ranges.length; i += 1) {
    const r = ranges[i];
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ start: r.start, end: r.end });
    else last.end = Math.max(last.end, r.end);
  }

  const parts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < merged.length; i += 1) {
    const r = merged[i];
    if (r.start > cursor) {
      parts.push(((r.start - cursor) / TWO_PI) * circ);
    } else if (parts.length === 0) {
      parts.push(0);
    }
    parts.push(((r.end - Math.max(cursor, r.start)) / TWO_PI) * circ);
    cursor = r.end;
  }
  if (cursor < TWO_PI) {
    parts.push(((TWO_PI - cursor) / TWO_PI) * circ);
  }

  return {
    dasharray: parts.map((p) => p.toFixed(2)).join(" "),
    dashoffset: 0,
  };
}

/**
 * @brief Mild axial tilt for a moon. Stable per product; about 4–16°.
 * @param key Product key.
 * @returns View-space rotateX / rotateZ in degrees.
 * @example
 * moonAxialTilt("reiya").tiltX !== moonAxialTilt("curio").tiltX
 */
export function moonAxialTilt(key: string): { tiltX: number; tiltZ: number } {
  const h = hashOrbitKey(`tilt:${key}`);
  const lean = 4 + ((h % 1200) / 1200) * 12;
  const ang = ((h >>> 11) % 360) * (Math.PI / 180);
  return {
    tiltX: Math.sin(ang) * lean,
    tiltZ: Math.cos(ang) * lean,
  };
}

/**
 * @brief Advances every body to time t and writes positions into `sys.pos`.
 * Closed-form: mean anomaly → Kepler solve → true anomaly → apsidal
 * precession → tilt by inclination → rotate by the ascending node.
 * No allocation.
 * @param sys System from createOrbitalSystem.
 * @param tSec Elapsed time in seconds (any value).
 * @returns The shared `sys.pos` buffer: [x, height, z] per body.
 * @note x is screen-right, height is up, z is toward the camera.
 */
export function stepOrbitalSystem(
  sys: OrbitalSystem,
  tSec: number
): Float32Array {
  const { count, a, e, n, m0, peri, prec, cosNode, sinNode, cosI, sinI, pos } =
    sys;
  for (let i = 0; i < count; i += 1) {
    const ecc = e[i];
    const E = solveKepler(m0[i] + n[i] * tSec, ecc);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const r = a[i] * (1 - ecc * cosE);
    const nu = Math.atan2(Math.sqrt(1 - ecc * ecc) * sinE, cosE - ecc);
    const lam = nu + peri[i] + prec[i] * tSec;
    const inX = r * Math.cos(lam);
    const swing = r * Math.sin(lam);
    const inY = swing * cosI[i];
    pos[i * 3] = sinNode[i] * inX + cosNode[i] * inY;
    pos[i * 3 + 1] = swing * sinI[i];
    pos[i * 3 + 2] = cosNode[i] * inX - sinNode[i] * inY;
  }
  return pos;
}

/**
 * @brief Sun-relative sphere lighting. The sun sits at the origin, so the
 * lit hemisphere always faces the center: side moons are half-lit, moons
 * behind the sun show a full face, and moons in front of it show a dark
 * "new moon" face rimmed by the corona.
 * @param x Camera-space x (screen right), same unit as z.
 * @param height Out-of-plane height (up).
 * @param z Camera-space depth toward the viewer.
 * @param out Reused output record (no allocation per call).
 * @note litY grows downward (CSS percent): a moon above the plane is lit
 * from below, so its highlight sits on the lower half of the face.
 * @example
 * sphereShade(0, 0, -100, out); out.shade === 0 // fully lit
 */
export function sphereShade(
  x: number,
  height: number,
  z: number,
  out: SphereShadeOut
): void {
  const len = Math.sqrt(x * x + height * height + z * z) || 1;
  out.litX = 50 - (x / len) * 34;
  out.litY = 50 + (height / len) * 34;
  out.shade = (z / len + 1) / 2;
}
