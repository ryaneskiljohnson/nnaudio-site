import { describe, it, expect } from "vitest";
import {
  countHeroCatalogProducts,
  coverImageFromRow,
  emptyHomepageCatalogSeed,
  homepageCategoryTiles,
  isFreeHomepageProduct,
  formatHeroDealPrice,
  mapRawProductToFeaturedCard,
  orderHeroTourCatalog,
  partitionHeroTourProducts,
  seedRowToCard,
  sortFeaturedProducts,
  thumbsFromProducts,
  CURATED_FEATURED_ORDER,
  NNAUDIO_ACCESS_COVER,
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

describe("homepageCategoryTiles", () => {
  it("keeps the Access tile and hides empty buckets via count", () => {
    const seed = emptyHomepageCatalogSeed();
    seed.instruments.count = 3;
    const tiles = homepageCategoryTiles(seed);
    expect(tiles.find((t) => t.key === "access")?.alwaysShow).toBe(true);
    expect(tiles.find((t) => t.key === "instruments")?.count).toBe(3);
  });

  it("labels Access as 1 Product Manager and uses cover art", () => {
    const seed = emptyHomepageCatalogSeed();
    seed.bundles = {
      count: 4,
      thumbs: ["https://example.com/bundle.webp"],
    };
    const tiles = homepageCategoryTiles(seed);
    const access = tiles.find((t) => t.key === "access");
    expect(access?.count).toBe(1);
    expect(access?.label).toBe("Product Manager");
    expect(access?.images).toEqual([NNAUDIO_ACCESS_COVER]);
    expect(tiles.find((t) => t.key === "bundles")?.images).toEqual([
      "https://example.com/bundle.webp",
    ]);
  });
});

describe("coverImageFromRow / thumbsFromProducts", () => {
  it("prefers mosaic, then featured art, over logos", () => {
    expect(
      coverImageFromRow({
        featured_image_url: "https://example.com/feat.webp",
        logo_url: "https://example.com/logo.png",
      })
    ).toBe("https://example.com/feat.webp");
    expect(
      coverImageFromRow({
        mosaic_image_url: "https://example.com/mosaic.webp",
        featured_image_url: "https://example.com/feat.webp",
      })
    ).toBe("https://example.com/mosaic.webp");
  });

  it("ranks curated slugs first and skips duplicates", () => {
    expect(
      thumbsFromProducts([
        { slug: "other", featured_image_url: "https://example.com/a.webp" },
        { slug: "reiya", featured_image_url: "https://example.com/reiya.webp" },
        { slug: "copy", featured_image_url: "https://example.com/reiya.webp" },
      ])
    ).toEqual([
      "https://example.com/reiya.webp",
      "https://example.com/a.webp",
    ]);
  });

  it("pins Crystal Ball and Ultimate Bundle covers when preferred", () => {
    expect(
      thumbsFromProducts(
        [
          { slug: "freelay", featured_image_url: "https://example.com/free.webp" },
          {
            slug: "crystal-ball-magic-multi-effect",
            featured_image_url: "https://example.com/crystal.webp",
          },
        ],
        { preferSlugs: ["crystal-ball-magic-multi-effect"] }
      )[0]
    ).toBe("https://example.com/crystal.webp");
    expect(
      thumbsFromProducts(
        [
          {
            slug: "orbitals-bundle",
            mosaic_image_url: "https://example.com/orb-mosaic.webp",
            featured_image_url: "https://example.com/orb.webp",
          },
          {
            slug: "ultimate-bundle",
            mosaic_image_url: "https://example.com/ult-mosaic.webp",
            featured_image_url: "https://example.com/ultimate.webp",
          },
        ],
        { preferSlugs: ["ultimate-bundle"], allowMosaic: false }
      )[0]
    ).toBe("https://example.com/ultimate.webp");
  });
});

describe("seedRowToCard", () => {
  it("maps seed image and price fields", () => {
    const card = seedRowToCard({
      id: "1",
      slug: "reiya",
      name: "Reiya",
      featured_image_url: "https://example.com/a.webp",
      price: 19,
    });
    expect(card.image).toBe("https://example.com/a.webp");
    expect(card.price).toBe(19);
    expect(card.shopPromoted).toBe(false);
    expect(
      seedRowToCard({
        id: "1",
        slug: "reiya",
        name: "Reiya",
        price: 19,
        sale_price: 9,
        shopPromoted: true,
      }).shopPromoted
    ).toBe(true);
  });
});

describe("formatHeroDealPrice", () => {
  it("shows the list price struck against a lower sale", () => {
    expect(formatHeroDealPrice(29, 49)).toEqual({
      current: "$29",
      compareAt: "$49",
    });
    expect(formatHeroDealPrice(0, 49)).toEqual({
      current: "FREE",
      compareAt: "$49",
    });
    expect(formatHeroDealPrice(null, 49)).toEqual({ current: "$49" });
    expect(formatHeroDealPrice(49, 49)).toEqual({ current: "$49" });
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

describe("orderHeroTourCatalog", () => {
  it("shuffles then pins shop-promotion products first", () => {
    const nodes = [
      { slug: "a", promoted: false },
      { slug: "b", promoted: true },
      { slug: "c", promoted: false },
      { slug: "d", promoted: true },
    ];
    const ordered = orderHeroTourCatalog(nodes, () => 0);
    expect(ordered.map((node) => node.slug)).toEqual(["b", "d", "c", "a"]);
  });
});

describe("partitionHeroTourProducts", () => {
  it("buckets catalog rows and finds Cymasphere", () => {
    const split = partitionHeroTourProducts([
      { slug: "cymasynth", name: "CymaSynth", category: "instrument-plugin" },
      { slug: "reiya", name: "Reiya", category: "instrument-plugin" },
      { slug: "crystal-ball", name: "Crystal Ball", category: "audio-fx-plugin" },
      { slug: "midi-pack", name: "Pack", category: "pack" },
      { slug: "writer", name: "Writer", category: "midi-fx-plugin" },
      { slug: "cymasphere", name: "Cymasphere", category: "instrument-plugin" },
    ]);
    expect(split.instruments.map((p) => p.slug)).toEqual([
      "cymasynth",
      "reiya",
      "cymasphere",
    ]);
    expect(split.effects[0]?.slug).toBe("crystal-ball");
    expect(split.packs[0]?.slug).toBe("midi-pack");
    expect(split.midiFx[0]?.slug).toBe("writer");
    expect(split.cymasphere?.slug).toBe("cymasphere");
  });
});
