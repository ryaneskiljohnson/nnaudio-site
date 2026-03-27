/**
 * @fileoverview Promotion target keys: `product:*`, `product:*:tier`, `bundle:*:tier`; eligibility helpers.
 * @module utils/promotions/apply-promotion
 */

export type PromotionTargetMode = "all" | "selected";

/** @brief Subset of `public.promotions` fields used for discount eligibility. */
export type PromotionPricingRow = {
  promotion_target_mode: PromotionTargetMode | string | null;
  included_targets: string[] | null;
  discount_type: string;
  discount_value: number;
  start_date?: string | null;
  end_date?: string | null;
};

export const PLAN_TYPES = ["monthly", "annual", "lifetime"] as const;
export type PlanTypeKey = (typeof PLAN_TYPES)[number];

/** @brief Validates UUID in target keys. */
export const PRODUCT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRODUCT_KEY_RE = /^product:([0-9a-f-]{36})$/i;
const PRODUCT_TIER_KEY_RE =
  /^product:([0-9a-f-]{36}):(monthly|annual|lifetime)$/i;
const BUNDLE_KEY_RE =
  /^bundle:([0-9a-f-]{36}):(monthly|annual|lifetime)$/i;

/**
 * @brief Normalizes admin/API target strings to canonical lowercase keys.
 * @param input Raw array from JSON body.
 * @returns Deduplicated valid keys.
 */
export function normalizeIncludedTargets(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const x of input) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (PRODUCT_TIER_KEY_RE.test(s)) {
      const m = s.match(PRODUCT_TIER_KEY_RE)!;
      if (PRODUCT_UUID_RE.test(m[1])) {
        out.add(`product:${m[1].toLowerCase()}:${m[2]}`);
      }
    } else if (PRODUCT_KEY_RE.test(s)) {
      const m = s.match(PRODUCT_KEY_RE)!;
      if (PRODUCT_UUID_RE.test(m[1])) {
        out.add(`product:${m[1].toLowerCase()}`);
      }
    } else if (BUNDLE_KEY_RE.test(s)) {
      const m = s.match(BUNDLE_KEY_RE)!;
      if (PRODUCT_UUID_RE.test(m[1])) {
        out.add(`bundle:${m[1].toLowerCase()}:${m[2]}`);
      }
    }
  }
  return [...out];
}

function isAllMode(promotion: PromotionPricingRow | null): boolean {
  return promotion?.promotion_target_mode === "all";
}

function targetsSet(promotion: PromotionPricingRow | null): Set<string> {
  return new Set(promotion?.included_targets ?? []);
}

/**
 * @brief Membership / product tier checkout (e.g. monthly on a given product).
 */
export function promotionIncludesProductTier(
  promotion: PromotionPricingRow | null,
  productId: string,
  tier: PlanTypeKey
): boolean {
  if (!promotion) return false;
  if (isAllMode(promotion)) return true;
  const id = productId.toLowerCase();
  const ts = targetsSet(promotion);
  if (ts.has(`product:${id}`)) return true;
  return ts.has(`product:${id}:${tier}`);
}

/**
 * @brief Subscription tiers under `product:<id>` targets (for checkout CTA / banner).
 * @param promotion Promotion row or null.
 * @param productId Catalog product UUID.
 * @returns Sorted tiers covered by the promotion for that product.
 */
export function subscriptionTiersForProduct(
  promotion: PromotionPricingRow | null,
  productId: string
): PlanTypeKey[] {
  if (!promotion) return [];
  if (isAllMode(promotion)) return [...PLAN_TYPES];
  const id = productId.toLowerCase();
  const ts = targetsSet(promotion);
  if (ts.has(`product:${id}`)) return [...PLAN_TYPES];
  const out: PlanTypeKey[] = [];
  for (const t of PLAN_TYPES) {
    if (ts.has(`product:${id}:${t}`)) out.push(t);
  }
  return out;
}

/**
 * @brief Elite bundle tier checkout.
 */
export function promotionIncludesBundleTier(
  promotion: PromotionPricingRow | null,
  bundleId: string,
  tier: PlanTypeKey
): boolean {
  if (!promotion) return false;
  if (isAllMode(promotion)) return true;
  const id = bundleId.toLowerCase();
  return targetsSet(promotion).has(`bundle:${id}:${tier}`);
}

/**
 * @brief Catalog product receives merged promotional sale price in `/api/products`.
 */
export function isShopProductIncluded(
  productId: string,
  promotion: PromotionPricingRow | null
): boolean {
  if (!promotion) return false;
  if (isAllMode(promotion)) return true;
  const id = productId.toLowerCase();
  const ts = targetsSet(promotion);
  if (ts.has(`product:${id}`)) return true;
  for (const k of ts) {
    if (k.startsWith(`product:${id}:`)) return true;
  }
  return false;
}

const UUID_LINE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @brief Cart lines that look like catalog products (UUID ids).
 */
export function isShopCartLineItems(
  items: { id: string }[] | undefined
): boolean {
  if (!items?.length) return false;
  return items.every((i) => UUID_LINE_RE.test(i.id));
}

/**
 * @brief Sale price from regular price and promotion discount fields.
 */
export function computePromotionalUnitPrice(
  regularPrice: number,
  discount_type: string,
  discount_value: number
): number {
  if (discount_type === "percentage") {
    return Math.max(
      0,
      Math.round(regularPrice * (1 - discount_value / 100) * 100) / 100
    );
  }
  return Math.max(0, regularPrice - discount_value);
}

/**
 * @brief Merges manual `sale_price` with promotion-derived unit price.
 */
export function mergeManualAndPromotionalSalePrice(
  regularPrice: number,
  manualSale: number | null | undefined,
  promoPrice: number | null
): number | null {
  const candidates: number[] = [];
  if (manualSale != null && Number.isFinite(manualSale)) {
    candidates.push(manualSale);
  }
  if (promoPrice != null && Number.isFinite(promoPrice)) {
    candidates.push(promoPrice);
  }
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export type LineForEligibility = {
  id: string;
  lineTotal: number;
};

/**
 * @brief Subtotal eligible for a DB-linked coupon on the shop cart.
 */
export function eligibleSubtotalForPromotion(
  items: LineForEligibility[],
  promotion: PromotionPricingRow | null
): number {
  if (!items.length) return 0;
  if (!promotion) {
    return items.reduce((s, i) => s + i.lineTotal, 0);
  }
  if (isAllMode(promotion)) {
    return items.reduce((s, i) => s + i.lineTotal, 0);
  }
  const ts = targetsSet(promotion);
  const hasProductTarget = [...ts].some((t) => t.startsWith("product:"));

  if (isShopCartLineItems(items)) {
    if (!hasProductTarget) {
      return 0;
    }
    return items.reduce((sum, line) => {
      const id = line.id.toLowerCase();
      if (!UUID_LINE_RE.test(id)) return sum;
      if (ts.has(`product:${id}`)) return sum + line.lineTotal;
      if ([...ts].some((k) => k.startsWith(`product:${id}:`))) {
        return sum + line.lineTotal;
      }
      return sum;
    }, 0);
  }

  return items.reduce((s, i) => s + i.lineTotal, 0);
}

/**
 * @brief Discount dollars for eligible subtotal (Stripe coupon shape).
 */
export function discountAmountForEligibleSubtotal(
  eligibleSubtotal: number,
  coupon: { percent_off?: number | null; amount_off?: number | null }
): number {
  if (eligibleSubtotal <= 0) return 0;
  if (coupon.percent_off) {
    return (eligibleSubtotal * coupon.percent_off) / 100;
  }
  if (coupon.amount_off) {
    return Math.min(eligibleSubtotal, coupon.amount_off / 100);
  }
  return 0;
}

export function applyPromotionToBundleTierPrice(
  tierListPrice: number,
  promotion: Pick<PromotionPricingRow, "discount_type" | "discount_value"> | null
): number | null {
  if (!promotion) return null;
  return computePromotionalUnitPrice(
    tierListPrice,
    promotion.discount_type,
    Number(promotion.discount_value)
  );
}

export type BundlePricingSnapshot = {
  monthly?: { price?: number; sale_price?: number | null } | null;
  annual?: { price?: number; sale_price?: number | null } | null;
  lifetime?: { price?: number; sale_price?: number | null } | null;
};

/**
 * @brief Clones bundle tier rows with merged `sale_price` when the promotion covers each tier.
 */
export function applyPromotionToBundlePricingSnapshot(
  bundleId: string,
  pricing: BundlePricingSnapshot,
  promotion: PromotionPricingRow | null
): BundlePricingSnapshot {
  if (!promotion) return pricing;
  const out: BundlePricingSnapshot = { ...pricing };
  for (const tier of PLAN_TYPES) {
    const row = pricing[tier];
    if (!row) continue;
    if (!promotionIncludesBundleTier(promotion, bundleId, tier)) continue;
    const list = Number(row.price);
    if (!Number.isFinite(list)) continue;
    const promoUnit = computePromotionalUnitPrice(
      list,
      promotion.discount_type,
      Number(promotion.discount_value)
    );
    const merged = mergeManualAndPromotionalSalePrice(
      list,
      row.sale_price,
      promoUnit
    );
    if (merged !== null) {
      out[tier] = { ...row, sale_price: merged };
    }
  }
  return out;
}
