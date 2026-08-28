/**
 * @fileoverview Engine defaults for the homepage Three.js hero: 30 FPS
 * and a 1080p drawing-buffer / texture ceiling (never 4K).
 * @module components/hero-gl/caps
 */

/** Target frame rate for the hero loop. */
export const HERO_FPS = 30;

/** Minimum milliseconds between rendered frames (~30 FPS). */
export const HERO_FRAME_MIN_MS = 1000 / HERO_FPS;

/** Drawing-buffer width cap (1080p). */
export const HERO_MAX_BUFFER_WIDTH = 1920;

/** Drawing-buffer height cap (1080p). */
export const HERO_MAX_BUFFER_HEIGHT = 1080;

/**
 * Max texture edge. Matches a Next `/_next/image` width so catalog art
 * is never the 4K originals.
 */
export const HERO_TEXTURE_MAX_PX = 1080;

/** World-space sun diameter, matching the old 560px CSS disk. */
export const HERO_SUN_DIAMETER_PX = 560;

/** 1080p-class Cymasphere planet — never the 4K JPG. */
export const CYMASPHERE_SUN_POSTER = "/images/cymasphere-sun-sphere-hero.webp";

/** 1080p-class CymaSynth planet — never the 4K JPG. */
export const CYMASYNTH_SPHERE_POSTER = "/images/cymasynth-sphere-hero.webp";

/**
 * @brief Uniform scale that fits a CSS board into a 1920×1080 buffer.
 * @param cssWidth Board CSS width.
 * @param cssHeight Board CSS height.
 * @returns Scale in (0, 1].
 */
export function heroBufferScale(cssWidth: number, cssHeight: number): number {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  return Math.min(1, HERO_MAX_BUFFER_WIDTH / w, HERO_MAX_BUFFER_HEIGHT / h);
}

/**
 * @brief WebGL drawing-buffer size for a CSS board. Never exceeds 1080p.
 * @param cssWidth Board CSS width.
 * @param cssHeight Board CSS height.
 * @returns Integer buffer width and height.
 * @example
 * heroDrawingBufferSize(3840, 2160) // { width: 1920, height: 1080 }
 */
export function heroDrawingBufferSize(
  cssWidth: number,
  cssHeight: number
): { width: number; height: number } {
  const scale = heroBufferScale(cssWidth, cssHeight);
  return {
    width: Math.max(1, Math.round(cssWidth * scale)),
    height: Math.max(1, Math.round(cssHeight * scale)),
  };
}

/**
 * @brief Whether this rAF should skip the GPU draw (30 FPS cap).
 * Physics still uses the real timestamp when a frame is drawn.
 * @param now rAF time.
 * @param lastDrawAt Previous drawn frame time, or null on the first draw.
 * @returns True when the draw should be skipped.
 */
export function shouldSkipHeroFrame(
  now: number,
  lastDrawAt: number | null
): boolean {
  if (lastDrawAt == null) return false;
  return now - lastDrawAt < HERO_FRAME_MIN_MS;
}
