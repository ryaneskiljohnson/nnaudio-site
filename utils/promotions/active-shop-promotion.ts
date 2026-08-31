/**
 * @fileoverview Shared helpers for the highest-priority active shop-wide
 * promotion used by `/api/products` and the homepage catalog seed.
 * @module utils/promotions/active-shop-promotion
 */

import { isPSTDateAfterNow, isPSTDateBeforeNow } from "@/utils/timezoneUtils";
import {
  applyShopPromotionToProducts,
  isShopProductIncluded,
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";

/** Promotion row fields needed for shop catalog pricing. */
export type ShopPromotionRow = PromotionPricingRow & {
  priority?: number | null;
};

/**
 * @brief True when a promotion is within its PST schedule window.
 * @param promo Row with optional start_date and end_date.
 * @returns Whether the promotion is currently active by date.
 */
export function isPromotionScheduleActive(
  promo: Pick<ShopPromotionRow, "start_date" | "end_date">
): boolean {
  if (promo.start_date && isPSTDateAfterNow(promo.start_date)) return false;
  if (promo.end_date && isPSTDateBeforeNow(promo.end_date)) return false;
  return true;
}

/**
 * @brief True when a promotion can affect catalog product prices.
 * @param promo Promotion row from `promotions`.
 * @returns Whether any shop product may receive a merged sale price.
 */
export function promotionAffectsShopProducts(promo: PromotionPricingRow): boolean {
  if (promo.promotion_target_mode === "all") return true;
  const targets = promo.included_targets || [];
  return targets.some(
    (x) => typeof x === "string" && x.startsWith("product:")
  );
}

/**
 * @brief Picks the first schedule-valid shop promotion from a priority-ordered list.
 * @param rows Promotions sorted by descending priority.
 * @returns Active shop promotion or null.
 */
export function pickActiveShopPromotion(
  rows: ShopPromotionRow[] | null | undefined
): ShopPromotionRow | null {
  return (
    (rows ?? []).find(
      (p) => isPromotionScheduleActive(p) && promotionAffectsShopProducts(p)
    ) ?? null
  );
}

/**
 * @brief Loads the active shop promotion from Supabase (anon or service client).
 * @param supabase Supabase client with `promotions` read access.
 * @returns Highest-priority active shop promotion or null.
 */
export async function fetchActiveShopPromotion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<ShopPromotionRow | null> {
  const { data } = await supabase
    .from("promotions")
    .select(
      "id, promotion_target_mode, included_targets, discount_type, discount_value, start_date, end_date, priority"
    )
    .eq("active", true)
    .order("priority", { ascending: false });

  return pickActiveShopPromotion(data);
}

/**
 * @brief Applies the active shop promotion to catalog rows when one exists.
 * @param products Product rows with id, price, and sale_price.
 * @param promotion Active shop promotion or null.
 * @returns Products with merged sale_price when eligible.
 */
export function withShopPromotionPrices<
  T extends {
    id: string | number;
    price?: number | null;
    sale_price?: number | null;
  },
>(products: T[], promotion: PromotionPricingRow | null): T[] {
  if (!promotion) return products;
  return applyShopPromotionToProducts(products, promotion);
}

/**
 * @brief Marks catalog rows that are targets of the active shop promotion.
 * Manual perpetual sales do not count.
 * @param products Catalog rows with ids.
 * @param promotion Active shop promotion or null.
 */
export function flagShopPromotedProducts<
  T extends { id?: string | number | null },
>(
  products: T[],
  promotion: PromotionPricingRow | null
): Array<T & { shopPromoted: boolean }> {
  return products.map((product) => ({
    ...product,
    shopPromoted: Boolean(
      product.id != null &&
        product.id !== "" &&
        isShopProductIncluded(String(product.id), promotion)
    ),
  }));
}
