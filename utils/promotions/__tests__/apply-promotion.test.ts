import { describe, it, expect } from "vitest";
import {
  eligibleSubtotalForPromotion,
  STRIPE_ONLY_COUPON_SCOPE,
  type PromotionPricingRow,
} from "@/utils/promotions/apply-promotion";

const PRODUCT_A = "11111111-1111-4111-8111-111111111111";
const PRODUCT_B = "22222222-2222-4222-8222-222222222222";

const items = [
  { id: PRODUCT_A, lineTotal: 40 },
  { id: PRODUCT_B, lineTotal: 60 },
];

describe("eligibleSubtotalForPromotion", () => {
  it("fails closed when promotion is null", () => {
    expect(eligibleSubtotalForPromotion(items, null)).toBe(0);
  });

  it("discounts the whole cart for an explicit all-mode / Stripe-only scope", () => {
    expect(eligibleSubtotalForPromotion(items, STRIPE_ONLY_COUPON_SCOPE)).toBe(
      100
    );
  });

  it("limits selected-mode promotions to matching product ids", () => {
    const promotion: PromotionPricingRow = {
      promotion_target_mode: "selected",
      included_targets: [`product:${PRODUCT_A}`],
      discount_type: "percent",
      discount_value: 10,
    };
    expect(eligibleSubtotalForPromotion(items, promotion)).toBe(40);
  });

  it("returns 0 for selected-mode with no product targets", () => {
    const promotion: PromotionPricingRow = {
      promotion_target_mode: "selected",
      included_targets: [],
      discount_type: "percent",
      discount_value: 10,
    };
    expect(eligibleSubtotalForPromotion(items, promotion)).toBe(0);
  });
});
