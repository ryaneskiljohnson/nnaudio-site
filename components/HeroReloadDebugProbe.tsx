"use client";

/**
 * @fileoverview Installs homepage hero reload diagnostics once per tab.
 * Console + sessionStorage always; an on-screen trail when `?heroDebug=1`.
 * @module components/HeroReloadDebugProbe
 */

import { useEffect, useState } from "react";
import i18next from "i18next";
import {
  heroReloadDebugOverlayEnabled,
  installHeroReloadDebug,
  subscribeHeroReloadDebug,
  type HeroDebugEvent,
} from "@/utils/hero-reload-debug";

/**
 * @brief Formats one event for the optional overlay.
 * @param event Debug breadcrumb.
 * @returns Short line.
 */
function formatLine(event: HeroDebugEvent): string {
  const extra = event.detail
    ? ` ${JSON.stringify(event.detail).slice(0, 120)}`
    : "";
  return `${event.kind}${extra}`;
}

/**
 * @brief Mounts document/i18n listeners. Renders nothing unless overlay is on.
 * @returns Overlay, or null.
 */
export default function HeroReloadDebugProbe() {
  const [lines, setLines] = useState<string[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const overlay = heroReloadDebugOverlayEnabled(window.location.search);
    setShowOverlay(overlay);
    const uninstall = installHeroReloadDebug(window, i18next);
    const unsubscribe = overlay
      ? subscribeHeroReloadDebug((event) => {
          setLines((prev) => [...prev.slice(-7), formatLine(event)]);
        })
      : () => undefined;
    return () => {
      unsubscribe();
      uninstall();
    };
  }, []);

  if (!showOverlay) return null;

  return (
    <div
      data-hero-debug-overlay=""
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 8,
        zIndex: 9999,
        maxHeight: 160,
        overflow: "auto",
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(5, 6, 16, 0.88)",
        color: "#d7ffb0",
        font: "11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {lines.length === 0
        ? "hero-debug: waiting for events…  window.__heroDebug.dump()"
        : lines.join("\n")}
    </div>
  );
}
