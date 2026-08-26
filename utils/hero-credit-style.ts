/**
 * @fileoverview Wrap-safe credit-card name CSS. Shared by the live
 * CircuitNetwork overlay and the homepage video tour so “Cymasphere”
 * cannot orphan a letter at 1080p.
 * @module utils/hero-credit-style
 */

/** Desktop credit slot: `max-width: min(38vw, 420px)`. */
export const CREDIT_SLOT_MAX_PX = 420;
export const CREDIT_SLOT_VW = 38;
/** Desktop thumb + gap that eat the name column. */
export const CREDIT_THUMB_DESKTOP_PX = 112;
export const CREDIT_THUMB_GAP_DESKTOP_PX = 20;

/**
 * Name must stay one line. `overflow-wrap: anywhere` was breaking
 * “Cymasphere” into “Cymaspher” / “e” when the clamp max did not fit.
 */
export const CREDIT_NAME_WRAP_CSS = {
  overflowWrap: "normal",
  wordBreak: "normal",
  whiteSpace: "nowrap",
  hyphens: "none",
} as const;

/** Desktop clamp — slightly under the old 3.1rem max so long names fit. */
export const CREDIT_NAME_FONT_DESKTOP = "clamp(1.35rem, 3.2vw, 2.35rem)";
/** Phone clamp (thumb is 56px; more column width relative to type). */
export const CREDIT_NAME_FONT_MOBILE = "clamp(1.15rem, 6vw, 1.55rem)";

/** Letter-spacing on CreditName. */
export const CREDIT_NAME_TRACKING_EM = -0.03;

/**
 * Conservative average glyph width for the display face (800 / tight
 * tracking). Wide enough that a passing fit check is meaningful.
 */
export const CREDIT_NAME_GLYPH_EM = 0.68;

/**
 * @brief Remaining CSS pixels for the product name at a viewport width.
 * @param viewportWidth Layout viewport width (e.g. 1080).
 * @returns Name-column width after thumb + gap.
 */
export function creditNameColumnPx(viewportWidth: number): number {
  const slot = Math.min(
    (CREDIT_SLOT_VW / 100) * viewportWidth,
    CREDIT_SLOT_MAX_PX
  );
  return slot - CREDIT_THUMB_DESKTOP_PX - CREDIT_THUMB_GAP_DESKTOP_PX;
}

/**
 * @brief Resolves the desktop name clamp at a 16px root.
 * @param viewportWidth Layout viewport width.
 * @param rootPx Root font size.
 * @returns Computed font size in CSS pixels.
 */
export function creditNameFontSizePx(
  viewportWidth: number,
  rootPx = 16
): number {
  const min = 1.35 * rootPx;
  const max = 2.35 * rootPx;
  const vw = (3.2 / 100) * viewportWidth;
  return Math.min(max, Math.max(min, vw));
}

/**
 * @brief Estimated advance width for a credit name (no mid-word wrap).
 * @param name Product name.
 * @param fontSizePx Computed font size.
 * @returns Estimated CSS pixel width.
 */
export function estimateCreditNameWidthPx(
  name: string,
  fontSizePx: number
): number {
  return (
    name.length * fontSizePx * (CREDIT_NAME_GLYPH_EM + CREDIT_NAME_TRACKING_EM)
  );
}

/**
 * @brief Whether a name stays on one line in the remaining column.
 * @param name Product name.
 * @param columnPx Name-column width.
 * @param fontSizePx Computed font size.
 * @returns True when the estimated width fits.
 */
export function creditNameStaysOneLine(
  name: string,
  columnPx: number,
  fontSizePx: number
): boolean {
  return estimateCreditNameWidthPx(name, fontSizePx) <= columnPx;
}
