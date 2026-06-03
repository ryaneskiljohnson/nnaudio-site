/**
 * @fileoverview Detect support-ticket videos that can play inline in HTML5 video elements.
 * @module utils/support/is-inline-playable-video-attachment
 */

const QUICKTIME_MIME = /^video\/quicktime$/i;
const INLINE_VIDEO_MIME = /^video\/(mp4|webm|ogg)$/i;

/**
 * @brief True when the attachment is likely playable in Chrome/Firefox/Edge via HTML5 video.
 * @param fileType Stored MIME from upload (e.g. video/quicktime for iPhone .MOV)
 * @param fileName Original filename (extension fallback)
 * @returns Whether to render an inline video preview
 * @note iPhone screen recordings and camera rolls often upload as .MOV / video/quicktime, which Safari may play but other browsers cannot.
 */
export function isInlinePlayableVideoAttachment(
  fileType: string | null | undefined,
  fileName: string,
): boolean {
  const t = fileType?.trim();
  if (t && QUICKTIME_MIME.test(t)) {
    return false;
  }
  if (/\.(mov|qt)$/i.test(fileName)) {
    return false;
  }
  if (t && INLINE_VIDEO_MIME.test(t)) {
    return true;
  }
  if (/\.(mp4|webm|ogv|ogg|m4v)$/i.test(fileName)) {
    return true;
  }
  if (t?.toLowerCase().startsWith("video/")) {
    return !QUICKTIME_MIME.test(t);
  }
  return false;
}
