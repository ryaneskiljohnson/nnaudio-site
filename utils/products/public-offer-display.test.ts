import { describe, expect, it } from "vitest";
import {
  applyCymasphereOfferPrices,
  getPublicOfferDisplay,
} from "./public-offer-display";

describe("getPublicOfferDisplay", () => {
  it("locks Cymasphere at $199 with no $499 or $149 compare-at", () => {
    expect(
      getPublicOfferDisplay({
        slug: "cymasphere",
        price: 499,
        sale_price: 149,
      })
    ).toEqual({ amount: 199, compareAt: null, isFree: false });
    expect(
      getPublicOfferDisplay({
        slug: "Cymasphere",
        price: 499,
        sale_price: null,
        compareAtPrice: 499,
      })
    ).toEqual({ amount: 199, compareAt: null, isFree: false });
    expect(
      applyCymasphereOfferPrices({
        slug: "cymasphere",
        price: 499,
        sale_price: 149,
        compareAtPrice: 499,
      })
    ).toEqual({
      slug: "cymasphere",
      price: 199,
      sale_price: 199,
      compareAtPrice: null,
    });
  });

  it("keeps sale strikethrough for other products", () => {
    expect(
      getPublicOfferDisplay({
        slug: "curio-texture-generator",
        price: 34.95,
        sale_price: 29.95,
      })
    ).toEqual({ amount: 29.95, compareAt: 34.95, isFree: false });
  });

  it("keeps bundle compare-at for non-Cymasphere cards", () => {
    expect(
      getPublicOfferDisplay({
        slug: "ultimate-bundle",
        price: 299,
        sale_price: 299,
        compareAtPrice: 1200,
      })
    ).toEqual({ amount: 299, compareAt: 1200, isFree: false });
  });

  it("marks free products and can keep a prior list price", () => {
    expect(
      getPublicOfferDisplay({
        slug: "game-boi-retro-sounds-free-plugin",
        price: 24.95,
        sale_price: 0,
      })
    ).toEqual({ amount: 0, compareAt: 24.95, isFree: true });
  });
});
