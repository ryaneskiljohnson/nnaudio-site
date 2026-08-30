/**
 * @fileoverview Shared helpers for the homepage hero tour: phone
 * viewport detection, lite-tour gating (tablets / iPadOS / desktop-mode
 * phones), compact-tour latching so resize cannot rebuild the 3D
 * system, Safari-kill watchdog, curated moon picks, bake sizes, and
 * recording query flags (`heroAutoTour`, `tourCap`).
 * @module utils/hero-tour
 */

import {
  HERO_MOBILE_MAX_WIDTH_PX,
  MOBILE_STAGE_BUDGET,
  SUN_FOCUS_KEY,
} from "@/utils/circuit-network-layout";

export { MOBILE_STAGE_BUDGET };

/** sessionStorage key for the crash watchdog. */
export const HERO_TOUR_WATCHDOG_KEY = "hero-tour-watchdog";

/**
 * Former phone stop cap. Live visits are uncapped; `?tourCap` still
 * slices a recording. Kept for the 2D reel / watchdog docs.
 */
export const TOUR_MOBILE_MAX_STOPS = 6;

/**
 * Former phone catalog cap. Live WebGL visits mount the full catalog;
 * the 2D reel still uses {@link MOBILE_2D_MOON_CAP}.
 */
export const MOBILE_CATALOG_MOON_CAP = 5;

/** Strip height for phone moon bakes (no 4K decode). */
export const HERO_MOBILE_BAKE_PX = 160;

/**
 * Desktop featured-moon CSS box. Bake is this × devicePixelRatio
 * so Retina is 1:1.
 */
export const HERO_MOON_FOCUS_CSS_PX = 640;

/** Minimum ms between rendered frames on a phone (~12fps). */
export const MOBILE_FRAME_MIN_MS = 83;

/** Hi-res bakes kept on a phone (current + prefetch). */
export const MOBILE_TEXTURE_KEEP = MOBILE_STAGE_BUDGET;

/** How long a phone keeps a moon mounted after it leaves the window. */
export const MOBILE_STAGE_LINGER_MS = 500;

/**
 * Live phone Play never mounts CircuitNetwork. This many catalog moons
 * follow Cymasphere and CymaSynth on the 2D credit reel.
 */
export const MOBILE_2D_MOON_CAP = 3;

/** Hold length for one 2D credit on a phone. */
export const MOBILE_2D_HOLD_MS = 2000;

/** Poster used for the Cymasphere still (not the 4K wrap). */
export const MOBILE_2D_SUN_POSTER = "/images/cymasphere-sun-sphere-hero.webp";

/** Poster used for the CymaSynth still. */
export const MOBILE_2D_SYNTH_POSTER = "/images/cymasynth-sphere-hero.webp";

/** One 2D credit on the phone Play reel. */
export type MobileTourStop = {
  key: string;
  name: string;
  slug: string;
  price?: string;
  tagline?: string;
  image: string;
  sun?: boolean;
};

/** Slim product shape used when building the phone reel. */
export type MobileTourNode = {
  id: string | number;
  name: string;
  slug: string;
  image?: string;
  price?: string;
  tagline?: string;
};

/**
 * @brief Cymasphere → CymaSynth → curated moons for the phone 2D tour.
 * CircuitNetwork is never downloaded on this path — CSS 3D + canvas
 * warps are what iOS Safari reloads after ~10s of Play.
 * @param cymasphere Sun credit, if present.
 * @param cymasynth Closest moon, if present.
 * @param nodes Remaining catalog products.
 * @param moonCap Catalog moons after the two flagships when `tourCap` is unset.
 * @param curatedSlugs Best-seller slug order.
 * @param tourCap Optional total credit-stop cap (`?tourCap=N`).
 * @returns Ordered stills, sun first. Moons without artwork are omitted.
 * @example
 * buildMobileTourStops(sun, synth, catalog, 3, ["reiya"])
 */
/**
 * @brief Catalog moons to append after sun (and synth) on the 2D reel.
 * `tourCap` is total credits, same meaning as the 3D recorder flag.
 * @param tourCap Optional total credit-stop cap.
 * @param hasSynth Whether CymaSynth occupies a credit slot.
 * @param fallback Live Play moon count when no cap is set.
 * @returns Moon count after the flagships.
 */
export function mobile2dMoonCap(
  tourCap: number | undefined,
  hasSynth: boolean,
  fallback: number = MOBILE_2D_MOON_CAP
): number {
  if (tourCap != null && tourCap > 0) {
    return Math.max(0, tourCap - 1 - (hasSynth ? 1 : 0));
  }
  return fallback;
}

/**
 * @brief True when the 2D reel should stop scheduling the next hold.
 * @param index Current stop index.
 * @param stopCount Total credits.
 * @returns True on the last (or only) still.
 */
export function mobileTourIsParked(index: number, stopCount: number): boolean {
  return stopCount <= 1 || index >= stopCount - 1;
}

export function buildMobileTourStops(
  cymasphere: MobileTourNode | null | undefined,
  cymasynth: MobileTourNode | null | undefined,
  nodes: MobileTourNode[],
  moonCap: number = MOBILE_2D_MOON_CAP,
  curatedSlugs: readonly string[] = [],
  tourCap?: number
): MobileTourStop[] {
  const withArt = nodes.filter((node) => Boolean(node.image?.trim()));
  const moons = mobile2dMoonCap(tourCap, !!cymasynth, moonCap);
  const stops: MobileTourStop[] = [
    {
      key: SUN_FOCUS_KEY,
      name: cymasphere?.name || "Cymasphere",
      slug: cymasphere?.slug || "cymasphere",
      price: cymasphere?.price,
      tagline: (cymasphere?.tagline || "").trim(),
      image: MOBILE_2D_SUN_POSTER,
      sun: true,
    },
  ];
  if (cymasynth) {
    stops.push({
      key: `synth-${cymasynth.id}`,
      name: cymasynth.name,
      slug: cymasynth.slug,
      price: cymasynth.price,
      tagline: (cymasynth.tagline || "").trim(),
      image: MOBILE_2D_SYNTH_POSTER,
    });
  }
  for (const node of pickMobileTourNodes(withArt, moons, curatedSlugs)) {
    const image = node.image?.trim() || "";
    if (!image) continue;
    stops.push({
      key: String(node.id),
      name: node.name,
      slug: node.slug,
      price: node.price,
      tagline: (node.tagline || "").trim(),
      image,
    });
  }
  if (tourCap != null && tourCap > 0) return stops.slice(0, Math.max(2, tourCap));
  return stops;
}

/**
 * @brief Whether the hero board still intersects the viewport.
 * Rect-based so flaky IntersectionObserver callbacks do not freeze
 * the tour when the board still fills the screen.
 * @param rect Board bounding rect.
 * @param viewportHeight `window.innerHeight`.
 * @returns True when any part of the board is on screen.
 * @example
 * heroBoardIsOnScreen({ top: 0, bottom: 600, height: 600 }, 800) // true
 * heroBoardIsOnScreen({ top: -900, bottom: -100, height: 800 }, 800) // false
 */
export function heroBoardIsOnScreen(
  rect: Pick<DOMRectReadOnly, "top" | "bottom" | "height">,
  viewportHeight: number
): boolean {
  const vh = viewportHeight || 0;
  return rect.height > 8 && rect.top < vh && rect.bottom > 0;
}

/**
 * @brief Whether the hero should use the phone-capped tour.
 * Uses the short viewport side so a landscape phone (e.g. 844×390)
 * still gets the capped system — a width-only 768px check treated
 * iPhone landscape as desktop and Safari killed Play.
 * @param width CSS viewport width.
 * @param height CSS viewport height.
 * @returns True when the short side is phone-sized.
 * @example
 * isHeroMobileViewport(390, 844) // true (portrait phone)
 * isHeroMobileViewport(844, 390) // true (landscape phone)
 * isHeroMobileViewport(1280, 800) // false
 */
export function isHeroMobileViewport(width: number, height: number): boolean {
  return Math.min(width, height) <= HERO_MOBILE_MAX_WIDTH_PX;
}

/** Viewport and input snapshot used to decide whether the 3D hero is safe. */
export interface HeroTourEnvironment {
  width: number;
  height: number;
  maxTouchPoints: number;
  userAgent: string;
  coarsePointer: boolean;
}

/** Browser bits {@link readHeroTourEnvironment} reads. */
export type HeroTourEnvironmentSource = {
  innerWidth: number;
  innerHeight: number;
  navigator: { maxTouchPoints?: number; userAgent?: string };
  matchMedia: (query: string) => { matches: boolean };
};

/**
 * @brief Reads viewport size, pointer type, and UA from a window-like object.
 * @param win `window` or a test double.
 * @returns Snapshot for {@link prefersLiteHeroTour}.
 * @example
 * readHeroTourEnvironment(window)
 */
export function readHeroTourEnvironment(
  win: HeroTourEnvironmentSource
): HeroTourEnvironment {
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    maxTouchPoints: win.navigator.maxTouchPoints ?? 0,
    userAgent: win.navigator.userAgent ?? "",
    coarsePointer: win.matchMedia("(pointer: coarse)").matches,
  };
}

/**
 * @brief Compact-tour flag from a live window. Same predicate as Play
 * gating so an iPad / "Request Desktop Website" phone still gets the
 * capped 3D system instead of the full desktop catalog.
 * @param win `window` or a test double.
 * @returns True when CircuitNetwork should use the phone-capped path.
 */
export function readHeroCompactTour(win: HeroTourEnvironmentSource): boolean {
  return prefersLiteHeroTour(readHeroTourEnvironment(win));
}

/**
 * @brief Holds the first compact-tour measurement.
 * iOS URL-bar resizes and orientation flicker can cross the 768px
 * short-side line; flipping mid-tour rebuilds Kepler, uncapped moons,
 * and the IntersectionObserver — that looks like a page refresh.
 * @param latched Previous latch, or null before the first measure.
 * @param measured Latest {@link readHeroCompactTour} / viewport result.
 * @returns The value to keep, and whether a flip was ignored.
 * @example
 * latchHeroCompactTour(true, false) // { compact: true, ignoredFlip: true }
 */
export function latchHeroCompactTour(
  latched: boolean | null,
  measured: boolean
): { compact: boolean; ignoredFlip: boolean } {
  if (latched === null) {
    return { compact: measured, ignoredFlip: false };
  }
  return { compact: latched, ignoredFlip: latched !== measured };
}

/**
 * @brief Whether a ResizeObserver box should keep the existing Kepler size.
 * Tiny jitter is ignored everywhere. On a compact tour, height-only
 * changes (iOS chrome show/hide) are also ignored so the system does
 * not rebuild mid-hold.
 * @param prev Last accepted size.
 * @param next Newly observed size.
 * @param compact Phone-capped tour.
 * @returns True when `prev` should be kept.
 * @example
 * shouldKeepHeroFrameSize({ w: 390, h: 844 }, { w: 390, h: 760 }, true) // true
 */
export function shouldKeepHeroFrameSize(
  prev: { w: number; h: number } | null,
  next: { w: number; h: number },
  compact: boolean
): boolean {
  if (!prev) return false;
  if (Math.abs(prev.w - next.w) < 12 && Math.abs(prev.h - next.h) < 12) {
    return true;
  }
  if (compact && Math.abs(prev.w - next.w) < 12) {
    return true;
  }
  return false;
}

/**
 * @brief Whether CircuitNetwork must not auto-start.
 * A short-side-only 768px check treated iPads and iPhones on
 * "Request Desktop Website" as desktop. Safari then killed the tab
 * (~10s) and reloaded in a loop.
 * @param env Viewport and input snapshot.
 * @returns True for phones, tablets, and touch-primary UAs.
 * @example
 * prefersLiteHeroTour({
 *   width: 834, height: 1194, maxTouchPoints: 5,
 *   userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0)",
 *   coarsePointer: true,
 * }) // true
 */
export function prefersLiteHeroTour(env: HeroTourEnvironment): boolean {
  if (isHeroMobileViewport(env.width, env.height)) return true;
  if (env.coarsePointer) return true;
  const ua = env.userAgent;
  if (
    /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      ua
    )
  ) {
    return true;
  }
  if (/iPad|Android/i.test(ua)) return true;
  // iPadOS 13+ reports Macintosh but keeps multi-touch.
  if (/Macintosh/i.test(ua) && env.maxTouchPoints > 1) return true;
  // Surface-class tablets: fine pointer + mouse, but still a touch slab
  // that cannot survive CircuitNetwork.
  if (env.maxTouchPoints > 1 && Math.min(env.width, env.height) <= 1366) {
    return true;
  }
  return false;
}

/** First-paint decision for which hero tour (if any) to mount. */
export interface HeroTourStart {
  /** Mount CircuitNetwork (desktop idle start or explicit Play). */
  allowTour: boolean;
  showPlay: boolean;
  scheduleDesktop: boolean;
}

/**
 * @brief Picks the hero mount without touching the DOM.
 * Lite devices wait for Play, then mount the same live 3D tour.
 * @param input Lite/motion flags and query flags.
 * @returns Whether to show Play, start the tour, or idle-start desktop.
 * @example
 * resolveHeroTourStart({
 *   lite: true, reduceMotion: false, autoTour: false, force3d: false,
 * })
 * // { allowTour: false, showPlay: true, scheduleDesktop: false }
 */
export function resolveHeroTourStart(input: {
  lite: boolean;
  reduceMotion: boolean;
  autoTour: boolean;
  force3d: boolean;
}): HeroTourStart {
  if (input.reduceMotion) {
    return {
      allowTour: false,
      showPlay: false,
      scheduleDesktop: false,
    };
  }
  if (input.lite) {
    if (input.autoTour) {
      return {
        allowTour: true,
        showPlay: false,
        scheduleDesktop: false,
      };
    }
    return {
      allowTour: false,
      showPlay: true,
      scheduleDesktop: false,
    };
  }
  if (input.autoTour || input.force3d) {
    return {
      allowTour: true,
      showPlay: false,
      scheduleDesktop: false,
    };
  }
  return {
    allowTour: false,
    showPlay: false,
    scheduleDesktop: true,
  };
}

/**
 * @brief Phone stage window: only the current hold and the next stop.
 * The Cymasphere hold mounts nothing so untextured disks cannot sit
 * on the sun. Kepler still steps every body; they just have no DOM.
 * @param focusKey Camera focus, or null while travelling.
 * @param nextKey Upcoming credit, or null.
 * @param sunFocus True during the Cymasphere hold.
 * @returns At most two moon keys (never the sun).
 * @example
 * mobileStageKeys("reiya", "curio", false) // ["reiya", "curio"]
 * mobileStageKeys("sun", "reiya", true) // []
 */
export function mobileStageKeys(
  focusKey: string | null,
  nextKey: string | null,
  sunFocus: boolean
): string[] {
  if (sunFocus) return [];
  const keys: string[] = [];
  if (focusKey && focusKey !== SUN_FOCUS_KEY) keys.push(focusKey);
  if (
    nextKey &&
    nextKey !== SUN_FOCUS_KEY &&
    nextKey !== focusKey
  ) {
    keys.push(nextKey);
  }
  return keys;
}

/** Shape written by the CircuitNetwork crash watchdog. */
export interface HeroTourWatchdogRecord {
  clean?: boolean;
  parked?: boolean;
  aliveSec?: number;
}

/**
 * @brief True when the last hero visit was a Safari kill mid-tour.
 * A parked still that later dies (tab discard) is not a kill — the
 * cheap tour already finished. Desktop must not use this latch.
 * @param raw sessionStorage value, or null when missing.
 * @returns Whether the next mobile Play should skip canvas warps.
 * @example
 * previousHeroTourWasKilled('{"clean":false,"parked":false}') // true
 * previousHeroTourWasKilled('{"clean":false,"parked":true}') // false
 */
export function previousHeroTourWasKilled(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const rec = JSON.parse(raw) as HeroTourWatchdogRecord;
    return rec.clean === false && rec.parked !== true;
  } catch {
    return false;
  }
}

/**
 * @brief Catalog moons for a capped tour: curated bestsellers first,
 * then remaining nodes in the given order until `cap`.
 * @param nodes Interleaved catalog products (CymaSynth already removed).
 * @param cap Maximum moons to keep.
 * @param curatedSlugs Best-seller slugs; `cymasphere` / `cymasynth` are skipped.
 * @returns Up to `cap` nodes, curated first, then fill from `nodes`.
 * @example
 * pickMobileTourNodes(catalog, 5, ["reiya", "curio-texture-generator"])
 */
export function pickMobileTourNodes<T extends { slug?: string; id?: string | number }>(
  nodes: T[],
  cap: number,
  curatedSlugs: readonly string[] = []
): T[] {
  if (cap <= 0 || nodes.length === 0) return [];
  const skip = new Set(["cymasphere", "cymasynth", "nnaudio-access"]);
  const picked: T[] = [];
  const seen = new Set<string>();
  const keyOf = (node: T) => String(node.slug || node.id || "").toLowerCase();

  const tryAdd = (node: T | undefined) => {
    if (!node || picked.length >= cap) return;
    const key = keyOf(node);
    if (!key || seen.has(key) || skip.has(key)) return;
    seen.add(key);
    picked.push(node);
  };

  const bySlug = new Map<string, T>();
  for (const node of nodes) {
    const slug = (node.slug || "").toLowerCase();
    if (slug) bySlug.set(slug, node);
  }
  for (const slug of curatedSlugs) {
    if (skip.has(slug.toLowerCase())) continue;
    tryAdd(bySlug.get(slug.toLowerCase()));
  }
  for (const node of nodes) tryAdd(node);
  return picked;
}

/**
 * @brief How many catalog moons to mount for this visit.
 * `tourCap` is credit stops (sun + CymaSynth + moons); moons get the
 * remainder. Live visits are uncapped on every screen; only `?tourCap`
 * slices the itinerary.
 * @param _mobile Unused; kept so call sites stay the same.
 * @param tourCap Optional recording/debug credit-stop cap.
 * @param hasSynth When true, one credit slot is reserved for CymaSynth.
 * @returns Moon count, or `null` for the full catalog.
 * @example
 * heroTourMoonCap(true, undefined, true) // null
 * heroTourMoonCap(true, 15, true) // 13
 */
export function heroTourMoonCap(
  _mobile: boolean,
  tourCap: number | undefined,
  hasSynth: boolean
): number | null {
  if (tourCap != null && tourCap > 0) {
    return Math.max(0, tourCap - 1 - (hasSynth ? 1 : 0));
  }
  return null;
}

/**
 * @brief How many camera stops to play.
 * @param _mobile Unused; kept so call sites stay the same.
 * @param tourCap Optional recording/debug override.
 * @returns Stop count, or `null` for the full credit list.
 * @example
 * heroTourStopCap(true) // null
 * heroTourStopCap(false, 15) // 15
 */
export function heroTourStopCap(
  _mobile: boolean,
  tourCap?: number
): number | null {
  if (tourCap != null && tourCap > 0) return tourCap;
  return null;
}

/**
 * @brief Close-up bake edge. Desktop matches CSS pixels at 2× DPR;
 * phones use a fixed 160px strip so Safari does not decode 4K.
 * @param compact When true, bake for the mobile focus disk.
 * @param dpr Device pixel ratio (already clipped to 2 by the caller).
 * @returns Strip height in device pixels.
 * @example
 * moonBakePx(true, 2) // 160
 * moonBakePx(false, 2) // 1280
 */
export function moonBakePx(compact: boolean, dpr: number): number {
  if (compact) return HERO_MOBILE_BAKE_PX;
  return Math.round(HERO_MOON_FOCUS_CSS_PX * dpr);
}

/**
 * @brief Sun wrap bake. Desktop matches the 560px disk at device
 * pixels; phones use the same 160px cap as catalog moons.
 * @param compact When true, bake for the phone sun.
 * @param dpr Device pixel ratio (already clipped to 2 by the caller).
 * @returns Strip height in device pixels.
 * @example
 * sunBakePx(true, 2) // 160
 * sunBakePx(false, 2) // 1120
 */
export function sunBakePx(compact: boolean, dpr: number): number {
  if (compact) return HERO_MOBILE_BAKE_PX;
  return dpr >= 2 ? 1120 : 560;
}

/**
 * @brief Recording / debug flags from the homepage query string.
 * Read from `window.location.search` (not `useSearchParams`) so the
 * LCP path does not need a Suspense boundary.
 * @param search `window.location.search` (leading `?` optional).
 * @returns Auto-start flag, optional credit-stop cap, and 3D recorder latch.
 * @example
 * parseHeroTourQuery("?heroAutoTour=1&tourCap=15")
 * // { autoTour: true, tourCap: 15, force3d: false }
 * parseHeroTourQuery("?heroAutoTour=1&hero3d=1")
 * // { autoTour: true, tourCap: undefined, force3d: true }
 */
export function parseHeroTourQuery(search: string): {
  autoTour: boolean;
  tourCap: number | undefined;
  force3d: boolean;
} {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const raw = params.get("tourCap");
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return {
    autoTour: params.get("heroAutoTour") === "1",
    tourCap: Number.isFinite(n) && n > 0 ? n : undefined,
    force3d: params.get("hero3d") === "1",
  };
}

/** Max wait before desktop idle callback forces the tour to start. */
export const DESKTOP_TOUR_IDLE_TIMEOUT_MS = 3500;

/** Fallback delay when `requestIdleCallback` is unavailable. */
export const DESKTOP_TOUR_FALLBACK_DELAY_MS = 2500;

/** Minimal timer APIs used by {@link scheduleDesktopHeroTour}. */
export type DesktopTourScheduler = {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
};

/**
 * @brief Defers desktop CircuitNetwork mount until the main thread is idle.
 * Keeps first paint interactive; `timeout` still starts the tour if the
 * browser stays busy.
 * @param start Callback that sets `allowTour` and loads the tour chunk.
 * @param scheduler Browser timers (injectable for tests).
 * @returns Cleanup that cancels the pending idle/timeout callback.
 * @example
 * const cancel = scheduleDesktopHeroTour(() => setAllowTour(true), window);
 * cancel();
 */
export function scheduleDesktopHeroTour(
  start: () => void,
  scheduler: DesktopTourScheduler
): () => void {
  if (typeof scheduler.requestIdleCallback === "function") {
    const idleId = scheduler.requestIdleCallback(start, {
      timeout: DESKTOP_TOUR_IDLE_TIMEOUT_MS,
    });
    return () => scheduler.cancelIdleCallback?.(idleId);
  }
  const timerId = scheduler.setTimeout(start, DESKTOP_TOUR_FALLBACK_DELAY_MS);
  return () => scheduler.clearTimeout(timerId);
}
