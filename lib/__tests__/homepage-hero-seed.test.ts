import { describe, it, expect } from "vitest";
import {
  countHeroCatalogProducts,
  emptyHomepageCatalogSeed,
  isFreeHomepageProduct,
  mapRawProductToFeaturedCard,
  sortFeaturedProducts,
  CURATED_FEATURED_ORDER,
} from "@/lib/homepage-hero-seed";

describe("countHeroCatalogProducts", () => {
  it("counts distinct slugs and skips named hero bodies", () => {
    const count = countHeroCatalogProducts([
      { slug: "reiya" },
      { slug: "reiya" },
      { slug: "cymasynth" },
      { slug: "cymasphere" },
      { slug: "nnaudio-access" },
      { slug: "curio-texture-generator" },
    ]);
    expect(count).toBe(2);
  });

  it("returns 0 for an empty list", () => {
    expect(countHeroCatalogProducts([])).toBe(0);
  });
});

describe("isFreeHomepageProduct", () => {
  it("includes zero-price products", () => {
    expect(
      isFreeHomepageProduct({
        id: "1",
        slug: "free-delay",
        name: "Free Delay",
        price: 0,
        sale_price: null,
      })
    ).toBe(true);
  });

  it("excludes NNAudio Access by slug and name", () => {
    expect(
      isFreeHomepageProduct({
        id: "2",
        slug: "nnaudio-access",
        name: "NNAudio Access",
        price: 0,
      })
    ).toBe(false);
    expect(
      isFreeHomepageProduct({
        id: "3",
        slug: "access",
        name: "NNAudio Access App",
        price: 0,
      })
    ).toBe(false);
  });

  it("excludes paid products", () => {
    expect(
      isFreeHomepageProduct({
        id: "4",
        slug: "reiya",
        name: "Reiya",
        price: 49,
        sale_price: 39,
      })
    ).toBe(false);
  });
});

describe("sortFeaturedProducts", () => {
  it("orders curated slugs first and caps at five cards", () => {
    const cards = sortFeaturedProducts(
      [
        "other-plugin",
        "reiya",
        "cymasphere",
        "ultimate-bundle",
        "another",
        "curio-texture-generator",
        "sixth",
      ].map((slug) =>
        mapRawProductToFeaturedCard({
          id: slug,
          slug,
          name: slug,
          price: 10,
        })
      )
    );

    expect(cards.map((c) => c.slug)).toEqual([
      "ultimate-bundle",
      "cymasphere",
      "curio-texture-generator",
      "reiya",
      "other-plugin",
    ]);
    expect(cards.length).toBe(5);
  });

  it("places unknown slugs after curated entries", () => {
    const cards = sortFeaturedProducts([
      mapRawProductToFeaturedCard({
        id: "a",
        slug: "alpha",
        name: "Alpha",
        price: 1,
      }),
      mapRawProductToFeaturedCard({
        id: "b",
        slug: CURATED_FEATURED_ORDER[0],
        name: "Bundle",
        price: 1,
      }),
    ]);

    expect(cards[0].slug).toBe(CURATED_FEATURED_ORDER[0]);
    expect(cards[1].slug).toBe("alpha");
  });
});

describe("emptyHomepageCatalogSeed", () => {
  it("returns independent category buckets", () => {
    const seed = emptyHomepageCatalogSeed();
    seed.instruments.count = 5;
    expect(seed.effects.count).toBe(0);
    expect(seed.packs.thumbs).toEqual([]);
    expect(seed.heroTour.instruments).toEqual([]);
    expect(seed.cymasphereProduct).toBeNull();
    expect(seed.freeProducts).toEqual([]);
  });
});

describe("mapRawProductToFeaturedCard", () => {
  it("uses sale price in the display string", () => {
    const card = mapRawProductToFeaturedCard({
      id: "1",
      slug: "reiya",
      name: "Reiya",
      price: 49,
      sale_price: 29,
      featured_image_url: "https://example.com/img.png",
      logo_url: "https://example.com/logo.png",
    });
    expect(card.price).toBe("$29");
  });
});
