/**
 * @fileoverview Tests for PaymentIntent product-name resolution.
 * @module utils/stripe/__tests__/payment-intent-products.test
 */

import { describe, expect, it } from "vitest";
import {
  formatBundleSlugAsName,
  formatOrderProductNames,
  parseStripeCartItems,
  productNamesFromPaymentIntent,
} from "@/utils/stripe/payment-intent-products";

describe("parseStripeCartItems", () => {
  it("parses a cart_items JSON array", () => {
    const items = parseStripeCartItems(
      JSON.stringify([{ id: "p1", name: "CymaSynth", quantity: 1, price: 99 }])
    );
    expect(items).toEqual([
      { id: "p1", name: "CymaSynth", quantity: 1, price: 99 },
    ]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseStripeCartItems("{not-json")).toEqual([]);
    expect(parseStripeCartItems(undefined)).toEqual([]);
  });
});

describe("formatBundleSlugAsName", () => {
  it("title-cases hyphenated slugs", () => {
    expect(formatBundleSlugAsName("ultimate-elite-bundle")).toBe(
      "Ultimate Elite Bundle"
    );
  });
});

describe("productNamesFromPaymentIntent", () => {
  it("prefers cart_items names", () => {
    expect(
      productNamesFromPaymentIntent({
        cart_items: JSON.stringify([
          { name: "CymaSynth" },
          { name: "Cymasphere" },
        ]),
        purchase_type: "lifetime",
      })
    ).toEqual(["CymaSynth", "Cymasphere"]);
  });

  it("uses lifetime fallback when cart_items is missing", () => {
    expect(
      productNamesFromPaymentIntent({ purchase_type: "lifetime" })
    ).toEqual(["Lifetime Access"]);
  });

  it("uses bundle slug and tier when cart_items is missing", () => {
    expect(
      productNamesFromPaymentIntent({
        bundle_slug: "elite-bundle",
        tier: "annual",
      })
    ).toEqual(["Elite Bundle (annual)"]);
  });

  it("falls back to invoice lines then description", () => {
    expect(
      productNamesFromPaymentIntent({}, null, ["Pro Monthly"])
    ).toEqual(["Pro Monthly"]);
    expect(productNamesFromPaymentIntent({}, "Manual charge")).toEqual([
      "Manual charge",
    ]);
  });
});

describe("formatOrderProductNames", () => {
  it("joins productNames and falls back to productName", () => {
    expect(
      formatOrderProductNames({ productNames: ["CymaSynth", "Cymasphere"] })
    ).toBe("CymaSynth, Cymasphere");
    expect(formatOrderProductNames({ productName: "Grant: Tetrad" })).toBe(
      "Grant: Tetrad"
    );
    expect(formatOrderProductNames({})).toBe("");
  });
});
