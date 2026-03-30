/**
 * @fileoverview localStorage helpers for promotion banner dismissals with a 24-hour TTL.
 * @module utils/promotions/promotion-banner-dismissal
 */

/** @brief localStorage key shared by `PromotionBanner` and `PricingSection`. */
export const PROMOTION_BANNER_DISMISSAL_STORAGE_KEY = "closedPromotionBanners";

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * @brief Parses stored dismissals, drops expired entries, migrates legacy permanent format, and syncs storage.
 * @returns Map of promotion id → `Date.now()` when dismissed (only non-expired).
 */
export function getPrunedPromotionDismissals(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(PROMOTION_BANNER_DISMISSAL_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(PROMOTION_BANNER_DISMISSAL_STORAGE_KEY);
    return {};
  }

  const now = Date.now();

  if (Array.isArray(parsed)) {
    localStorage.removeItem(PROMOTION_BANNER_DISMISSAL_STORAGE_KEY);
    return {};
  }

  if (typeof parsed !== "object" || parsed === null) {
    localStorage.removeItem(PROMOTION_BANNER_DISMISSAL_STORAGE_KEY);
    return {};
  }

  const pruned: Record<string, number> = {};
  for (const [id, value] of Object.entries(
    parsed as Record<string, unknown>
  )) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      now - value < DISMISS_TTL_MS
    ) {
      pruned[id] = value;
    }
  }

  const nextSerialized = JSON.stringify(pruned);
  if (nextSerialized !== raw) {
    if (Object.keys(pruned).length === 0) {
      localStorage.removeItem(PROMOTION_BANNER_DISMISSAL_STORAGE_KEY);
    } else {
      localStorage.setItem(
        PROMOTION_BANNER_DISMISSAL_STORAGE_KEY,
        nextSerialized
      );
    }
  }

  return pruned;
}

/**
 * @brief Whether the given promotion is dismissed and still inside the 24-hour window.
 * @param promotionId UUID from `promotions.id`
 */
export function isPromotionBannerDismissed(promotionId: string): boolean {
  const record = getPrunedPromotionDismissals();
  return Object.prototype.hasOwnProperty.call(record, promotionId);
}

/**
 * @brief Records a dismissal for `promotionId` starting now (resets the 24-hour window if already dismissed).
 * @param promotionId UUID from `promotions.id`
 */
export function recordPromotionBannerDismissal(promotionId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const record = getPrunedPromotionDismissals();
  record[promotionId] = Date.now();
  localStorage.setItem(
    PROMOTION_BANNER_DISMISSAL_STORAGE_KEY,
    JSON.stringify(record)
  );
}
