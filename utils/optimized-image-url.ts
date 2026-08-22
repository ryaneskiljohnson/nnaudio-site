/**
 * @fileoverview Builds same-origin `/_next/image` URLs for raw `<img>` and
 * `new Image()` loads. Only wraps sources Next is configured to optimize
 * (`next.config.js` `images.remotePatterns` plus root-relative paths).
 * @module utils/optimized-image-url
 */

/**
 * Widths Next.js will serve from `/_next/image` when `images.imageSizes`
 * and `images.deviceSizes` are left at defaults (this repo does not
 * override them). A request for any other `w` returns 400.
 */
export const NEXT_IMAGE_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
] as const;

/**
 * Quality Next 16 accepts on `/_next/image` unless `images.qualities` is
 * configured. Other values return 400 (`INVALID_IMAGE_OPTIMIZE_REQUEST`).
 */
export const NEXT_IMAGE_QUALITY = 75;

/** Exact hosts from `images.remotePatterns` in next.config.js. */
const ALLOWED_IMAGE_HOSTS = new Set(["nnaud.io"]);

/**
 * @brief True when Next/image (and `/_next/image`) will accept this src.
 * @param src Absolute or root-relative image URL.
 * @returns False for empty, data/blob, protocol-relative, or unknown hosts.
 * @example
 * isOptimizableImageSrc("/images/icon.png") // true
 * isOptimizableImageSrc("https://evil.example/a.png") // false
 */
export function isOptimizableImageSrc(src: string): boolean {
  const url = src.trim();
  if (!url) return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  if (url.startsWith("/_next/image")) return true;
  if (url.startsWith("//")) return false;
  if (url.startsWith("/")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_IMAGE_HOSTS.has(host)) return true;
    return (
      host.endsWith(".supabase.co") &&
      parsed.pathname.startsWith("/storage/v1/object/")
    );
  } catch {
    return false;
  }
}

/**
 * @brief Whether a canvas bake must request the image CORS-anonymous.
 * @param src Image URL passed to `new Image()`.
 * @param pageOrigin Document origin when known (tests pass this explicitly).
 * @returns False for same-origin and `/_next/image` URLs.
 * @note Setting `crossOrigin` on a same-origin optimizer URL can taint or
 * fail the load when the response has no ACAO header.
 */
export function imageUrlNeedsCrossOrigin(
  src: string,
  pageOrigin?: string
): boolean {
  const url = src.trim();
  if (!url) return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  if (url.startsWith("/_next/image")) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return false;

  const origin =
    pageOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!origin) return true;

  try {
    return new URL(url, origin).origin !== origin;
  } catch {
    return true;
  }
}

/**
 * @brief Smallest configured optimizer width that covers a CSS pixel size.
 * @param displayPx Rendered CSS width (or bake size) in pixels.
 * @returns A width from NEXT_IMAGE_WIDTHS.
 * @example
 * nearestNextImageWidth(52) // 64
 */
export function nearestNextImageWidth(displayPx: number): number {
  const needed = Math.max(1, Math.ceil(displayPx));
  const match = NEXT_IMAGE_WIDTHS.find((width) => width >= needed);
  return match ?? NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1];
}

/**
 * @brief Same-origin optimized URL for a local or allowlisted remote image.
 * @param src Absolute or root-relative image URL.
 * @param displayPx Target rendered (or bake) width in CSS pixels.
 * @returns `/_next/image?...` URL, or the original src when it cannot be optimized.
 * @note Quality is always 75. Next 16 `/_next/image` rejects other `q`
 * values unless `images.qualities` is set, which 400s the request.
 * @example
 * optimizedImageUrl("https://nnaud.io/a.png", 52)
 * // "/_next/image?url=https%3A%2F%2Fnnaud.io%2Fa.png&w=64&q=75"
 */
export function optimizedImageUrl(src: string, displayPx: number): string {
  const url = src.trim();
  if (!url) return url;
  if (url.startsWith("/_next/image")) return url;
  if (!isOptimizableImageSrc(url)) return url;

  const w = nearestNextImageWidth(displayPx);
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${NEXT_IMAGE_QUALITY}`;
}
