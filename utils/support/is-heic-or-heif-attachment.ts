/**
 * @fileoverview Helpers to detect Apple HEIC/HEIF image attachments in support UI.
 * @module utils/support/is-heic-or-heif-attachment
 */
const HEIC_HEIF_MIME = /^image\/hei[cf]$/i;

/**
 * @brief True when the attachment is HEIC or HEIF (often no inline <img> preview in Chrome/Edge).
 * @param fileType Stored MIME, may be empty for some iOS pickers
 * @param fileName Original filename (extension fallback)
 * @returns Whether to avoid relying on a plain img preview
 * @note HEIF may use image/heic or image/heif depending on the device.
 */
export function isHeicOrHeifAttachment(
  fileType: string | null | undefined,
  fileName: string
): boolean {
  const t = fileType?.trim();
  if (t && HEIC_HEIF_MIME.test(t)) return true;
  return /\.(heic|heif)$/i.test(fileName);
}

/**
 * @brief Suggested `accept` list for support ticket file inputs: common images (incl. HEIC) + video/audio/docs.
 * @returns Comma-separated accept string for <input type="file" />
 */
export const SUPPORT_TICKET_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*,.heic,.heif,video/*,audio/*,.pdf,.doc,.docx,.txt";
