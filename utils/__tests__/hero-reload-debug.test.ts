/**
 * @fileoverview Unit tests for homepage hero reload diagnostics.
 * @module utils/__tests__/hero-reload-debug.test
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  classifyDocumentStart,
  heroReloadDebugOverlayEnabled,
  parseHeroReloadDebugLog,
  persistHeroReloadDebugEvent,
  pushHeroReloadDebugEvent,
  readNavigationType,
  resetHeroReloadDebugForTests,
} from "@/utils/hero-reload-debug";

afterEach(() => {
  resetHeroReloadDebugForTests();
});

describe("parseHeroReloadDebugLog", () => {
  it("returns an empty list for missing or invalid payloads", () => {
    expect(parseHeroReloadDebugLog(null)).toEqual([]);
    expect(parseHeroReloadDebugLog("")).toEqual([]);
    expect(parseHeroReloadDebugLog("not-json")).toEqual([]);
    expect(parseHeroReloadDebugLog("{}")).toEqual([]);
  });

  it("keeps only events with a timestamp and kind", () => {
    expect(
      parseHeroReloadDebugLog(
        JSON.stringify([
          { t: 1, kind: "boot" },
          { kind: "no-time" },
          { t: 2 },
          null,
        ])
      )
    ).toEqual([{ t: 1, kind: "boot" }]);
  });
});

describe("pushHeroReloadDebugEvent", () => {
  it("trims the oldest events when over the cap", () => {
    const first = { t: 1, kind: "a" };
    const second = { t: 2, kind: "b" };
    const third = { t: 3, kind: "c" };
    expect(pushHeroReloadDebugEvent([first, second], third, 2)).toEqual([
      second,
      third,
    ]);
  });
});

describe("persistHeroReloadDebugEvent", () => {
  it("round-trips through a storage double", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    persistHeroReloadDebugEvent(storage, { t: 1, kind: "a" });
    const next = persistHeroReloadDebugEvent(storage, { t: 2, kind: "b" });
    expect(next.map((event) => event.kind)).toEqual(["a", "b"]);
    expect(parseHeroReloadDebugLog(store.get("hero-reload-debug") ?? null)).toEqual(
      next
    );
  });
});

describe("readNavigationType", () => {
  it("reads a PerformanceNavigationTiming-shaped entry", () => {
    expect(
      readNavigationType([
        { entryType: "navigation", type: "reload", transferSize: 1200 },
      ])
    ).toEqual({ type: "reload", transferSize: 1200 });
  });

  it("is null when nothing looks like a navigation entry", () => {
    expect(readNavigationType([])).toBeNull();
    expect(readNavigationType([{ entryType: "paint" }])).toBeNull();
  });
});

describe("classifyDocumentStart", () => {
  it("prefers bfcache, then a real reload, then an unclean watchdog", () => {
    expect(
      classifyDocumentStart({
        navigationType: "reload",
        persistedPageshow: true,
        previousUnclean: true,
      })
    ).toBe("bfcache-restore");
    expect(
      classifyDocumentStart({
        navigationType: "reload",
        previousUnclean: true,
      })
    ).toBe("document-reload");
    expect(
      classifyDocumentStart({
        navigationType: "navigate",
        previousUnclean: true,
      })
    ).toBe("possible-watchdog-kill");
    expect(
      classifyDocumentStart({
        navigationType: "back_forward",
        previousUnclean: false,
      })
    ).toBe("history-traversal");
    expect(
      classifyDocumentStart({
        navigationType: "navigate",
        previousUnclean: false,
      })
    ).toBe("fresh-navigate");
  });
});

describe("heroReloadDebugOverlayEnabled", () => {
  it("is true only for heroDebug=1", () => {
    expect(heroReloadDebugOverlayEnabled("?heroDebug=1")).toBe(true);
    expect(heroReloadDebugOverlayEnabled("tourCap=15")).toBe(false);
    expect(heroReloadDebugOverlayEnabled("")).toBe(false);
  });
});
