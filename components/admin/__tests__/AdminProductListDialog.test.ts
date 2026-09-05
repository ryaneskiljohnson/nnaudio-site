/**
 * @fileoverview Tests for admin product-list dialog helpers.
 * @module components/admin/__tests__/AdminProductListDialog.test
 */

import { describe, expect, it } from "vitest";
import {
  listedProductsFromOrder,
  productCountLabel,
} from "@/components/admin/AdminProductListDialog";

describe("productCountLabel", () => {
  it("singularizes a single product", () => {
    expect(productCountLabel(1)).toBe("1 product");
  });

  it("pluralizes zero and many products", () => {
    expect(productCountLabel(0)).toBe("0 products");
    expect(productCountLabel(3)).toBe("3 products");
  });
});

describe("listedProductsFromOrder", () => {
  it("prefers structured products", () => {
    expect(
      listedProductsFromOrder({
        products: [{ name: "CymaSynth", slug: "cymasynth" }],
        productNames: ["Ignored"],
      })
    ).toEqual([{ name: "CymaSynth", slug: "cymasynth" }]);
  });

  it("falls back to productNames then productName", () => {
    expect(
      listedProductsFromOrder({ productNames: ["Blaque", "Game Boi"] })
    ).toEqual([{ name: "Blaque" }, { name: "Game Boi" }]);
    expect(listedProductsFromOrder({ productName: "Grant item" })).toEqual([
      { name: "Grant item" },
    ]);
    expect(listedProductsFromOrder({})).toEqual([]);
  });
});
