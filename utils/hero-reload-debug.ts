/**
 * @fileoverview Homepage hero reload diagnostics. Distinguishes a real
 * document reload (Safari watchdog / navigation) from a React remount
 * or i18n store refresh that only looks like the page restarted.
 * Events persist in sessionStorage so the next visit can dump the
 * previous one after a kill that never fires `pagehide`.
 * @module utils/hero-reload-debug
 */

import { HERO_TOUR_WATCHDOG_KEY, previousHeroTourWasKilled } from "@/utils/hero-tour";

/** sessionStorage ring-buffer key. Survives a real reload in the tab. */
export const HERO_RELOAD_DEBUG_KEY = "hero-reload-debug";

/** Max persisted events so a long session cannot grow without bound. */
export const HERO_RELOAD_DEBUG_MAX = 80;

/** Console prefix for a tethered Web Inspector. */
export const HERO_RELOAD_DEBUG_PREFIX = "[hero-debug]";

/** One breadcrumb in the reload trail. */
export type HeroDebugEvent = {
  t: number;
  kind: string;
  detail?: Record<string, unknown>;
};

/** Minimal storage used by persist helpers (injectable for tests). */
export type HeroDebugStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Navigation Timing bits used to classify a document start. */
export type HeroNavigationEntry = {
  entryType?: string;
  type?: string;
  transferSize?: number;
};

/** Minimal i18next surface the installer listens on. */
export type HeroDebugI18n = {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
};

type HeroDebugListener = (event: HeroDebugEvent) => void;

const listeners = new Set<HeroDebugListener>();
let installed = false;
let memoryLog: HeroDebugEvent[] = [];

/**
 * @brief Parses a persisted debug log.
 * @param raw sessionStorage value, or null when missing.
 * @returns Valid events; bad JSON becomes [].
 * @example
 * parseHeroReloadDebugLog('[{"t":1,"kind":"boot"}]')
 */
export function parseHeroReloadDebugLog(raw: string | null): HeroDebugEvent[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is HeroDebugEvent => {
      if (!entry || typeof entry !== "object") return false;
      const rec = entry as HeroDebugEvent;
      return typeof rec.t === "number" && typeof rec.kind === "string";
    });
  } catch {
    return [];
  }
}

/**
 * @brief Appends one event and trims the oldest when over the cap.
 * @param events Existing log.
 * @param event Event to append.
 * @param max Ring-buffer length.
 * @returns Next log.
 * @example
 * pushHeroReloadDebugEvent([], { t: 1, kind: "boot" }, 2)
 */
export function pushHeroReloadDebugEvent(
  events: HeroDebugEvent[],
  event: HeroDebugEvent,
  max: number = HERO_RELOAD_DEBUG_MAX
): HeroDebugEvent[] {
  const next = events.concat(event);
  return next.length > max ? next.slice(next.length - max) : next;
}

/**
 * @brief Writes one event into storage and returns the new log.
 * @param storage sessionStorage or a test double.
 * @param event Event to persist.
 * @param max Ring-buffer length.
 * @returns Updated log.
 */
export function persistHeroReloadDebugEvent(
  storage: HeroDebugStorage,
  event: HeroDebugEvent,
  max: number = HERO_RELOAD_DEBUG_MAX
): HeroDebugEvent[] {
  const events = pushHeroReloadDebugEvent(
    parseHeroReloadDebugLog(storage.getItem(HERO_RELOAD_DEBUG_KEY)),
    event,
    max
  );
  try {
    storage.setItem(HERO_RELOAD_DEBUG_KEY, JSON.stringify(events));
  } catch {
    /* Private mode: keep the in-memory log only. */
  }
  return events;
}

/**
 * @brief Reads PerformanceNavigationTiming from a getEntries list.
 * @param entries `performance.getEntriesByType("navigation")` or a test list.
 * @returns Navigation type and transfer size, or null.
 * @example
 * readNavigationType([{ entryType: "navigation", type: "reload" }])
 */
export function readNavigationType(
  entries: readonly HeroNavigationEntry[]
): { type: string; transferSize?: number } | null {
  const nav = entries.find((entry) => entry.entryType === "navigation" || entry.type);
  if (!nav?.type) return null;
  return {
    type: nav.type,
    transferSize: typeof nav.transferSize === "number" ? nav.transferSize : undefined,
  };
}

/**
 * @brief Classifies how this document started.
 * `reload` is a real refresh. An unclean watchdog with no pagehide is
 * the Safari-kill signature. `pageshow` with persisted is bfcache.
 * @param input Navigation type, bfcache flag, and prior watchdog.
 * @returns Stable classifier string for logs.
 * @example
 * classifyDocumentStart({ navigationType: "reload", previousUnclean: false })
 */
export function classifyDocumentStart(input: {
  navigationType: string | null;
  persistedPageshow?: boolean;
  previousUnclean: boolean;
}): string {
  if (input.persistedPageshow) return "bfcache-restore";
  if (input.navigationType === "reload") return "document-reload";
  if (input.navigationType === "back_forward") return "history-traversal";
  if (input.previousUnclean) return "possible-watchdog-kill";
  if (input.navigationType === "navigate") return "fresh-navigate";
  return "unknown-start";
}

/**
 * @brief True when the query asks for the on-screen debug overlay.
 * @param search `window.location.search` (leading `?` optional).
 * @returns Whether `heroDebug=1` is set.
 */
export function heroReloadDebugOverlayEnabled(search: string): boolean {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q).get("heroDebug") === "1";
}

/**
 * @brief Subscribe to live debug events (overlay / tests).
 * @param listener Called for each {@link logHeroDebug}.
 * @returns Unsubscribe.
 */
export function subscribeHeroReloadDebug(listener: HeroDebugListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * @brief Records one breadcrumb to memory, sessionStorage, and console.
 * No-ops during SSR.
 * @param kind Event name (`circuit-mount`, `i18n-languageChanged`, …).
 * @param detail Optional JSON-safe fields.
 */
export function logHeroDebug(
  kind: string,
  detail?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const event: HeroDebugEvent = {
    t: Date.now(),
    kind,
    ...(detail && Object.keys(detail).length > 0 ? { detail } : {}),
  };
  memoryLog = pushHeroReloadDebugEvent(memoryLog, event);
  try {
    memoryLog = persistHeroReloadDebugEvent(window.sessionStorage, event);
  } catch {
    /* ignore */
  }
  if (detail) {
    console.info(HERO_RELOAD_DEBUG_PREFIX, kind, detail);
  } else {
    console.info(HERO_RELOAD_DEBUG_PREFIX, kind);
  }
  listeners.forEach((listener) => listener(event));
}

/**
 * @brief Current in-memory log (same contents as sessionStorage when writable).
 * @returns Events, oldest first.
 */
export function readHeroReloadDebugEvents(): HeroDebugEvent[] {
  return memoryLog.slice();
}

/**
 * @brief Installs document/i18n listeners once. Safe to call from several mounts.
 * @param win `window`.
 * @param i18n Optional i18next instance.
 * @returns Cleanup that only runs when this was the installing call.
 */
export function installHeroReloadDebug(
  win: Window,
  i18n?: HeroDebugI18n | null
): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;

  try {
    memoryLog = parseHeroReloadDebugLog(
      win.sessionStorage.getItem(HERO_RELOAD_DEBUG_KEY)
    );
  } catch {
    memoryLog = [];
  }

  const previous = memoryLog.slice();
  let watchdogRaw: string | null = null;
  try {
    watchdogRaw = win.sessionStorage.getItem(HERO_TOUR_WATCHDOG_KEY);
  } catch {
    watchdogRaw = null;
  }
  const previousUnclean = previousHeroTourWasKilled(watchdogRaw);
  const navEntries =
    typeof win.performance?.getEntriesByType === "function"
      ? (win.performance.getEntriesByType("navigation") as HeroNavigationEntry[])
      : [];
  const nav = readNavigationType(navEntries);
  const startKind = classifyDocumentStart({
    navigationType: nav?.type ?? null,
    previousUnclean,
  });

  const dump: HeroDebugEvent[] = previous.slice(-12);
  console.info(HERO_RELOAD_DEBUG_PREFIX, "document-start", {
    classify: startKind,
    navigationType: nav?.type ?? null,
    transferSize: nav?.transferSize,
    previousUnclean,
    previousEventCount: previous.length,
    lastPrevious: dump,
  });
  if (startKind === "document-reload" || startKind === "possible-watchdog-kill") {
    console.warn(
      HERO_RELOAD_DEBUG_PREFIX,
      `This document looks like a real refresh (${startKind}). Last events before it:`,
      dump
    );
  }

  logHeroDebug("document-start", {
    classify: startKind,
    navigationType: nav?.type ?? null,
    transferSize: nav?.transferSize ?? null,
    previousUnclean,
    previousKinds: previous.slice(-8).map((event) => event.kind),
    path: win.location.pathname,
    search: win.location.search,
    viewport: { w: win.innerWidth, h: win.innerHeight },
    ua: win.navigator.userAgent,
  });

  const onPageShow = (event: PageTransitionEvent) => {
    logHeroDebug("pageshow", {
      persisted: event.persisted,
      classify: classifyDocumentStart({
        navigationType: nav?.type ?? null,
        persistedPageshow: event.persisted,
        previousUnclean,
      }),
    });
  };
  const onPageHide = (event: PageTransitionEvent) => {
    logHeroDebug("pagehide", { persisted: event.persisted });
  };
  const onVisibility = () => {
    logHeroDebug("visibility", { state: win.document.visibilityState });
  };
  const onFreeze = () => {
    logHeroDebug("freeze", {});
  };
  const onResume = () => {
    logHeroDebug("resume", {});
  };
  const onLanguageChange = () => {
    logHeroDebug("window-languageChange", {});
  };
  const onI18nLanguage = (...args: unknown[]) => {
    logHeroDebug("i18n-languageChanged", { lng: args[0] ?? null });
  };
  const onI18nAdded = (...args: unknown[]) => {
    logHeroDebug("i18n-store-added", { lng: args[0] ?? null, ns: args[1] ?? null });
  };
  const onI18nRemoved = (...args: unknown[]) => {
    logHeroDebug("i18n-store-removed", { lng: args[0] ?? null, ns: args[1] ?? null });
  };

  win.addEventListener("pageshow", onPageShow);
  win.addEventListener("pagehide", onPageHide);
  win.document.addEventListener("visibilitychange", onVisibility);
  win.addEventListener("freeze", onFreeze);
  win.addEventListener("resume", onResume);
  win.addEventListener("languageChange", onLanguageChange);
  i18n?.on("languageChanged", onI18nLanguage);
  i18n?.on("added", onI18nAdded);
  i18n?.on("removed", onI18nRemoved);

  const host = win as Window & {
    __heroDebug?: {
      dump: () => HeroDebugEvent[];
      events: () => HeroDebugEvent[];
      classify: () => string;
    };
  };
  host.__heroDebug = {
    dump: () => memoryLog.slice(),
    events: () => memoryLog.slice(),
    classify: () => startKind,
  };

  return () => {
    win.removeEventListener("pageshow", onPageShow);
    win.removeEventListener("pagehide", onPageHide);
    win.document.removeEventListener("visibilitychange", onVisibility);
    win.removeEventListener("freeze", onFreeze);
    win.removeEventListener("resume", onResume);
    win.removeEventListener("languageChange", onLanguageChange);
    i18n?.off("languageChanged", onI18nLanguage);
    i18n?.off("added", onI18nAdded);
    i18n?.off("removed", onI18nRemoved);
    installed = false;
    if (host.__heroDebug) delete host.__heroDebug;
  };
}

/**
 * @brief Test-only reset for the installer singleton.
 */
export function resetHeroReloadDebugForTests(): void {
  installed = false;
  memoryLog = [];
  listeners.clear();
}
