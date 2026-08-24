/**
 * @fileoverview Unit tests for homepage hero-tour helpers.
 * @module utils/__tests__/hero-tour.test
 */

import { describe, expect, it } from "vitest";
import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import { SUN_FOCUS_KEY } from "@/utils/circuit-network-layout";
import {
  HERO_MOBILE_BAKE_PX,
  MOBILE_CATALOG_MOON_CAP,
  MOBILE_STAGE_BUDGET,
  MOBILE_TEXTURE_KEEP,
  TOUR_MOBILE_MAX_STOPS,
  heroBoardIsOnScreen,
  heroTourMoonCap,
  heroTourStopCap,
  isHeroMobileViewport,
  mobileStageKeys,
  moonBakePx,
  parseHeroTourQuery,
  pickMobileTourNodes,
  previousHeroTourWasKilled,
  sunBakePx,
} from "@/utils/hero-tour";

describe("isHeroMobileViewport", () => {
  it("treats portrait and landscape phones as mobile", () => {
    expect(isHeroMobileViewport(390, 844)).toBe(true);
    expect(isHeroMobileViewport(844, 390)).toBe(true);
  });

  it("treats a desktop window as desktop", () => {
    expect(isHeroMobileViewport(1280, 800)).toBe(false);
    expect(isHeroMobileViewport(1440, 900)).toBe(false);
  });

  it("uses the short side so a 768-tall landscape tablet is mobile", () => {
    expect(isHeroMobileViewport(1024, 768)).toBe(true);
  });
});

describe("previousHeroTourWasKilled", () => {
  it("is false when nothing was stored", () => {
    expect(previousHeroTourWasKilled(null)).toBe(false);
    expect(previousHeroTourWasKilled("")).toBe(false);
  });

  it("is true only for an unclean mid-tour exit", () => {
    expect(
      previousHeroTourWasKilled(JSON.stringify({ clean: false, parked: false }))
    ).toBe(true);
    expect(
      previousHeroTourWasKilled(JSON.stringify({ clean: false }))
    ).toBe(true);
  });

  it("ignores a parked still that later died (tab discard)", () => {
    expect(
      previousHeroTourWasKilled(JSON.stringify({ clean: false, parked: true }))
    ).toBe(false);
  });

  it("ignores a clean pagehide and bad JSON", () => {
    expect(
      previousHeroTourWasKilled(JSON.stringify({ clean: true, parked: false }))
    ).toBe(false);
    expect(previousHeroTourWasKilled("not-json")).toBe(false);
  });
});

describe("pickMobileTourNodes", () => {
  const nodes = [
    { slug: "alpha-synth", id: "1" },
    { slug: "reiya", id: "2" },
    { slug: "curio-texture-generator", id: "3" },
    { slug: "beta-fx", id: "4" },
    { slug: "obscura-tortured-orchestral-box", id: "5" },
    { slug: "gamma-pack", id: "6" },
  ];

  it("puts curated bestsellers first, then fills from catalog order", () => {
    const picked = pickMobileTourNodes(nodes, 5, CURATED_FEATURED_ORDER);
    expect(picked.map((n) => n.slug)).toEqual([
      "curio-texture-generator",
      "reiya",
      "obscura-tortured-orchestral-box",
      "alpha-synth",
      "beta-fx",
    ]);
  });

  it("skips sun/synth slugs and empty input", () => {
    expect(pickMobileTourNodes([], 5, CURATED_FEATURED_ORDER)).toEqual([]);
    expect(
      pickMobileTourNodes([{ slug: "cymasphere", id: "x" }], 5, [
        "cymasphere",
      ]).map((n) => n.slug)
    ).toEqual([]);
  });

  it("does not exceed the cap", () => {
    expect(pickMobileTourNodes(nodes, 2, CURATED_FEATURED_ORDER)).toHaveLength(
      2
    );
    expect(pickMobileTourNodes(nodes, 0, CURATED_FEATURED_ORDER)).toEqual([]);
  });
});

describe("heroTourMoonCap / heroTourStopCap", () => {
  it("caps live phones and leaves desktop uncapped", () => {
    expect(heroTourMoonCap(true, undefined, true)).toBe(
      MOBILE_CATALOG_MOON_CAP
    );
    expect(heroTourMoonCap(false, undefined, true)).toBeNull();
    expect(heroTourStopCap(true)).toBe(TOUR_MOBILE_MAX_STOPS);
    expect(heroTourStopCap(false)).toBeNull();
  });

  it("derives recording moons from tourCap (sun + synth reserved)", () => {
    expect(heroTourMoonCap(true, 15, true)).toBe(13);
    expect(heroTourMoonCap(true, 15, false)).toBe(14);
    expect(heroTourStopCap(false, 15)).toBe(15);
  });
});

describe("heroBoardIsOnScreen", () => {
  it("is true when the board intersects the viewport", () => {
    expect(heroBoardIsOnScreen({ top: 0, bottom: 600, height: 600 }, 800)).toBe(
      true
    );
    expect(heroBoardIsOnScreen({ top: 100, bottom: 900, height: 800 }, 800)).toBe(
      true
    );
  });

  it("is false when the board is fully above or below the viewport", () => {
    expect(
      heroBoardIsOnScreen({ top: -900, bottom: -100, height: 800 }, 800)
    ).toBe(false);
    expect(heroBoardIsOnScreen({ top: 900, bottom: 1700, height: 800 }, 800)).toBe(
      false
    );
  });

  it("treats a full-viewport hero as on-screen when IO says otherwise", () => {
    expect(heroBoardIsOnScreen({ top: 0, bottom: 844, height: 844 }, 844)).toBe(
      true
    );
  });
});

describe("mobile stage budget", () => {
  it("keeps texture and stage caps aligned", () => {
    expect(MOBILE_TEXTURE_KEEP).toBe(MOBILE_STAGE_BUDGET);
    expect(MOBILE_STAGE_BUDGET).toBe(2);
  });
});

describe("mobileStageKeys", () => {
  it("keeps only the hold and the next stop", () => {
    expect(mobileStageKeys("reiya", "curio", false)).toEqual([
      "reiya",
      "curio",
    ]);
    expect(mobileStageKeys("reiya", "reiya", false)).toEqual(["reiya"]);
  });

  it("mounts nothing during the sun hold", () => {
    expect(mobileStageKeys(SUN_FOCUS_KEY, "reiya", true)).toEqual([]);
    expect(mobileStageKeys(null, SUN_FOCUS_KEY, false)).toEqual([]);
  });
});

describe("bake sizes", () => {
  it("uses a 160px strip on phones and Retina-matched desktop bakes", () => {
    expect(moonBakePx(true, 2)).toBe(HERO_MOBILE_BAKE_PX);
    expect(HERO_MOBILE_BAKE_PX).toBe(160);
    expect(sunBakePx(true, 3)).toBe(HERO_MOBILE_BAKE_PX);
    expect(moonBakePx(false, 2)).toBe(1280);
    expect(sunBakePx(false, 2)).toBe(1120);
    expect(sunBakePx(false, 1)).toBe(560);
  });
});

describe("parseHeroTourQuery", () => {
  it("reads auto-tour and a positive tourCap", () => {
    expect(parseHeroTourQuery("?heroAutoTour=1&tourCap=15")).toEqual({
      autoTour: true,
      tourCap: 15,
    });
    expect(parseHeroTourQuery("heroAutoTour=1")).toEqual({
      autoTour: true,
      tourCap: undefined,
    });
  });

  it("ignores missing or invalid flags", () => {
    expect(parseHeroTourQuery("")).toEqual({
      autoTour: false,
      tourCap: undefined,
    });
    expect(parseHeroTourQuery("?heroAutoTour=yes&tourCap=-3")).toEqual({
      autoTour: false,
      tourCap: undefined,
    });
  });
});
