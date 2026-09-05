/**
 * @fileoverview Shared brand-header copy for the email VisualEditor and previews.
 * @module utils/email-campaigns/brand-header
 */

/**
 * Default logo wordmark shown beside the NN icon.
 */
export const DEFAULT_BRAND_HEADER = "Audio";

/**
 * @brief Replaces empty or leftover Cymasphere/NNAudio header copy with Audio.
 * @param content Stored brand-header text from a template or campaign.
 * @returns Display text for the logo header.
 * @note The header icon already includes "NN", so the wordmark is only "Audio".
 * @example
 * resolveBrandHeaderText("CYMASPHERE") // "Audio"
 * resolveBrandHeaderText("NNAudio") // "Audio"
 */
export function resolveBrandHeaderText(content?: string | null): string {
  const raw = (content ?? "").trim();
  if (!raw || /^(cymasphere|nnaudio|nn\s*audio)$/i.test(raw)) {
    return DEFAULT_BRAND_HEADER;
  }
  return raw;
}

/**
 * @brief Splits brand-header text for the two-tone logo treatment.
 * @param content Stored brand-header text from a template or campaign.
 * @returns Lead (gradient) and rest (solid) segments.
 * @note Default "Audio" is shown as a single solid word next to the NN icon.
 * @example
 * splitBrandHeaderText("Audio") // { lead: "", rest: "Audio" }
 */
export function splitBrandHeaderText(content?: string | null): {
  lead: string;
  rest: string;
} {
  const text = resolveBrandHeaderText(content);
  if (/^audio$/i.test(text)) {
    return { lead: "", rest: text };
  }
  if (text.length <= 2) {
    return { lead: text, rest: "" };
  }
  return { lead: text.slice(0, 2), rest: text.slice(2) };
}
