/**
 * @fileoverview Unit tests for homepage hero-tour helpers.
 * @module utils/__tests__/hero-tour.test
 */

import { describe, expect, it, vi } from "vitest";
import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import { SUN_FOCUS_KEY } from "@/utils/circuit-network-layout";
import {
  DESKTOP_TOUR_FALLBACK_DELAY_MS,
  DESKTOP_TOUR_IDLE_TIMEOUT_MS,
  HERO_MOBILE_BAKE_PX,
  MOBILE_2D_MOON_CAP,
  MOBILE_2D_SUN_POSTER,
  MOBILE_2D_SYNTH_POSTER,
  MOBILE_STAGE_BUDGET,
  MOBILE_TEXTURE_KEEP,
  buildMobileTourStops,
  heroBoardIsOnScreen,
  mobile2dMoonCap,
  mobileTourIsParked,
  heroTourMoonCap,
  heroTourStopCap,
  isHeroMobileViewport,
  latchHeroCompactTour,
  prefersLiteHeroTour,
  readHeroCompactTour,
  readHeroTourEnvironment,
  resolveHeroTourStart,
  shouldKeepHeroFrameSize,
  mobileStageKeys,
  moonBakePx,
  parseHeroTourQuery,
  pickMobileTourNodes,
  previousHeroTourWasKilled,
  scheduleDesktopHeroTour,
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

describe("prefersLiteHeroTour", () => {
  const desktopMouse = {
    width: 1440,
    height: 900,
    maxTouchPoints: 0,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    coarsePointer: false,
  };

  it("keeps a mouse desktop on the 3D tour", () => {
    expect(prefersLiteHeroTour(desktopMouse)).toBe(false);
  });

  it("treats phones, including landscape, as lite", () => {
    expect(
      prefersLiteHeroTour({
        ...desktopMouse,
        width: 390,
        height: 844,
        coarsePointer: true,
        maxTouchPoints: 5,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      })
    ).toBe(true);
    expect(
      prefersLiteHeroTour({
        ...desktopMouse,
        width: 844,
        height: 390,
        coarsePointer: true,
        maxTouchPoints: 5,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      })
    ).toBe(true);
  });

  it("treats iPad and iPadOS desktop-UA as lite even when the short side is >768", () => {
    expect(
      prefersLiteHeroTour({
        ...desktopMouse,
        width: 834,
        height: 1194,
        coarsePointer: true,
        maxTouchPoints: 5,
        userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      })
    ).toBe(true);
    expect(
      prefersLiteHeroTour({
        ...desktopMouse,
        width: 1024,
        height: 1366,
        coarsePointer: false,
        maxTouchPoints: 5,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)",
      })
    ).toBe(true);
  });

  it("treats a touchscreen tablet with a mouse as lite", () => {
    expect(
      prefersLiteHeroTour({
        ...desktopMouse,
        width: 1440,
        height: 960,
        coarsePointer: false,
        maxTouchPoints: 10,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      })
    ).toBe(true);
  });

  it("treats an iPhone Request Desktop Website viewport as lite via UA", () => {
    expect(
      prefersLiteHeroTour({
        ...desktopMouse,
        width: 980,
        height: 1700,
        coarsePointer: false,
        maxTouchPoints: 5,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      })
    ).toBe(true);
  });
});

describe("readHeroTourEnvironment", () => {
  it("copies viewport, touch, UA, and coarse-pointer from the window", () => {
    expect(
      readHeroTourEnvironment({
        innerWidth: 834,
        innerHeight: 1194,
        navigator: {
          maxTouchPoints: 5,
          userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
        },
        matchMedia: (query: string) => ({
          matches: query.includes("pointer: coarse"),
        }),
      })
    ).toEqual({
      width: 834,
      height: 1194,
      maxTouchPoints: 5,
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      coarsePointer: true,
    });
  });
});

describe("latchHeroCompactTour / shouldKeepHeroFrameSize", () => {
  it("takes the first measure and then ignores flips", () => {
    expect(latchHeroCompactTour(null, true)).toEqual({
      compact: true,
      ignoredFlip: false,
    });
    expect(latchHeroCompactTour(true, false)).toEqual({
      compact: true,
      ignoredFlip: true,
    });
    expect(latchHeroCompactTour(false, false)).toEqual({
      compact: false,
      ignoredFlip: false,
    });
  });

  it("keeps Kepler size across iOS chrome height-only resizes", () => {
    expect(
      shouldKeepHeroFrameSize({ w: 390, h: 844 }, { w: 390, h: 760 }, true)
    ).toBe(true);
    expect(
      shouldKeepHeroFrameSize({ w: 390, h: 844 }, { w: 844, h: 390 }, true)
    ).toBe(false);
    expect(
      shouldKeepHeroFrameSize({ w: 1280, h: 800 }, { w: 1280, h: 700 }, false)
    ).toBe(false);
  });
});

describe("readHeroCompactTour", () => {
  it("uses prefersLiteHeroTour so an iPad is compact even when the short side is >768", () => {
    expect(
      readHeroCompactTour({
        innerWidth: 834,
        innerHeight: 1194,
        navigator: {
          maxTouchPoints: 5,
          userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
        },
        matchMedia: (query: string) => ({
          matches: query.includes("pointer: coarse"),
        }),
      })
    ).toBe(true);
  });
});

describe("resolveHeroTourStart", () => {
  it("idles the 3D tour until the main thread is free", () => {
    expect(resolveHeroTourStart(false)).toEqual({
      allowTour: false,
      scheduleDesktop: true,
    });
  });

  it("parks on the poster when the user prefers reduced motion", () => {
    expect(resolveHeroTourStart(true)).toEqual({
      allowTour: false,
      scheduleDesktop: false,
    });
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
  it("leaves live visits uncapped on every screen", () => {
    expect(heroTourMoonCap(true, undefined, true)).toBeNull();
    expect(heroTourMoonCap(false, undefined, true)).toBeNull();
    expect(heroTourStopCap(true)).toBeNull();
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
  it("reads a positive tourCap", () => {
    expect(parseHeroTourQuery("?tourCap=15")).toEqual({ tourCap: 15 });
    expect(parseHeroTourQuery("")).toEqual({ tourCap: undefined });
    expect(parseHeroTourQuery("?tourCap=-3")).toEqual({ tourCap: undefined });
  });
});

describe("buildMobileTourStops", () => {
  it("puts the sun poster first, then synth, then curated moons", () => {
    const stops = buildMobileTourStops(
      { id: "sun", name: "Cymasphere", slug: "cymasphere", price: "$199" },
      {
        id: "sy",
        name: "CymaSynth",
        slug: "cymasynth",
        image: "/images/cymasynth-sphere-hero.webp",
      },
      [
        { id: "a", name: "Other", slug: "other", image: "/a.webp" },
        { id: "b", name: "Reiya", slug: "reiya", image: "/reiya.webp" },
      ],
      2,
      ["reiya"]
    );
    expect(stops.map((s) => s.slug)).toEqual([
      "cymasphere",
      "cymasynth",
      "reiya",
      "other",
    ]);
    expect(stops[0]?.image).toBe(MOBILE_2D_SUN_POSTER);
    expect(stops[0]?.sun).toBe(true);
    expect(stops[1]?.image).toBe(MOBILE_2D_SYNTH_POSTER);
  });

  it("uses the synth poster even when the product has other art", () => {
    const stops = buildMobileTourStops(
      null,
      {
        id: 1,
        name: "CymaSynth",
        slug: "cymasynth",
        image: "https://example.com/huge.webp",
      },
      []
    );
    expect(stops[1]?.image).toBe(MOBILE_2D_SYNTH_POSTER);
  });

  it("skips moons without artwork and honors tourCap", () => {
    const stops = buildMobileTourStops(
      null,
      { id: 1, name: "CymaSynth", slug: "cymasynth" },
      [
        { id: 2, name: "Blank", slug: "blank" },
        { id: 3, name: "Reiya", slug: "reiya", image: "/reiya.webp" },
        { id: 4, name: "Curio", slug: "curio-texture-generator", image: "/c.webp" },
      ],
      3,
      [],
      3
    );
    expect(stops.map((s) => s.slug)).toEqual([
      "cymasphere",
      "cymasynth",
      "reiya",
    ]);
    expect(stops.every((s) => s.image.length > 0)).toBe(true);
  });

  it("falls back to the synth poster and respects the moon cap", () => {
    const stops = buildMobileTourStops(
      null,
      { id: 1, name: "CymaSynth", slug: "cymasynth" },
      [
        { id: 2, name: "A", slug: "a", image: "/a.webp" },
        { id: 3, name: "B", slug: "b", image: "/b.webp" },
        { id: 4, name: "C", slug: "c", image: "/c.webp" },
      ],
      MOBILE_2D_MOON_CAP
    );
    expect(stops[0]?.name).toBe("Cymasphere");
    expect(stops[1]?.image).toBe(MOBILE_2D_SYNTH_POSTER);
    expect(stops.length).toBe(2 + MOBILE_2D_MOON_CAP);
  });
});

describe("mobile2dMoonCap / mobileTourIsParked", () => {
  it("reserves sun and synth slots when a tourCap is set", () => {
    expect(mobile2dMoonCap(undefined, true)).toBe(MOBILE_2D_MOON_CAP);
    expect(mobile2dMoonCap(6, true)).toBe(4);
    expect(mobile2dMoonCap(2, true)).toBe(0);
  });

  it("parks on the last still so the recorder can wait for data-parked", () => {
    expect(mobileTourIsParked(0, 1)).toBe(true);
    expect(mobileTourIsParked(0, 5)).toBe(false);
    expect(mobileTourIsParked(4, 5)).toBe(true);
  });
});

describe("scheduleDesktopHeroTour", () => {
  it("uses requestIdleCallback with the idle timeout when available", () => {
    const start = vi.fn();
    const cancelIdleCallback = vi.fn();
    const requestIdleCallback = vi.fn(() => 7);
    const cancel = scheduleDesktopHeroTour(start, {
      requestIdleCallback,
      cancelIdleCallback,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    });
    expect(requestIdleCallback).toHaveBeenCalledWith(start, {
      timeout: DESKTOP_TOUR_IDLE_TIMEOUT_MS,
    });
    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it("falls back to setTimeout when idle callbacks are missing", () => {
    const start = vi.fn();
    const clearTimeout = vi.fn();
    const setTimeout = vi.fn(() => 11);
    const cancel = scheduleDesktopHeroTour(start, {
      setTimeout,
      clearTimeout,
    });
    expect(setTimeout).toHaveBeenCalledWith(start, DESKTOP_TOUR_FALLBACK_DELAY_MS);
    cancel();
    expect(clearTimeout).toHaveBeenCalledWith(11);
  });
});
