/**
 * @fileoverview Shared helpers for the homepage hero tour: phone
 * viewport detection, Safari-kill watchdog, curated moon picks, bake
 * sizes, and recording query flags (`heroAutoTour`, `tourCap`).
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
 * Camera stops on a phone tour: the sun, CymaSynth, and curated
 * catalog moons. A full-catalog tour (~74 stops) is the sustained
 * load iOS Safari's energy/memory watchdog kills with a reload.
 */
export const TOUR_MOBILE_MAX_STOPS = 6;

/**
 * Catalog moons mounted on a phone (plus CymaSynth). The full ~70-body
 * system is what iOS Safari's memory watchdog reloads on Play.
 */
export const MOBILE_CATALOG_MOON_CAP = 5;

/** Strip height for phone moon bakes (no 4K decode). */
export const HERO_MOBILE_BAKE_PX = 160;

/**
 * Desktop featured-moon CSS box. Bake is this × devicePixelRatio
 * so Retina is 1:1.
 */
export const HERO_MOON_FOCUS_CSS_PX = 640;

/** Minimum ms between rendered frames on a phone (~15fps). */
export const MOBILE_FRAME_MIN_MS = 66;

/** Hi-res bakes kept on a phone (current + prefetch). */
export const MOBILE_TEXTURE_KEEP = MOBILE_STAGE_BUDGET;

/** How long a phone keeps a moon mounted after it leaves the window. */
export const MOBILE_STAGE_LINGER_MS = 500;

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
 * remainder. Live phones use {@link MOBILE_CATALOG_MOON_CAP}.
 * @param mobile Phone-capped tour.
 * @param tourCap Optional recording/debug credit-stop cap.
 * @param hasSynth When true, one credit slot is reserved for CymaSynth.
 * @returns Moon count, or `null` for the full catalog.
 * @example
 * heroTourMoonCap(true, undefined, true) // 5
 * heroTourMoonCap(true, 15, true) // 13
 */
export function heroTourMoonCap(
  mobile: boolean,
  tourCap: number | undefined,
  hasSynth: boolean
): number | null {
  if (tourCap != null && tourCap > 0) {
    return Math.max(0, tourCap - 1 - (hasSynth ? 1 : 0));
  }
  return mobile ? MOBILE_CATALOG_MOON_CAP : null;
}

/**
 * @brief How many camera stops to play.
 * @param mobile Phone-capped tour.
 * @param tourCap Optional recording/debug override.
 * @returns Stop count, or `null` for the full credit list.
 * @example
 * heroTourStopCap(true) // 6
 * heroTourStopCap(false, 15) // 15
 */
export function heroTourStopCap(
  mobile: boolean,
  tourCap?: number
): number | null {
  if (tourCap != null && tourCap > 0) return tourCap;
  return mobile ? TOUR_MOBILE_MAX_STOPS : null;
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
 * @returns Auto-start flag and optional credit-stop cap.
 * @example
 * parseHeroTourQuery("?heroAutoTour=1&tourCap=15")
 * // { autoTour: true, tourCap: 15 }
 */
export function parseHeroTourQuery(search: string): {
  autoTour: boolean;
  tourCap: number | undefined;
} {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const raw = params.get("tourCap");
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return {
    autoTour: params.get("heroAutoTour") === "1",
    tourCap: Number.isFinite(n) && n > 0 ? n : undefined,
  };
}
