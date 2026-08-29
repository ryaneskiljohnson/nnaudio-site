/**
 * @fileoverview Orbital layout for homepage products as moons around
 * Cymasphere. Rings, Kepler-derived periods, and camera-tour math for the
 * VFX renderer. Real orbital motion lives in utils/orbital-physics.
 * @module utils/circuit-network-layout
 */

import { hashOrbitKey, keplerPeriodSec } from "@/utils/orbital-physics";

/** One catalog product assigned to an orbit. */
export interface MoonPlacement {
  /** Source product index. */
  index: number;
  /** 0 = innermost catalog ring (CymaSynth is separate). */
  ring: number;
  /** Orbit radius as a 0–1 fraction of the usable half-span. */
  radius: number;
  /** Starting angle in degrees (0 = right, CCW). */
  startDeg: number;
  /** Full revolution time in seconds. Inner moons are faster. */
  periodSec: number;
  /** Sphere diameter in CSS pixels (w and h match). */
  size: { w: number; h: number };
}

interface RingSpec {
  radius: number;
  take: number;
}

/** Stable size multipliers so neighboring moons are not twins. */
const SIZE_WAVE = [0.7, 1.4, 0.86, 1.18, 1.9, 0.76, 1.08, 2.2, 0.92, 1.28, 1.65, 0.8];

/**
 * @brief Sphere diameter for one catalog moon. Sizes vary like a cast.
 * @param index Product index.
 * @param ring Orbit ring.
 * @param mobile Compact range.
 * @returns Square diameter in CSS pixels.
 */
export function moonDiameter(
  index: number,
  ring: number,
  mobile: boolean
): number {
  const bases = mobile ? [42, 32, 24] : [54, 42, 34, 26];
  const base = bases[Math.min(Math.max(ring, 0), bases.length - 1)];
  const d = Math.round(base * SIZE_WAVE[((index % SIZE_WAVE.length) + SIZE_WAVE.length) % SIZE_WAVE.length]);
  return Math.max(mobile ? 20 : 22, Math.min(mobile ? 96 : 128, d));
}

/**
 * @brief Builds ring specs that fill the system and leave room for CymaSynth.
 * @param count Catalog moons (not including CymaSynth).
 * @param mobile Compact rings and sizes.
 * @returns Ring list whose `take` values sum to `count`.
 */
function catalogRings(count: number, mobile: boolean): RingSpec[] {
  if (count <= 0) return [];
  // Halfway between the original tight rings and the far solar-system
  // set: the sun still shrinks on a trip out, without a huge empty gap.
  const specs = mobile
    ? [
        { radius: 1.8, take: Math.min(4, count) },
        { radius: 3.1, take: Math.min(8, Math.max(0, count - 4)) },
        { radius: 5.0, take: Math.min(12, Math.max(0, count - 12)) },
        { radius: 7.6, take: Math.max(0, count - 24) },
      ]
    : [
        { radius: 2.2, take: Math.min(5, count) },
        { radius: 3.85, take: Math.min(8, Math.max(0, count - 5)) },
        { radius: 6.15, take: Math.min(12, Math.max(0, count - 13)) },
        { radius: 9.15, take: Math.min(18, Math.max(0, count - 25)) },
        { radius: 13.2, take: Math.max(0, count - 43) },
      ];
  return specs.filter((ring) => ring.take > 0);
}

/**
 * @brief Evenly spaces moons around concentric orbits. Periods follow
 * Kepler's third law, so closer rings move faster automatically.
 * @param count How many catalog products to place.
 * @param mobile Compact ring set.
 * @returns One placement per product, inner ring first.
 * @example
 * moonPlacements(70, false).length === 70
 */
export function moonPlacements(
  count: number,
  mobile: boolean
): MoonPlacement[] {
  if (count <= 0) return [];
  const rings = catalogRings(count, mobile);
  const out: MoonPlacement[] = [];
  let cursor = 0;

  rings.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.take && cursor < count; i += 1) {
      const startDeg = (i / ring.take) * 360 + ringIndex * 11;
      out.push({
        index: cursor,
        ring: ringIndex,
        radius: ring.radius,
        startDeg,
        periodSec: keplerPeriodSec(Math.max(0.32, ring.radius * 0.18)),
        size: {
          w: moonDiameter(cursor, ringIndex, mobile),
          h: moonDiameter(cursor, ringIndex, mobile),
        },
      });
      cursor += 1;
    }
  });

  return out;
}

/**
 * @brief Closed SVG path for one sine-modulated ring (an oscillator).
 * Radial displacement is A·sin(cycles·θ) so the loop reads as a waveform
 * wrapped around CymaSynth, not a perfect circle.
 * @param cx Path center x.
 * @param cy Path center y.
 * @param radius Mean radius.
 * @param amplitude Sine amplitude in the same units as radius.
 * @param cycles Integer number of waves around the ring (harmonic).
 * @param steps Samples around the loop. Defaults to 96.
 * @returns SVG path `d` starting at M and closed with Z.
 * @example
 * sineOscillatorRingPath(120, 120, 80, 4, 3)
 */
export function sineOscillatorRingPath(
  cx: number,
  cy: number,
  radius: number,
  amplitude: number,
  cycles: number,
  steps = 96
): string {
  const n = Math.max(12, Math.floor(steps));
  const parts: string[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(cycles * t);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    parts.push(
      `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
    );
  }
  parts.push("Z");
  return parts.join("");
}

/**
 * Shared green for every CymaSynth oscillator ring.
 */
export const CYMASYNTH_OSC_GREEN = "rgba(78, 205, 196, 0.82)";

/**
 * Nested sine-wave rings around CymaSynth. Radii stay tight so they
 * read as one oscillator family; tiltX/tiltZ splay a few onto nearby
 * axes without breaking the nest. Paths are authored in a 240×240
 * viewBox; CircuitNetwork rasterizes the plate larger so 3D scale
 * does not pixelate the strokes.
 */
export const CYMASYNTH_OSC_RINGS: ReadonlyArray<{
  cycles: number;
  radius: number;
  amplitude: number;
  duration: string;
  /** Extra rotateX on this disk, degrees from the shared plate. */
  tiltX: number;
  /** Extra rotateZ on this disk, degrees from the shared plate. */
  tiltZ: number;
}> = [
  { cycles: 3, radius: 64, amplitude: 2.6, duration: "14s", tiltX: 0, tiltZ: 0 },
  { cycles: 4, radius: 70, amplitude: 3.0, duration: "18s", tiltX: 2, tiltZ: 2 },
  { cycles: 5, radius: 76, amplitude: 3.2, duration: "22s", tiltX: -2, tiltZ: -1 },
  { cycles: 6, radius: 82, amplitude: 3.4, duration: "16s", tiltX: 1, tiltZ: -3 },
  { cycles: 7, radius: 88, amplitude: 3.6, duration: "26s", tiltX: -2, tiltZ: 2 },
  { cycles: 8, radius: 94, amplitude: 3.8, duration: "20s", tiltX: 2, tiltZ: -2 },
  { cycles: 9, radius: 100, amplitude: 4.0, duration: "30s", tiltX: -1, tiltZ: 3 },
  { cycles: 11, radius: 106, amplitude: 4.2, duration: "24s", tiltX: 2, tiltZ: 1 },
];

/**
 * Shared rotateX for the CymaSynth oscillator disk in world space.
 */
export const CYMASYNTH_RING_DISK_TILT_DEG = 52;

/**
 * CSS box the oscillator plate is authored against (matches desktop
 * CymaSynth moon diameter). Pose scale is `visualDiameter / moonRef`.
 */
export const CYMASYNTH_RING_PLATE_MOON_PX = 108;

/** ViewBox edge for nested sine oscillator paths. */
export const SYNTH_RING_AUTHOR_PX = 240;

/** Raster edge for the CymaSynth oscillator plate on desktop. */
export const SYNTH_RING_PLATE_DESKTOP_PX = 1280;

/** Smaller plate on phones to limit GPU memory. */
export const SYNTH_RING_PLATE_MOBILE_PX = 512;

/** Matches hero tour `matchMedia` and styled-component mobile rules. */
export const HERO_MOBILE_MAX_WIDTH_PX = 768;

/**
 * @brief Pose scale denominator so a plate of `platePx` matches the moon.
 * @param platePx Rendered CSS edge of the oscillator plate.
 * @returns Moon-diameter reference in the same units as `visualDiameter`.
 * @example
 * synthRingMoonRefPx(SYNTH_RING_PLATE_MOBILE_PX)
 */
export function synthRingMoonRefPx(platePx: number): number {
  return CYMASYNTH_RING_PLATE_MOON_PX * (platePx / SYNTH_RING_AUTHOR_PX);
}

/**
 * @brief CymaSynth sits on the closest, largest orbit.
 * @param mobile Compact sizing.
 * @returns Moon placement for the flagship synth (index unused).
 */
export function cymasynthOrbit(mobile: boolean): MoonPlacement {
  const radius = mobile ? 1.06 : 1.26;
  return {
    index: -1,
    ring: -1,
    radius,
    startDeg: -90,
    periodSec: keplerPeriodSec(Math.max(0.32, radius * 0.18)),
    size: mobile ? { w: 78, h: 78 } : { w: 108, h: 108 },
  };
}

/**
 * @brief Converts an orbit radius fraction into pixels for the measured
 * board. The span mixes both dimensions (biased to the smaller) so wide
 * screens spread the system horizontally, and radii above 1.0 land
 * off-screen — the camera tour is what reveals them.
 * @param radius Fraction of the usable half-span (may exceed 1).
 * @param width Board width.
 * @param height Board height.
 * @returns Pixel radius from the planet center.
 * @example
 * orbitRadiusPx(1.55, 1600, 800)
 */
export function orbitRadiusPx(
  radius: number,
  width: number,
  height: number
): number {
  const span =
    (Math.min(width, height) * 0.6 + Math.max(width, height) * 0.4) / 2;
  return Math.max(48, Math.round(span * radius * 0.92));
}

/**
 * @brief Current orbit angle for a moon.
 * @param startDeg Seat start angle.
 * @param periodSec Revolution time.
 * @param elapsedMs Time since the system started.
 * @returns Radians, 0 at +Z (toward camera).
 * @example
 * moonTheta(0, 40, 10000)
 */
export function moonTheta(
  startDeg: number,
  periodSec: number,
  elapsedMs: number
): number {
  const turns = periodSec <= 0 ? 0 : elapsedMs / 1000 / periodSec;
  return (startDeg * Math.PI) / 180 + turns * Math.PI * 2;
}

/**
 * @brief Depth toward the camera from an orbit angle. 1 is in front.
 * @param theta Orbit radians.
 * @returns Value in [0, 1].
 * @example
 * moonDepth(0) // 1
 */
export function moonDepth(theta: number): number {
  return (Math.cos(theta) + 1) / 2;
}

/** Live world position of one moon (same units as the Kepler system). */
export interface MoonWorldPos {
  x: number;
  height: number;
  z: number;
}

/**
 * @brief Camera yaw/range that puts a world point on the +Z look axis.
 * @param x World x (screen right).
 * @param z World z (toward the camera).
 * @returns Yaw in degrees and the XZ range in px.
 */
export function aimYawAt(x: number, z: number): { rotateY: number; range: number } {
  const range = Math.max(80, Math.hypot(x, z));
  return {
    // CSS rotateY(+90) sends +X toward the camera; match that so the
    // moon sits between the sun and the viewer, not behind the sun.
    rotateY: (Math.atan2(x, z) * 180) / Math.PI,
    range,
  };
}

/**
 * Inspection drift while a product is held. Kept tiny — at 5–6×
 * close-up a 12px truck read as the planet rumbling.
 */
export const FOCUS_TRUCK_PX = 1.2;
/** One inspection circle; long enough to read the product, never parked. */
export const FOCUS_TRUCK_PERIOD_SEC = 22;
/** Sun yaw while Cymasphere is featured — monotonic so the shot never stalls. */
export const SUN_YAW_DEG_PER_SEC = 7;
/**
 * Typical |x| offset of a held product, in px from frame center.
 * The sun (scene origin) always projects to dead center, so aiming the
 * moon exactly on-axis eclipsed Cymasphere on every hold. Sign and a
 * little magnitude come from holdFrameOffset so some planets sit left.
 */
export const ECLIPSE_OFFSET_X_PX = 170;
/**
 * Typical y offset of a held product, in px (CSS down). Negative sits
 * the planet a little above center so it does not read as bottom-heavy.
 */
export const ECLIPSE_OFFSET_Y_PX = -22;

/**
 * @brief Stable per-product framing so each hold sits off the sun, but
 * not always to the same side. X flips left/right from the key; Y stays
 * a little above center with a small hash jitter.
 * @param key Credit / product key.
 * @param viewHalfW Half the frame width in px; caps the x offset.
 * @returns Screen offset (x right, y down) for lookAtMoon.
 * @example
 * holdFrameOffset("reiya").x !== holdFrameOffset("curio").x
 */
export function holdFrameOffset(
  key: string,
  viewHalfW = 620
): { x: number; y: number } {
  const h = hashOrbitKey(`frame:${key}`);
  const xCap = Math.min(ECLIPSE_OFFSET_X_PX, viewHalfW * 0.3);
  const xScale = 0.74 + ((h >>> 8) % 1000) / 1000 * 0.26;
  const x = ((h & 1) === 0 ? 1 : -1) * xCap * xScale;
  const yJitter = (((h >>> 16) % 1000) / 1000 - 0.5) * 20;
  const yCap = Math.min(36, viewHalfW * 0.08);
  const y = Math.max(-yCap, Math.min(yCap, ECLIPSE_OFFSET_Y_PX + yJitter));
  return { x, y };
}

/**
 * @brief How much the close-up dolly magnifies a held moon. Small moons
 * get a longer push-in so every product reads large in frame. `targetPx`
 * is capped on narrow (mobile) frames so a hold does not overflow.
 * @param size Moon diameter in px.
 * @param targetPx Apparent disk size to aim for (default 560).
 * @returns Apparent scale factor at the hold (≥ 2.6).
 * @example
 * closeupMagnification(28) > closeupMagnification(120)
 */
export function closeupMagnification(size: number, targetPx = 560): number {
  const target = Math.max(220, targetPx);
  const disk = Math.max(24, size);
  // Apparent size is `size * mag`. Dividing by `size * 2.4` only filled
  // ~230px — an orbit flyby. Aim at `target` so the hold is the planet.
  const mag = target / disk;
  const maxMag = Math.min(14, TOUR_PERSPECTIVE_PX / (disk * 0.55 + 12));
  return Math.min(maxMag, Math.max(3.4, mag));
}

/**
 * @brief CSS origin for the hold wrapper so the featured moon sits at
 * (0,0,0) in that layer. Pair with posing moons at `world - focus`.
 * @param focus Live Kepler seat of the featured moon.
 * @returns CSS translation (y down) equal to the moon's world seat.
 */
export function holdOriginCss(focus: MoonWorldPos): {
  x: number;
  y: number;
  z: number;
} {
  return { x: focus.x, y: -focus.height, z: focus.z };
}

/**
 * @brief Net CSS translation for a moon when hold recentering is active.
 * `T(origin) · T(world − focus)` must equal `T(world)` so hops do not jump.
 * @param focus Live Kepler seat of the featured moon.
 * @param world Live Kepler seat of the moon being posed.
 * @returns Unshifted CSS translate components (y down).
 */
export function moonHoldNetCss(
  focus: MoonWorldPos,
  world: MoonWorldPos
): { x: number; y: number; z: number } {
  const origin = holdOriginCss(focus);
  const localX = world.x - focus.x;
  const localY = -(world.height - focus.height);
  const localZ = world.z - focus.z;
  return {
    x: origin.x + localX,
    y: origin.y + localY,
    z: origin.z + localZ,
  };
}

/**
 * @brief Whether the tour is in a stable moon hold (not sun, not travel).
 * `creditOpacity` is 0 during travel legs — gating on it avoids snapping
 * the follow camera mid-hop when `creditsBlend` is already high.
 * @param cam Current tour camera sample.
 * @param creditsBlend Client-side card blend weight (0–1).
 * @returns True when snap/recenter should engage.
 */
export function isStableMoonHold(cam: TourCamera, creditsBlend: number): boolean {
  return (
    creditsBlend > 0.65 &&
    cam.focusKey != null &&
    cam.focusKey !== SUN_FOCUS_KEY &&
    cam.creditOpacity > 0.12
  );
}

/**
 * @brief Applies the scene's yaw-then-pitch to a world point.
 * @param px CSS x.
 * @param py CSS y (down).
 * @param pz CSS z (toward the camera).
 * @param rotateX Pitch in degrees.
 * @param rotateY Yaw in degrees.
 * @returns Rotated point.
 */
function viewRotate(
  px: number,
  py: number,
  pz: number,
  rotateX: number,
  rotateY: number
): { x: number; y: number; z: number } {
  const ry = (rotateY * Math.PI) / 180;
  const rx = (rotateX * Math.PI) / 180;
  const x1 = px * Math.cos(ry) - pz * Math.sin(ry);
  const z1 = px * Math.sin(ry) + pz * Math.cos(ry);
  return {
    x: x1,
    y: py * Math.cos(rx) - z1 * Math.sin(rx),
    z: py * Math.sin(rx) + z1 * Math.cos(rx),
  };
}

/**
 * @brief Pitch, yaw, and dolly that frame a moon in close-up. The base
 * aim is a true look-at, then yaw/pitch are nudged so the moon renders
 * `eclipseXPx` right and `eclipseYPx` down from frame center — the sun
 * sits at dead center, so an exact look-at eclipsed it behind every hold.
 * A slow truck around the look-at keeps the camera moving; it never
 * parks, even when the moon itself is almost still.
 * @param x World x (screen right).
 * @param height World height (up from the ecliptic).
 * @param z World z (toward the camera).
 * @param size Moon diameter in px; drives how close we dolly.
 * @param elapsedMs Tour time; drives the inspection truck. 0 = no offset.
 * @param eclipseXPx On-screen offset right of center for the moon.
 * @param eclipseYPx On-screen offset down from center for the moon.
 * @param targetPx Apparent disk size for the dolly (narrow frames pass less).
 * @returns Pose framing the moon just off the sun's screen position.
 * @example
 * const pose = lookAtMoon(400, 80, 0, 64, 0, 0, 0);
 * // pose.rotateY === 90, pose.rotateX === atan2(-80, 400) in deg
 */
export function lookAtMoon(
  x: number,
  height: number,
  z: number,
  size: number,
  elapsedMs = 0,
  eclipseXPx = ECLIPSE_OFFSET_X_PX,
  eclipseYPx = ECLIPSE_OFFSET_Y_PX,
  targetPx = 560
): Pick<
  TourCamera,
  "rotateX" | "rotateY" | "rotateZ" | "translateX" | "translateY" | "translateZ"
> {
  const theta =
    (elapsedMs / 1000) * ((Math.PI * 2) / FOCUS_TRUCK_PERIOD_SEC);
  let rightX = z;
  let rightZ = -x;
  const rightLen = Math.hypot(rightX, rightZ);
  if (rightLen < 1e-6) {
    rightX = 1;
    rightZ = 0;
  } else {
    rightX /= rightLen;
    rightZ /= rightLen;
  }
  const camX = FOCUS_TRUCK_PX * Math.sin(theta) * rightX;
  const camY = FOCUS_TRUCK_PX * (1 - Math.cos(theta)) * 0.62;
  const camZ = FOCUS_TRUCK_PX * Math.sin(theta) * rightZ;
  const lx = x - camX;
  const lh = height + camY;
  const lz = z - camZ;
  const range = Math.max(80, Math.hypot(lx, lz));
  const lookDist = Math.max(80, Math.hypot(lx, lh, lz));
  const mag = closeupMagnification(size, targetPx);
  // Perspective magnifies camera-space offsets by `mag` at the hold
  // depth, so dividing the target screen offset by mag makes the moon
  // land exactly eclipseXPx/eclipseYPx from center after projection.
  const yawOff = Math.asin(
    Math.min(0.45, eclipseXPx / mag / range)
  );
  const pitchOff = Math.asin(
    Math.min(0.45, eclipseYPx / mag / lookDist)
  );
  const rotateY =
    (Math.atan2(lx, lz) * 180) / Math.PI - (yawOff * 180) / Math.PI;
  const rotateX =
    (Math.atan2(-lh, range) * 180) / Math.PI - (pitchOff * 180) / Math.PI;
  const dollyToMoon = TOUR_PERSPECTIVE_PX * (1 - 1 / mag);
  const shifted = viewRotate(camX, camY, camZ, rotateX, rotateY);
  return {
    rotateX,
    rotateY,
    rotateZ: 0,
    translateX: -shifted.x,
    translateY: -shifted.y,
    translateZ: dollyToMoon - lookDist,
  };
}

/** How many moons to mount at once on desktop. */
export const VISIBLE_MOON_BUDGET = 6;
/**
 * Phone stage: the focused moon and the next credit only. Also caps
 * hi-res bakes ({@link MOBILE_TEXTURE_KEEP} in hero-tour aliases this).
 */
export const MOBILE_STAGE_BUDGET = 2;
/** @deprecated Use {@link MOBILE_STAGE_BUDGET}. */
export const VISIBLE_MOON_BUDGET_MOBILE = MOBILE_STAGE_BUDGET;

/** One body the visibility picker can consider. */
export interface VisibleMoonCandidate {
  key: string;
  /** CymaSynth stays a preferred extra when it is on camera. */
  synth?: boolean;
  camSpaceX: number;
  camSpaceZ: number;
  aPx: number;
}

/**
 * @brief Shortest arc between two bearings in radians.
 * @param a First angle.
 * @param b Second angle.
 * @returns Distance in [0, π].
 */
function bearingGap(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/**
 * @brief How worth-drawing a moon is in the current camera. Negative
 * means leave it out (off-screen, clipping, or transiting the sun).
 * @param moon Candidate in camera space.
 * @param sunFocus When true, anything in front of the sun is rejected.
 * @param dollyZ Camera translateZ.
 * @param viewHalfW Half the board width in px.
 * @returns Score, or −1 to drop.
 */
function visibilityScore(
  moon: VisibleMoonCandidate,
  sunFocus: boolean,
  dollyZ: number,
  viewHalfW: number
): number {
  const zTotal = dollyZ + moon.camSpaceZ;
  if (zTotal > TOUR_PERSPECTIVE_PX * 0.78) return -1;
  if (sunFocus) {
    if (moon.camSpaceZ > -moon.aPx * 0.2) return -1;
    return (
      0.4 +
      Math.min(0.35, moon.aPx / 900) -
      Math.min(0.3, Math.abs(moon.camSpaceX) / (moon.aPx + 1))
    );
  }
  const mag =
    TOUR_PERSPECTIVE_PX / Math.max(60, TOUR_PERSPECTIVE_PX - zTotal);
  const screenX = Math.abs(moon.camSpaceX) * mag;
  if (screenX > viewHalfW * 1.2) return -1;
  if (moon.camSpaceZ < -moon.aPx * 0.95) return -1;
  const facing = Math.max(0, (moon.camSpaceZ / moon.aPx + 1) / 2);
  const centered = 1 - Math.min(1, screenX / (viewHalfW * 1.2));
  return facing * 0.5 + centered * 0.5 + (moon.synth ? 0.12 : 0);
}

/**
 * @brief Picks a handful of moons to actually mount. Focus and the next
 * credit always make the cut (except during the Cymasphere hold, when
 * the stage is empty so untextured disks cannot silhouette on the sun).
 * The rest are the most on-camera bodies, spread apart so one ring does
 * not hog the budget. Sticky with `previous` so moons do not flicker.
 * @param moons Every orbiting body this frame.
 * @param opts Camera + tour context.
 * @returns Keys to render, at most `budget` long.
 * @example
 * pickVisibleMoons(moons, { focusKey: "a", nextKey: "b", sunFocus: false, dollyZ: 0, viewHalfW: 600 }).length <= 6
 */
/**
 * @brief True while the tour is flying into or holding Cymasphere.
 * CymaSynth sits on the nearest orbit and would silhouette the sun.
 * @param focusKey Current credit key.
 * @param nextKey Upcoming credit key.
 * @param creditOpacity Card opacity (0 during travel).
 * @returns Whether CymaSynth should stay off-stage.
 */
export function hideSynthForSunApproach(
  focusKey: string | null,
  nextKey: string | null,
  creditOpacity: number
): boolean {
  if (focusKey === SUN_FOCUS_KEY && creditOpacity > 0.12) return true;
  return focusKey == null && nextKey === SUN_FOCUS_KEY;
}

/**
 * @brief Moons that should exist this frame of the credit show.
 * Holds mount only the featured body. The next planet is created when
 * the hop starts — it does not sit on stage for the whole previous hold.
 * @param cam Live tour sample.
 * @returns Product keys to draw, in stage order.
 * @example
 * creditStageKeys({ focusKey: "a", nextKey: "b", traveling: false }) // ["a"]
 */
export function creditStageKeys(
  cam: Pick<TourCamera, "focusKey" | "nextKey" | "traveling">
): string[] {
  const moon = (key: string | null) =>
    key && key !== SUN_FOCUS_KEY ? key : null;
  const focus = moon(cam.focusKey);
  const next = moon(cam.nextKey);
  if (!cam.traveling) return focus ? [focus] : [];
  const keys: string[] = [];
  if (focus) keys.push(focus);
  if (next && next !== focus) keys.push(next);
  return keys;
}

export function pickVisibleMoons(
  moons: VisibleMoonCandidate[],
  opts: {
    focusKey: string | null;
    nextKey: string | null;
    sunFocus: boolean;
    dollyZ: number;
    viewHalfW: number;
    budget?: number;
    previous?: readonly string[];
    /** Drop CymaSynth (intro / Cymasphere hold). */
    hideSynth?: boolean;
    /**
     * When false, the upcoming credit is not forced on stage. Holds pass
     * false so the next planet is created at the hop, not the whole hold.
     */
    forceNext?: boolean;
  }
): string[] {
  const pool = opts.hideSynth ? moons.filter((moon) => !moon.synth) : moons;
  const present = new Set(pool.map((moon) => moon.key));
  const forced = new Set<string>();
  if (opts.focusKey && present.has(opts.focusKey)) forced.add(opts.focusKey);
  const forceNext = opts.forceNext ?? !opts.sunFocus;
  // During the Cymasphere hold, do not force the next planet on stage —
  // an untextured disk against the sun reads as a black glitch.
  if (opts.nextKey && present.has(opts.nextKey) && forceNext) {
    forced.add(opts.nextKey);
  }
  if (opts.sunFocus && !forceNext) return [...forced];
  const budget = Math.max(forced.size, opts.budget ?? VISIBLE_MOON_BUDGET);
  const prev = new Set(opts.previous ?? []);
  const scored = pool.map((moon) => {
    const raw = forced.has(moon.key)
      ? 1e6
      : visibilityScore(moon, opts.sunFocus, opts.dollyZ, opts.viewHalfW);
    const score = !forced.has(moon.key) && prev.has(moon.key) && raw > 0
      ? raw + 0.22
      : raw;
    return {
      key: moon.key,
      score,
      bearing: Math.atan2(moon.camSpaceX, moon.camSpaceZ),
    };
  });
  scored.sort((a, b) => b.score - a.score);

  const picked: string[] = [];
  const bearings: number[] = [];
  for (const item of scored) {
    if (picked.length >= budget) break;
    if (item.score < 0 && !forced.has(item.key)) continue;
    if (!forced.has(item.key) && picked.length >= 3) {
      const crowded = bearings.some((b) => bearingGap(b, item.bearing) < 0.34);
      if (crowded) continue;
    }
    picked.push(item.key);
    bearings.push(item.bearing);
  }
  if (picked.length < budget) {
    for (const item of scored) {
      if (picked.length >= budget) break;
      if (item.score < 0 && !forced.has(item.key)) continue;
      if (!picked.includes(item.key)) picked.push(item.key);
    }
  }
  return picked;
}

/**
 * @brief Moons to draw this tour frame. Intro and moon holds keep a
 * handful of catalog bodies on stage. The Cymasphere hold is empty so
 * disks cannot silhouette the sun. The next credit is created when the
 * hop starts, not for the whole previous hold.
 * @param moons Live Kepler candidates.
 * @param opts Tour camera + previous stage.
 * @returns Keys to mount this frame.
 * @example
 * tourVisibleMoonKeys(moons, { focusKey: SUN_FOCUS_KEY, traveling: false })
 * // []
 */
export function tourVisibleMoonKeys(
  moons: VisibleMoonCandidate[],
  opts: {
    focusKey: string | null;
    nextKey: string | null;
    traveling: boolean;
    dollyZ: number;
    viewHalfW: number;
    budget?: number;
    previous?: readonly string[];
    hideSynth?: boolean;
  }
): string[] {
  const sunHold = opts.focusKey === SUN_FOCUS_KEY && !opts.traveling;
  if (sunHold) return [];
  const focus =
    opts.focusKey && opts.focusKey !== SUN_FOCUS_KEY ? opts.focusKey : null;
  const next =
    opts.nextKey && opts.nextKey !== SUN_FOCUS_KEY ? opts.nextKey : null;
  return pickVisibleMoons(moons, {
    focusKey: focus,
    nextKey: next,
    sunFocus: false,
    forceNext: opts.traveling,
    dollyZ: opts.dollyZ,
    viewHalfW: opts.viewHalfW,
    budget: opts.budget,
    previous: opts.previous,
    hideSynth: opts.hideSynth,
  });
}

/** CSS perspective of the board; camera dolly math depends on it. */
export const TOUR_PERSPECTIVE_PX = 900;
/** Far-galaxy dolly; sky parallax is normalized to 1 here. */
export const TOUR_OPENING_TRANSLATE_Z = -1180;

/**
 * @brief Screen-space sky transform so a dolly over empty space
 * scales the starfield the same way it scales the planets.
 * World-space star plates go edge-on under yaw; this stays a backdrop.
 * @param translateZ Camera dolly (opening = {@link TOUR_OPENING_TRANSLATE_Z}).
 * @param rotateX Pitch in degrees.
 * @param rotateY Yaw in degrees.
 * @returns Pixel slide and scale (1 at the opening galaxy shot).
 * @example
 * skyParallaxCss(0, 0, 0).scale > skyParallaxCss(TOUR_OPENING_TRANSLATE_Z, 0, 0).scale
 */
export function skyParallaxCss(
  translateZ: number,
  rotateX: number,
  rotateY: number
): { x: number; y: number; scale: number } {
  const persp = TOUR_PERSPECTIVE_PX;
  const raw = persp / Math.max(180, persp - translateZ);
  const rest = persp / Math.max(180, persp - TOUR_OPENING_TRANSLATE_Z);
  return {
    x: -rotateY * 2.2,
    y: rotateX * 1.4,
    scale: Math.max(0.7, Math.min(1.6, raw / rest)),
  };
}
/** Opening fly-in before the credits start. */
export const TOUR_INTRO_MS = 5200;
/** How far along TOUR_KEYS the fly-in travels before the first hold. */
export const INTRO_PATH_U = 0.28;
/** Dolly/yaw blend from the fly-in into the Cymasphere hold. */
export const INTRO_BLEND_MS = 1800;
/** Base time on a catalog product: hold plus the journey to the next stop. */
export const CREDIT_MS = 4400;
/** Reserved focus key for the Cymasphere sun hold. */
export const SUN_FOCUS_KEY = "sun-cymasphere";
/** Travel leg at the end of each credit — the flight to the next moon. */
export const CREDIT_TRAVEL_MS = 1800;
/** Wide pull-out after the last credit. */
export const TOUR_OUTRO_MS = 3600;
/** Length of the original galaxy loop when no credits are supplied. */
export const TOUR_DURATION_MS = 28000;

/** One product the camera can hold on like a credit card. */
export interface CreditTarget {
  key: string;
  name: string;
  /** Product page slug for the credit-card link. */
  slug?: string;
  price?: string;
  /** Product tagline shown as the small line above the name. */
  subtitle?: string;
  /** Short product description shown beside the held planet. */
  description?: string;
  /** Artwork URL shown as the credit card thumbnail. */
  image?: string;
  /** True when this credit is the Cymasphere sun, not a moon. */
  sun?: boolean;
  /** Hold length as a multiple of CREDIT_MS (Cymasphere 1.5, CymaSynth 2). */
  weight?: number;
  startDeg: number;
  periodSec: number;
  radius: number;
  /** Orbit radius in px (semi-major axis); drives the close-up dolly. */
  radiusPx?: number;
  size: number;
}

/** Camera pose for one moment of the tour. */
export interface TourCamera {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateZ: number;
  /** View-space truck; the inspection circle around a focused moon. */
  translateX: number;
  /** View-space vertical shift from the inspection truck. */
  translateY: number;
  sunScale: number;
  labelOpacity: number;
  /** Body currently framed, if any. */
  focusKey: string | null;
  /** Upcoming credit, so the renderer can mount it before the hop. */
  nextKey: string | null;
  /** Credit title card opacity. */
  creditOpacity: number;
  /** True during a hop between credits. */
  traveling: boolean;
}

interface TourKey {
  t: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateZ: number;
  sunScale: number;
}

const TOUR_KEYS: TourKey[] = [
  { t: 0, rotateX: 8, rotateY: -48, rotateZ: -10, translateZ: TOUR_OPENING_TRANSLATE_Z, sunScale: 0.42 },
  { t: 0.12, rotateX: 14, rotateY: -22, rotateZ: -4, translateZ: -640, sunScale: 0.7 },
  { t: 0.24, rotateX: 20, rotateY: 8, rotateZ: 0, translateZ: -140, sunScale: 1.2 },
  { t: 0.4, rotateX: 10, rotateY: 72, rotateZ: 8, translateZ: 160, sunScale: 1.55 },
  { t: 0.56, rotateX: 52, rotateY: 138, rotateZ: 2, translateZ: -30, sunScale: 1.08 },
  { t: 0.72, rotateX: 24, rotateY: 208, rotateZ: -2, translateZ: -20, sunScale: 1 },
  { t: 0.88, rotateX: 18, rotateY: 268, rotateZ: 0, translateZ: -8, sunScale: 1.02 },
  { t: 1, rotateX: 8, rotateY: 312, rotateZ: -10, translateZ: TOUR_OPENING_TRANSLATE_Z, sunScale: 0.42 },
];

/**
 * @brief Smoothstep from 0–1.
 * @param t Linear progress.
 * @returns Eased progress.
 */
/**
 * @brief Apparent extra scale for the sun from camera dolly.
 * CSS perspective already shrinks distant objects; this adds the
 * solar-system cue so a nearby hold is a disk and a far planet is a star.
 * @param translateZ Scene dolly (negative = pulled back from the sun).
 * @returns Scale multiplier, clamped.
 * @example
 * sunScaleFromCamera(-2000) < sunScaleFromCamera(20)
 */
export function sunScaleFromCamera(translateZ: number): number {
  const away = Math.max(0, -translateZ);
  const toward = Math.max(0, translateZ);
  const dist = away + toward * 0.15;
  return Math.min(1.7, Math.max(0.14, 1.55 * (220 / (220 + dist * 0.42))));
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * @brief Hold + travel length for one credit. Weight 1.5 = Cymasphere, 2 =
 * CymaSynth, 1 = everyone else. Travel stays CREDIT_TRAVEL_MS.
 * @param credit Target.
 * @returns Duration in milliseconds.
 */
export function creditHoldMs(credit: CreditTarget): number {
  return CREDIT_MS * Math.max(0.5, credit.weight ?? 1);
}

/**
 * @brief Sum of every credit hold in the tour.
 * @param credits Ordered credits.
 * @returns Span in milliseconds.
 */
export function creditsSpanMs(credits: CreditTarget[]): number {
  return credits.reduce((sum, credit) => sum + creditHoldMs(credit), 0);
}

/**
 * @brief Total length of a credits tour.
 * @param countOrCredits Product count (uniform holds) or the weighted list.
 * @returns Duration in milliseconds.
 */
export function tourDurationMs(
  countOrCredits: number | CreditTarget[]
): number {
  const span =
    typeof countOrCredits === "number"
      ? Math.max(0, countOrCredits) * CREDIT_MS
      : creditsSpanMs(countOrCredits);
  return TOUR_INTRO_MS + span + TOUR_OUTRO_MS;
}

/** Catalog slugs that should lead the hop off Cymasphere when present. */
const HERO_CREDIT_LEAD_SLUGS = new Set([
  "tetrad-guitars",
  "numb",
  "noker",
  "reiya",
  "curio-texture-generator",
]);

/**
 * @brief True when this credit is the CymaSynth stop (weight 2 or slug).
 * @param credit Tour target.
 * @returns Whether it is the flagship synth, not a catalog moon.
 */
export function isSynthCredit(credit: CreditTarget): boolean {
  if (credit.sun) return false;
  if ((credit.weight ?? 1) >= 2) return true;
  return (credit.slug || "").toLowerCase() === "cymasynth";
}

/**
 * @brief Tour order: Cymasphere, one catalog moon, CymaSynth, then the rest.
 * The first hop has to leave the Cyma family — sun → synth is another
 * teal close-up and reads as zooming Cymasphere. Lead slugs win when
 * present; otherwise the largest catalog moon.
 * @param credits Unsorted targets.
 * @returns Ordered copy.
 * @example
 * orderCredits([synth, sun, tetrad]).map((c) => c.key)
 * // [sun-cymasphere, tetrad, synth]
 */
export function orderCredits(credits: CreditTarget[]): CreditTarget[] {
  const suns = credits.filter((credit) => credit.sun);
  const synths = credits.filter((credit) => isSynthCredit(credit));
  const catalog = credits
    .filter((credit) => !credit.sun && !isSynthCredit(credit))
    .sort((a, b) => b.size - a.size);
  if (catalog.length === 0) return [...suns, ...synths];
  let leadAt = catalog.findIndex((credit) =>
    HERO_CREDIT_LEAD_SLUGS.has((credit.slug || "").toLowerCase())
  );
  if (leadAt < 0) leadAt = 0;
  const lead = catalog[leadAt];
  const rest = catalog.filter((_, i) => i !== leadAt);
  return [...suns, lead, ...synths, ...rest];
}

/**
 * @brief Camera that frames one moon up close, like a guided tour stop.
 * The yaw puts the moon dead ahead between the sun and the viewer, then
 * the dolly pushes deep enough that the moon reaches a target apparent
 * size — small moons get a much longer push-in than big ones, and the
 * whole system scales with the move because the scene is real 3D.
 * Pitch and yaw look at the live Kepler seat so the product sits on the
 * optical axis. Focus and card opacity are neutral here; creditTimeline
 * owns them so blending poses can never flash the card.
 * @param credit Target moon.
 * @param elapsedMs Current tour time (keeps the moon moving).
 * @param world Live Kepler position, when available.
 * @param eclipseXPx Screen offset right of center (capped to the frame).
 * @param eclipseYPx Screen offset down from center (capped to the frame).
 * @param targetPx Apparent disk size for the dolly.
 * @returns Pose looking at that moon.
 */
function poseForCredit(
  credit: CreditTarget,
  elapsedMs: number,
  world?: MoonWorldPos,
  eclipseXPx = ECLIPSE_OFFSET_X_PX,
  eclipseYPx = ECLIPSE_OFFSET_Y_PX,
  targetPx = 560,
  loopT = elapsedMs
): TourCamera {
  if (credit.sun) {
    const introEnd = poseFromKeys(INTRO_PATH_U);
    const holdT = Math.max(0, loopT - TOUR_INTRO_MS);
    return {
      rotateX: introEnd.rotateX,
      rotateY: introEnd.rotateY + (holdT / 1000) * SUN_YAW_DEG_PER_SEC,
      rotateZ: introEnd.rotateZ,
      translateX: 0,
      translateZ: introEnd.translateZ,
      translateY: 0,
      sunScale: sunScaleFromCamera(introEnd.translateZ),
      labelOpacity: 1,
      focusKey: credit.key,
      nextKey: null,
      creditOpacity: 0,
      traveling: false,
    };
  }
  const theta = moonTheta(credit.startDeg, credit.periodSec, elapsedMs);
  const rPx = credit.radiusPx ?? 280;
  const look = world
    ? lookAtMoon(
        world.x,
        world.height,
        world.z,
        credit.size,
        elapsedMs,
        eclipseXPx,
        eclipseYPx,
        targetPx
      )
    : lookAtMoon(
        Math.sin(theta) * rPx,
        0,
        Math.cos(theta) * rPx,
        credit.size,
        elapsedMs,
        eclipseXPx,
        eclipseYPx,
        targetPx
      );
  return {
    ...look,
    sunScale: sunScaleFromCamera(look.translateZ),
    labelOpacity: 0.15,
    focusKey: credit.key,
    nextKey: null,
    creditOpacity: 0,
    traveling: false,
  };
}

/**
 * @brief Which credit is on screen and how visible its card is, computed
 * purely from the timeline. The card fades over 280ms at both ends of
 * every credit, so it is continuous (0 at every boundary) regardless of
 * how camera poses are blended.
 * @param t Time within the current tour loop, ms.
 * @param credits Tour credits in play order.
 * @returns Focused key (null outside the credits window) and card opacity.
 */
/**
 * @brief Finds which credit is playing at `creditT`.
 * @param creditT Time since credits started, ms.
 * @param credits Ordered credits.
 * @returns Index, local time, and hold length — or null outside the span.
 */
function locateCredit(
  creditT: number,
  credits: CreditTarget[]
): { index: number; local: number; hold: number } | null {
  if (creditT < 0 || credits.length === 0) return null;
  let acc = 0;
  for (let i = 0; i < credits.length; i += 1) {
    const hold = creditHoldMs(credits[i]);
    if (creditT < acc + hold) {
      return { index: i, local: creditT - acc, hold };
    }
    acc += hold;
  }
  return null;
}

function creditTimeline(
  t: number,
  credits: CreditTarget[]
): { key: string | null; nextKey: string | null; opacity: number } {
  const creditT = t - TOUR_INTRO_MS;
  const located = locateCredit(creditT, credits);
  if (!located) {
    return {
      key: null,
      nextKey: creditT < 0 && credits.length > 0 ? credits[0].key : null,
      opacity: 0,
    };
  }
  const { index, local, hold } = located;
  // Visible during the hold only; hidden for the whole travel leg.
  return {
    key: credits[index].key,
    nextKey: credits[index + 1]?.key ?? null,
    opacity: Math.max(
      0,
      Math.min(1, local / 320, (hold - CREDIT_TRAVEL_MS - local) / 320)
    ),
  };
}

/**
 * @brief Samples the original galaxy-path keyframes.
 * @param u Normalized 0–1 progress along TOUR_KEYS.
 * @returns Camera pose with no credit focus.
 */
function poseFromKeys(u: number): TourCamera {
  let i = 0;
  while (i < TOUR_KEYS.length - 1 && u > TOUR_KEYS[i + 1].t) i += 1;
  const a = TOUR_KEYS[i];
  const b = TOUR_KEYS[i + 1] ?? a;
  const span = b.t - a.t || 1;
  const s = smoothstep((u - a.t) / span);
  const translateZ = a.translateZ + (b.translateZ - a.translateZ) * s;
  const closeness = 1 - Math.min(1, Math.abs(translateZ) / 900);
  return {
    rotateX: a.rotateX + (b.rotateX - a.rotateX) * s,
    rotateY: a.rotateY + (b.rotateY - a.rotateY) * s,
    rotateZ: a.rotateZ + (b.rotateZ - a.rotateZ) * s,
    translateZ,
    translateX: 0,
    translateY: 0,
    sunScale: a.sunScale + (b.sunScale - a.sunScale) * s,
    labelOpacity: Math.max(0, closeness * 1.15 - 0.15),
    focusKey: null,
    nextKey: null,
    creditOpacity: 0,
    traveling: false,
  };
}

/**
 * @brief Shortest signed arc from a to b in degrees. Modulo-based so
 * unwrapped angles (which grow with elapsed time) cost O(1).
 * @param a Start angle.
 * @param b End angle.
 * @returns Delta in (-180, 180].
 */
export function angleDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

/**
 * @brief Interpolates degrees along the shortest arc.
 * @param a Start angle.
 * @param b End angle.
 * @param t Mix 0–1.
 * @returns Interpolated degrees.
 */
function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDelta(a, b) * t;
}

/**
 * @brief Blends two camera poses, wrapping yaw on the short arc.
 * @param a Start pose.
 * @param b End pose.
 * @param t Linear mix, eased internally.
 * @returns Mixed pose.
 */
function mixPose(a: TourCamera, b: TourCamera, t: number, ease = true): TourCamera {
  const s = ease ? smoothstep(t) : Math.min(1, Math.max(0, t));
  return {
    rotateX: lerpAngle(a.rotateX, b.rotateX, s),
    rotateY: lerpAngle(a.rotateY, b.rotateY, s),
    rotateZ: lerpAngle(a.rotateZ, b.rotateZ, s),
    translateZ: a.translateZ + (b.translateZ - a.translateZ) * s,
    translateX: a.translateX + (b.translateX - a.translateX) * s,
    translateY: a.translateY + (b.translateY - a.translateY) * s,
    sunScale: a.sunScale + (b.sunScale - a.sunScale) * s,
    labelOpacity: a.labelOpacity + (b.labelOpacity - a.labelOpacity) * s,
    focusKey: s > 0.45 ? b.focusKey : a.focusKey,
    nextKey: s > 0.45 ? b.nextKey : a.nextKey,
    creditOpacity: a.creditOpacity + (b.creditOpacity - a.creditOpacity) * s,
    traveling: s > 0.45 ? b.traveling : a.traveling,
  };
}

/**
 * @brief Dolly a look-at pose back so the framed moon stays on screen
 * while the camera can see the rest of the hop.
 * @param pose Live look-at of one moon.
 * @param pullOut Extra pull-back in px.
 */
function withPullOut(pose: TourCamera, pullOut: number): TourCamera {
  const translateZ = pose.translateZ - pullOut;
  return {
    ...pose,
    translateZ,
    sunScale: sunScaleFromCamera(translateZ),
  };
}

/**
 * @brief Hop: zoom out while tracking the outgoing moon, sweep at that
 * wide dolly onto the next moon, then push in. Blending two close-ups
 * let planets fly past the camera mid-leg.
 * @param from Look-at of the outgoing moon.
 * @param to Look-at of the incoming moon.
 * @param leg 0–1 travel progress.
 * @param pullOut Mid-leg pull-back in px.
 */
function travelHopPose(
  from: TourCamera,
  to: TourCamera,
  leg: number,
  pullOut: number
): TourCamera {
  const u = Math.min(1, Math.max(0, leg));
  const wideFrom = withPullOut(from, pullOut);
  const wideTo = withPullOut(to, pullOut);
  if (u < 0.32) return mixPose(from, wideFrom, u / 0.32);
  if (u < 0.68) return mixPose(wideFrom, wideTo, (u - 0.32) / 0.36, false);
  return mixPose(wideTo, to, (u - 0.68) / 0.32);
}

/**
 * @brief Interpolates the cinematic camera. With credits, this is a show
 * open: fly in on the sun, then linger on each product without parking.
 * Without credits, it loops the galaxy path.
 * @param elapsedMs Time since the tour started.
 * @param reducedMotion When true, hold the beauty-shot pose.
 * @param credits Optional products to feature, already in credit order.
 * @param worldPos Live Kepler positions, keyed by credit key. When
 * present the camera aims at the real moon instead of a flat circle.
 * @param viewHalfW Half the frame width in px; caps the hold framing
 * so the held planet stays well inside narrow (mobile) frames.
 * @returns Camera pose plus the current credit focus.
 * @example
 * cameraTour(0, false).translateZ < cameraTour(8000, false).translateZ
 */
export function cameraTour(
  elapsedMs: number,
  reducedMotion: boolean,
  credits: CreditTarget[] = [],
  worldPos?: ReadonlyMap<string, MoonWorldPos>,
  viewHalfW = 620
): TourCamera {
  const frameOf = (credit: CreditTarget) => holdFrameOffset(credit.key, viewHalfW);
  // Keep the disk inside the frame (credit card + eclipse offset).
  // 560px on a ~640px-tall board clipped the planet through the camera.
  const holdTargetPx = Math.min(400, Math.max(200, viewHalfW * 0.68));
  if (reducedMotion) {
    return {
      rotateX: 22,
      rotateY: 18,
      rotateZ: 0,
      translateZ: -20,
      translateX: 0,
      translateY: 0,
      sunScale: 1.05,
      labelOpacity: 1,
      focusKey: null,
      nextKey: null,
      creditOpacity: 0,
      traveling: false,
    };
  }

  if (credits.length === 0) {
    const cycle =
      ((elapsedMs % TOUR_DURATION_MS) + TOUR_DURATION_MS) % TOUR_DURATION_MS;
    const free = poseFromKeys(cycle / TOUR_DURATION_MS);
    free.sunScale = sunScaleFromCamera(free.translateZ);
    return free;
  }

  const total = tourDurationMs(credits);
  const t = ((elapsedMs % total) + total) % total;
  const creditT = t - TOUR_INTRO_MS;
  const creditSpan = creditsSpanMs(credits);
  let pose: TourCamera;
  // True during a hop between stops; the aim sweep must not be
  // overridden by the hold lock or travel reads as a cut.
  let traveling = false;

  if (t < TOUR_INTRO_MS) {
    const intro = poseFromKeys((t / TOUR_INTRO_MS) * INTRO_PATH_U);
    pose =
      t > TOUR_INTRO_MS - INTRO_BLEND_MS
        ? mixPose(
            intro,
            poseForCredit(
              credits[0],
              elapsedMs,
              worldPos?.get(credits[0].key),
              frameOf(credits[0]).x,
              frameOf(credits[0]).y,
              holdTargetPx,
              t
            ),
            (t - (TOUR_INTRO_MS - INTRO_BLEND_MS)) / INTRO_BLEND_MS
          )
        : intro;
  } else if (creditT < creditSpan) {
    const located = locateCredit(creditT, credits);
    const index = located?.index ?? credits.length - 1;
    const local = located?.local ?? 0;
    const hold = located?.hold ?? CREDIT_MS;
    const current = poseForCredit(
      credits[index],
      elapsedMs,
      worldPos?.get(credits[index].key),
      frameOf(credits[index]).x,
      frameOf(credits[index]).y,
      holdTargetPx,
      t
    );
    if (index + 1 < credits.length && local > hold - CREDIT_TRAVEL_MS) {
      traveling = true;
      const leg = (local - (hold - CREDIT_TRAVEL_MS)) / CREDIT_TRAVEL_MS;
      const next = poseForCredit(
        credits[index + 1],
        elapsedMs,
        worldPos?.get(credits[index + 1].key),
        frameOf(credits[index + 1]).x,
        frameOf(credits[index + 1]).y,
        holdTargetPx,
        t
      );
      const sweep = angleDelta(current.rotateY, next.rotateY);
      const gapDeg = Math.abs(sweep);
      const gapR = Math.abs(
        (credits[index].radiusPx ?? credits[index].radius * 420) -
          ((credits[index + 1].radiusPx ?? credits[index + 1].radius * 420) || 0)
      );
      const pullOut = Math.min(3200, 180 + gapDeg * 3.2 + gapR * 0.28);
      pose = travelHopPose(current, next, leg, pullOut);
      // Bank into the turn like a craft; strongest mid-leg, gone at
      // both endpoints so holds stay level.
      pose.rotateZ +=
        Math.max(-6, Math.min(6, -sweep * 0.06)) * Math.sin(Math.PI * leg);
    } else {
      pose = current;
    }
  } else {
    const last = poseForCredit(
      credits[credits.length - 1],
      elapsedMs,
      worldPos?.get(credits[credits.length - 1].key),
      frameOf(credits[credits.length - 1]).x,
      frameOf(credits[credits.length - 1]).y,
      holdTargetPx,
      t
    );
    const outro = poseFromKeys(0.88 + ((creditT - creditSpan) / TOUR_OUTRO_MS) * 0.12);
    pose = mixPose(last, outro, Math.min(1, (creditT - creditSpan) / 700));
  }

  const timeline = creditTimeline(t, credits);
  pose.focusKey = timeline.key;
  pose.nextKey = timeline.nextKey;
  pose.creditOpacity = timeline.opacity;
  pose.traveling = traveling;
  // Holds keep the current product pinned at its framed offset. During
  // travel the lock is released so the hop can zoom out on the outgoing
  // moon, follow across, then push in on the next.
  const focused = timeline.key
    ? credits.find((credit) => credit.key === timeline.key)
    : undefined;
  if (focused && !focused.sun && !traveling) {
    const live = worldPos?.get(focused.key);
    const locked = live
      ? lookAtMoon(
          live.x,
          live.height,
          live.z,
          focused.size,
          elapsedMs,
          frameOf(focused).x,
          frameOf(focused).y,
          holdTargetPx
        )
      : poseForCredit(
          focused,
          elapsedMs,
          undefined,
          frameOf(focused).x,
          frameOf(focused).y,
          holdTargetPx
        );
    pose.rotateX = locked.rotateX;
    pose.rotateY = locked.rotateY;
    pose.rotateZ = 0;
    pose.translateX = locked.translateX;
    pose.translateY = locked.translateY;
    pose.translateZ = locked.translateZ;
  }
  pose.sunScale = sunScaleFromCamera(pose.translateZ);
  return pose;
}
