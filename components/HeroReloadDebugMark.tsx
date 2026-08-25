"use client";

/**
 * @fileoverview Mount/unmount breadcrumb for homepage Suspense and hero
 * islands. A fallback→hero swap that looks like a refresh shows up here.
 * @module components/HeroReloadDebugMark
 */

import { useEffect } from "react";
import { logHeroDebug } from "@/utils/hero-reload-debug";

/**
 * @brief Logs when this island mounts and unmounts.
 * @param source Stable label (`home-fallback`, `ecosystem-hero`, …).
 * @returns Nothing.
 */
export default function HeroReloadDebugMark({ source }: { source: string }) {
  useEffect(() => {
    logHeroDebug(`${source}-mount`, {});
    return () => {
      logHeroDebug(`${source}-unmount`, {});
    };
  }, [source]);
  return null;
}
