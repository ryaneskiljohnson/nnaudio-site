"use client";

/**
 * @fileoverview Phone Play tour: a 2D credit reel. Does not import
 * CircuitNetwork, sphere warps, or Kepler physics — those keep the
 * compositor busy until iOS Safari reloads the tab (~10s).
 * @module components/sections/MobileHeroTour
 */

import { useEffect, useMemo, useState } from "react";
import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import { optimizedImageUrl } from "@/utils/optimized-image-url";
import {
  MOBILE_2D_HOLD_MS,
  MOBILE_2D_MOON_CAP,
  MOBILE_2D_SUN_POSTER,
  buildMobileTourStops,
  mobileTourIsParked,
  type MobileTourNode,
} from "@/utils/hero-tour";

export interface MobileHeroTourProps {
  /** Cymasphere credit. */
  cymasphere?: MobileTourNode | null;
  /** CymaSynth credit. */
  cymasynth?: MobileTourNode | null;
  /** Remaining catalog products. */
  nodes: MobileTourNode[];
  /** Optional total credit-stop cap (`?tourCap=N`). */
  tourCap?: number;
}

/**
 * @brief Still URL through the image optimizer at a phone-safe width.
 * @param src Artwork path or remote URL.
 * @returns Optimizer URL, or the original when it cannot be wrapped.
 */
function stillSrc(src: string): string {
  if (!src) return MOBILE_2D_SUN_POSTER;
  return optimizedImageUrl(src, 256) || src;
}

/**
 * @brief Snaps through Cymasphere, CymaSynth, and a few catalog stills.
 * Parks on the last frame — no loop, no rAF, no canvas.
 * @param cymasphere Sun credit.
 * @param cymasynth Synth credit.
 * @param nodes Catalog fill.
 * @param tourCap Optional recorder/debug stop cap.
 * @returns The 2D tour board.
 */
export default function MobileHeroTour({
  cymasphere,
  cymasynth,
  nodes,
  tourCap,
}: MobileHeroTourProps) {
  const stops = useMemo(
    () =>
      buildMobileTourStops(
        cymasphere,
        cymasynth,
        nodes,
        MOBILE_2D_MOON_CAP,
        CURATED_FEATURED_ORDER,
        tourCap
      ),
    [cymasphere, cymasynth, nodes, tourCap]
  );
  const [index, setIndex] = useState(0);
  const stop = stops[index] ?? stops[0];
  const next = stops[index + 1];
  const parked = mobileTourIsParked(index, stops.length);

  useEffect(() => {
    if (parked) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, stops.length - 1));
    }, MOBILE_2D_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index, parked, stops.length]);

  if (!stop) return null;

  return (
    <div
      className="mobile-hero-tour"
      data-parked={parked ? "true" : undefined}
      style={{
        position: "relative",
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "#02030a",
      }}
    >
      {next?.image ? (
        <img
          src={stillSrc(next.image)}
          alt=""
          aria-hidden
          width={1}
          height={1}
          decoding="async"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        />
      ) : null}
      <img
        key={stop.key}
        src={stillSrc(stop.image)}
        alt=""
        width={256}
        height={256}
        decoding="async"
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: "min(46vw, 200px)",
          height: "min(46vw, 200px)",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          objectFit: "cover",
          boxShadow:
            "0 0 48px rgba(255, 230, 180, 0.28), 0 0 110px rgba(108, 99, 255, 0.22)",
        }}
      />
      <a
        href={`/product/${stop.slug}`}
        aria-label={`Open ${stop.name}`}
        style={{
          position: "absolute",
          left: "4%",
          right: "4%",
          top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          zIndex: 4,
          maxWidth: "min(88vw, 340px)",
          color: "#fff",
          textDecoration: "none",
          textShadow: "0 4px 18px rgba(5, 6, 13, 0.9)",
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          {stop.sun ? "The sun" : "In orbit"}
        </span>
        <span
          style={{
            display: "block",
            marginTop: "0.2rem",
            fontSize: "1.15rem",
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          {stop.name}
        </span>
        {stop.tagline ? (
          <span
            style={{
              display: "block",
              marginTop: "0.25rem",
              fontSize: "0.84rem",
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {stop.tagline}
          </span>
        ) : null}
        {stop.price ? (
          <span
            style={{
              display: "block",
              marginTop: "0.3rem",
              fontSize: "0.86rem",
              fontWeight: 700,
            }}
          >
            {stop.price}
          </span>
        ) : null}
      </a>
    </div>
  );
}
