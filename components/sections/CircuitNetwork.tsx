"use client";

/**
 * @fileoverview Cinematic tour of the Cymasphere system. The camera flies
 * in on the sun, then holds on each product like show credits. Moon motion
 * comes from the analytic Kepler system in utils/orbital-physics; every
 * body is billboarded to the camera and lit by the sun at the origin.
 * The sun uses the same spherical wrap as the moons, so its mark rolls
 * instead of sitting as a flat logo.
 * Pose is written from rAF so React does not re-render every frame.
 * Phones (short side ≤ 768px, including landscape) always run a no-canvas
 * lite tour: current + next moon only, tinted/CSS art, ~12fps, no rings or
 * nebulae. That keeps Kepler + CSS 3D without the texture warps that make
 * iOS Safari reload the tab.
 * @module components/sections/CircuitNetwork
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import {
  type CreditTarget,
  type MoonPlacement,
  type TourCamera,
  type VisibleMoonCandidate,
  CYMASYNTH_OSC_GREEN,
  CYMASYNTH_OSC_RINGS,
  CYMASYNTH_RING_DISK_TILT_DEG,
  SYNTH_RING_PLATE_DESKTOP_PX,
  SYNTH_RING_PLATE_MOBILE_PX,
  SUN_FOCUS_KEY,
  TOUR_PERSPECTIVE_PX,
  VISIBLE_MOON_BUDGET,
  angleDelta,
  cameraTour,
  cymasynthOrbit,
  holdFrameOffset,
  moonDiameter,
  moonPlacements,
  orbitRadiusPx,
  orderCredits,
  hideSynthForSunApproach,
  isStableMoonHold,
  pickVisibleMoons,
  skyParallaxCss,
  sineOscillatorRingPath,
  synthRingMoonRefPx,
  tourDurationMs,
} from "@/utils/circuit-network-layout";
import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import {
  HERO_TOUR_WATCHDOG_KEY,
  MOBILE_FRAME_MIN_MS,
  MOBILE_STAGE_LINGER_MS,
  MOBILE_TEXTURE_KEEP,
  heroBoardIsOnScreen,
  heroTourMoonCap,
  heroTourStopCap,
  isHeroMobileViewport,
  mobileStageKeys,
  moonBakePx,
  pickMobileTourNodes,
  sunBakePx,
} from "@/utils/hero-tour";

/** First-paint pose: far galaxy, same as cameraTour(0). */
const OPENING_CAM = cameraTour(0, false);
const OPENING_SKY = skyParallaxCss(
  OPENING_CAM.translateZ,
  OPENING_CAM.rotateX,
  OPENING_CAM.rotateY
);

/**
 * @brief CSS transform for the screen-space star/nebula backdrop.
 * @param sky Slide and scale from {@link skyParallaxCss}.
 * @returns transform string written onto the Sky node.
 */
function skyCss(sky: { x: number; y: number; scale: number }): string {
  return `translate3d(${sky.x.toFixed(3)}px, ${sky.y.toFixed(3)}px, 0) scale(${sky.scale.toFixed(4)})`;
}

/**
 * @brief CSS 3D transform for the touring scene.
 * @param cam Camera pose (follow-smoothed or opening).
 * @returns transform string written onto the Scene node.
 */
function tourSceneCss(
  cam: Pick<
    TourCamera,
    "rotateX" | "rotateY" | "rotateZ" | "translateX" | "translateY" | "translateZ"
  >
): string {
  return [
    `translate3d(${cam.translateX.toFixed(3)}px, ${cam.translateY.toFixed(3)}px, ${cam.translateZ.toFixed(3)}px)`,
    `rotateX(${cam.rotateX.toFixed(4)}deg)`,
    `rotateY(${cam.rotateY.toFixed(4)}deg)`,
    `rotateZ(${cam.rotateZ.toFixed(4)}deg)`,
  ].join(" ");
}

/**
 * @brief Inverse billboard + scale for the sun so it matches the scene pose.
 * @param cam Camera pose used for the matching scene transform.
 * @returns transform string written onto SunWrap.
 */
function tourSunCss(
  cam: Pick<TourCamera, "rotateX" | "rotateY" | "rotateZ" | "sunScale">
): string {
  return [
    "translate(-50%, -50%)",
    "translateZ(2px)",
    `rotateZ(${(-cam.rotateZ).toFixed(4)}deg)`,
    `rotateY(${(-cam.rotateY).toFixed(4)}deg)`,
    `rotateX(${(-cam.rotateX).toFixed(4)}deg)`,
    `scale(${cam.sunScale.toFixed(3)})`,
  ].join(" ");
}
import {
  type SphereShadeOut,
  createOrbitalSystem,
  hashOrbitKey,
  orbitRingAngleCss,
  orbitRingBasisCss,
  orbitRingDash,
  orbitRingGapHalf,
  orbitRingMatrix3d,
  sphereShade,
  stepOrbitalSystem,
} from "@/utils/orbital-physics";
import { optimizedImageUrl } from "@/utils/optimized-image-url";
import type { CircuitNode } from "./circuit-node";

export type { CircuitNode } from "./circuit-node";
import {
  type SphereTexture,
  getWarpLUT,
  loadSphereTexture,
  faceOnAlign,
  moonSpinPhase,
  releaseAllSphereTextureResources,
  trimSphereTextureCache,
  warpStripToCanvas,
  warpStripToCanvasGpu,
} from "@/utils/sphere-texture";

/**
 * Official Cymasphere app icon — JUCE `IconFile` / `cm-logo-icon.png`.
 * @note Copied into public so credit thumbs match the Mac/Linux/Android icon.
 */
const CYMASPHERE_APP_ICON = "/images/cymasphere-app-icon.png";
/**
 * Same official mark with the baked-in black plate knocked out.
 * There is no transparent JUCE icon; this is the sun overlay.
 */
const CYMASPHERE_SUN_MARK = "/images/cymasphere-sun-mark.png";
/**
 * 4K Cymasphere planet for the hero wrap bake. The visible fallback
 * (`CYMASPHERE_SUN_SPHERE_POSTER`) is the 1280 webp so Play is not bald
 * while the 4K decode finishes.
 */
const CYMASPHERE_SUN_SPHERE = "/images/cymasphere-sun-sphere.jpg";
/** Same render at 1280 — idle poster and SunMark while the 4K bake runs. */
const CYMASPHERE_SUN_SPHERE_POSTER = "/images/cymasphere-sun-sphere-hero.webp";
/**
 * Official CymaSynth app icon (Seed of Life / cymatic mark) for credit thumbs.
 */
const CYMASYNTH_MARK = "/images/cymasynth-mark.png";
/**
 * Downscaled CymaSynth planet for the hero wrap. 4K lives at
 * `/images/cymasynth-sphere.jpg` for the spotlight.
 */
const CYMASYNTH_SPHERE = "/images/cymasynth-sphere-hero.webp";
/** Cymasphere axial day — slower than the moons, still readable. */
const SUN_SPIN_SEC = 80;
const SYNTH_SPIN_SEC = 56;
/** Catalog moons: hash picks a day length in this range (seconds). */
const MOON_SPIN_SEC_MIN = 40;
const MOON_SPIN_SEC_SPAN = 24;
/** Extra featured turntable: milliseconds per added revolution. */
const FEATURED_TURNTABLE_MS = 22000;
/**
 * CSS box of a featured moon. A 1024px element repaints inset shadows
 * at megapixel scale; 640 stays clean through the close-up. The canvas
 * bake is `MOON_FOCUS_CSS_PX × devicePixelRatio` so Retina is 1:1.
 */
const MOON_FOCUS_CSS_PX = 640;
/** Smaller close-up disk on phones so a hold stays inside the frame. */
const MOON_FOCUS_CSS_PX_MOBILE = 280;

/**
 * Full tour loops a phone plays before the hero parks on the closing
 * wide shot. iOS Safari force-reloads pages that keep the GPU busy
 * indefinitely ("using significant energy"), and every extra loop
 * re-bakes textures. One short loop, then the hero parks; desktop
 * keeps looping.
 */
const TOUR_MOBILE_MAX_LOOPS = 1;

/**
 * @brief Device pixel ratio clipped to 2× so Retina does not bake 3× strips.
 * @returns Clipped DPR, or 1 during SSR.
 */
function heroBakeDpr(): number {
  return typeof window === "undefined"
    ? 1
    : Math.min(2, window.devicePixelRatio || 1);
}

/**
 * @brief sessionStorage payload for the crash watchdog, or null.
 * @returns Raw JSON string, or null when storage is unavailable.
 */
function readHeroWatchdog(): string | null {
  try {
    return sessionStorage.getItem(HERO_TOUR_WATCHDOG_KEY);
  } catch {
    return null;
  }
}

interface CircuitNetworkProps {
  /** Cymasphere — sun credit card (subtitle + artwork). */
  cymasphere?: CircuitNode | null;
  /** CymaSynth — closest large moon. */
  cymasynth?: CircuitNode | null;
  /** Remaining catalog products on the outer orbits. */
  nodes: CircuitNode[];
  /**
   * Park after the first posed frame (mobile idle start). Skips the
   * catalog tour loop and texture prefetch so phones do not keep the
   * GPU busy on first paint.
   */
  parkImmediately?: boolean;
  /**
   * Recording / debug credit-stop cap (`?tourCap=N`). Overrides the
   * live phone stop count and raises the moon cap so the recorder
   * can capture a longer highlight reel.
   */
  tourCap?: number;
}

/**
 * @brief Artwork URL for a moon's spherical wrap.
 * CymaSynth uses the pre-rendered planet (like the sun). Catalog moons use
 * full-resolution art on desktop; on phones a bake-sized `/_next/image`
 * URL avoids decoding megabyte originals (Safari OOM reload loops).
 * @param body Tour body with synth flag, node art, and bake size.
 * @param compact When true, wrap through the image optimizer at bake size.
 * @returns Absolute path or remote image URL, or empty when none.
 */
function moonWrapUrl(
  body: {
    synth: boolean;
    node: { image?: string };
    texSizeHi: number;
  },
  compact: boolean
): string {
  if (body.synth) return CYMASYNTH_SPHERE;
  const raw = body.node.image || "";
  if (!raw) return "";
  return compact ? optimizedImageUrl(raw, body.texSizeHi) : raw;
}

/**
 * @brief Bake options for a moon wrap. Pre-lit planets skip surface shade.
 * @param body Tour body with synth flag.
 * @returns Options for loadSphereTexture, or undefined for defaults.
 */
function moonWrapBakeOpts(body: { synth: boolean }) {
  return body.synth ? { surfaceShade: false as const } : undefined;
}

/**
 * @brief Strips tags and collapses whitespace from catalog HTML copy.
 * @param raw Product description or tagline.
 * @returns Plain text, or an empty string.
 */
function plainProductCopy(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @brief Description shown in the empty half of a featured hold.
 * @param credit Current tour credit.
 * @param synth Whether this is the CymaSynth moon.
 * @returns Short plain-text blurb.
 */
function featuredProductBlurb(
  credit: Pick<CreditTarget, "sun" | "description" | "subtitle">,
  synth: boolean
): string {
  const copy = plainProductCopy(credit.description || credit.subtitle);
  if (copy) return copy;
  if (credit.sun) {
    return "Cymasphere writes the harmony, voicings, and patterns at the center of the system.";
  }
  if (synth) {
    return "A professional wavetable synthesizer built for the Cymasphere ecosystem.";
  }
  return "";
}

const Board = styled.div`
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  height: 100%;
  margin: 0 auto;
  overflow: hidden;
  overflow: clip;
  perspective: ${TOUR_PERSPECTIVE_PX}px;

  /* Low-detail latch: drop decorative filters/blends so the moving
     3D scene is not re-filtering megapixel layers every frame. */
  &[data-low="true"] .sun-fx,
  &[data-low="true"] .synth-osc {
    animation: none !important;
    filter: none !important;
    mix-blend-mode: normal !important;
  }

  /* Parked: the tour has stopped scheduling frames; also halt the CSS
     oscillator spin so the compositor goes fully idle. */
  &[data-parked="true"] .synth-osc {
    animation-play-state: paused !important;
  }
  perspective-origin: 50% 50%;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(40, 24, 90, 0.45), transparent 42%),
    radial-gradient(ellipse at 20% 80%, rgba(20, 60, 70, 0.28), transparent 40%),
    #02030a;
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(2, 3, 10, 0.72) 100%);
`;

/**
 * Overlay slot for the tour credit. A plain div so rAF can write opacity
 * onto a real DOM node — `styled(Link)` refs are not reliable in Next 16.
 */
const CreditSlot = styled.div`
  position: absolute;
  left: 6.5%;
  right: auto;
  top: 40%;
  transform: translateY(-58%);
  z-index: 40;
  max-width: min(38vw, 420px);
  pointer-events: none;
  opacity: 0;
  text-align: left;

  &[data-side="right"] {
    left: auto;
    right: 6.5%;
    text-align: left;
  }

  @media (max-width: 768px) {
    left: 4%;
    right: auto;
    top: calc(
      env(safe-area-inset-top, 0px) + var(--site-header-height) +
        var(--site-promo-strip-height) + 0.625rem
    );
    transform: none;
    max-width: min(88vw, 340px);

    &[data-side="right"] {
      left: 4%;
      right: auto;
    }
  }
`;

const CreditCard = styled(Link).attrs({ className: "hero-credit" })`
  display: flex;
  align-items: center;
  gap: 20px;
  text-decoration: none;
  color: inherit;
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.65);

  @media (max-width: 768px) {
    gap: 14px;
  }
`;

const CreditThumb = styled.img`
  width: 112px;
  height: 112px;
  flex-shrink: 0;
  padding: 14px;
  border-radius: 50%;
  object-fit: contain;
  image-rendering: auto;
  background: radial-gradient(
    circle at 32% 28%,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(20, 18, 38, 0.9) 60%,
    rgba(5, 5, 10, 1) 100%
  );
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.55),
    0 0 26px rgba(108, 99, 255, 0.28);

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    padding: 8px;
  }

  &[data-sun="true"] {
    padding: 0;
    object-fit: cover;
    background: #05050a;
  }
`;

const SunMark = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
`;

const CreditText = styled.div`
  min-width: 0;
`;

const CreditRole = styled.span`
  display: block;
  margin-bottom: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 214, 170, 0.78);
`;

const CreditName = styled.span`
  display: block;
  font-size: clamp(1.6rem, 4.2vw, 3.1rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.03em;
  color: #fff;
  overflow-wrap: anywhere;

  @media (max-width: 768px) {
    font-size: clamp(1.15rem, 6vw, 1.55rem);
  }

  ${CreditCard}:hover & {
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }
`;

const CreditPrice = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
`;

const CreditBlurb = styled.p`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  margin: 14px 0 0;
  max-width: 36ch;
  font-size: clamp(0.92rem, 1.5vw, 1.08rem);
  font-weight: 500;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.72);

  @media (max-width: 768px) {
    -webkit-line-clamp: 3;
    margin-top: 8px;
    font-size: 0.86rem;
    max-width: none;
  }
`;

const Scene = styled.div`
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform;
  /* Match cameraTour(0) so the first paint is not identity → fly-in. */
  transform: ${tourSceneCss(OPENING_CAM)};
`;

/**
 * Stars + nebulae ride this layer. It stays screen-facing (world-space
 * plates go edge-on under yaw) but scales and slides with the camera
 * so a dolly over empty space matches a dolly over a planet.
 */
const Sky = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-origin: 50% 45%;
  will-change: transform;
  transform: ${skyCss(OPENING_SKY)};
`;

/**
 * Screen-space dust. World-space plates go edge-on when the camera
 * yaws and read as flat discs; these sit on the sky so they stay
 * clouds from every tour angle.
 */
const Nebula = styled.div<{ $x: number; $y: number; $w: number; $h: number }>`
  position: absolute;
  left: ${(p) => p.$x}%;
  top: ${(p) => p.$y}%;
  width: ${(p) => p.$w}%;
  height: ${(p) => p.$h}%;
  pointer-events: none;
  transform: translate(-50%, -50%);
`;

const NebulaViolet = styled(Nebula)`
  background:
    radial-gradient(ellipse 58% 48% at 38% 44%, rgba(108, 99, 255, 0.32) 0%, transparent 72%),
    radial-gradient(ellipse 36% 42% at 68% 60%, rgba(150, 90, 255, 0.16) 0%, transparent 70%);
`;

const NebulaGold = styled(Nebula)`
  background:
    radial-gradient(ellipse 50% 40% at 48% 46%, rgba(255, 214, 170, 0.18) 0%, transparent 70%),
    radial-gradient(ellipse 30% 38% at 64% 58%, rgba(255, 180, 120, 0.1) 0%, transparent 68%);
`;

const NebulaTeal = styled(Nebula)`
  background:
    radial-gradient(ellipse 46% 38% at 56% 48%, rgba(78, 205, 196, 0.14) 0%, transparent 72%),
    radial-gradient(ellipse 28% 34% at 32% 62%, rgba(60, 180, 190, 0.08) 0%, transparent 68%);
`;

/**
 * One deep starfield plane: a single 2px dot whose box-shadow list paints
 * hundreds of stars in one compositor layer. Several sheets at different
 * depths give the camera real parallax — moves read against the sky
 * instead of looking like planets flying at the viewer.
 */
const StarSheet = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  pointer-events: none;
  background: transparent;
`;

/**
 * Raster edge for one orbit-ring SVG. Big enough that the ≤~8× upscale
 * keeps a 2px stroke smooth (256 was grainy), small enough that outer
 * rings are not multi-thousand-pixel GPU layers.
 */
const ORBIT_RING_BASE_PX = 1024;

/** SVG circle radius; the 3d matrix maps this onto the Kepler `a`. */
const ORBIT_RING_LOCAL_R = ORBIT_RING_BASE_PX / 2 - 2;

/**
 * Faint Kepler path in the same plane and radius as the moons on it.
 * Rasterized at a capped 1024px and seated with a matrix that matches
 * `stepOrbitalSystem` — rotateX/rotateY guesses left the stroke floating
 * off every planet.
 */
const OrbitRing = styled.svg<{
  $r: number;
  $alpha: number;
  $matrix: string;
}>`
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${ORBIT_RING_BASE_PX}px;
  height: ${ORBIT_RING_BASE_PX}px;
  overflow: visible;
  pointer-events: none;
  transform: translate(-50%, -50%) ${(p) => p.$matrix};
  transform-style: preserve-3d;
  shape-rendering: geometricPrecision;
  z-index: 0;

  circle {
    fill: none;
    stroke: rgba(255, 226, 200, ${(p) => p.$alpha});
    stroke-linecap: butt;
    /* World-space ~2px after the ring is scaled to its orbit. */
    stroke-width: ${(p) => (2 * ORBIT_RING_BASE_PX) / Math.max(1, p.$r * 2)};
  }
`;

/**
 * Orbit strokes live in the same 3D scene as the moons. Hidden while
 * the camera features Cymasphere so no rings sit on the sun.
 */
const RingLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transition: opacity 0.35s ease;
`;

/** Moons + sun: live in the scene 3D space, stacked above the ring plate. */
const BodyLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  transform-style: preserve-3d;
`;

const Moon = styled(Link).attrs({ className: "hero-moon" })`
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 80px;
  height: 80px;
  aspect-ratio: 1;
  text-decoration: none;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
  transform-style: preserve-3d;
  contain: layout style paint;
  will-change: transform;
  filter: var(--moon-filter, none);
  color: inherit;
  /* Base sphere tinted from the product artwork (--tint-* vars); the baked
     hemisphere texture sits above it and fades into it at the rim. */
  background:
    radial-gradient(
      circle at var(--lit-x, 32%) var(--lit-y, 28%),
      rgba(var(--tint-hi, 139, 132, 184), 1) 0%,
      rgba(var(--tint-mid, 60, 55, 88), 1) 28%,
      rgba(var(--tint-lo, 22, 20, 31), 1) 62%,
      #05050a 100%
    );
  box-shadow:
    inset -10px -14px 22px rgba(0, 0, 0, 0.72),
    inset 8px 10px 16px rgba(255, 255, 255, 0.14),
    0 14px 26px rgba(0, 0, 0, 0.55),
    0 0 18px rgba(255, 190, 130, 0.16);

  &::before {
    content: "";
    position: absolute;
    inset: 6%;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--lit-x, 32%) var(--lit-y, 28%),
      rgba(255, 255, 255, 0.62) 0%,
      rgba(255, 255, 255, 0.1) 18%,
      transparent 40%
    );
    z-index: 2;
  }

  /* Terminator: the dark hemisphere tracks the sun via --dark-x/--dark-y,
     deepening with --shade so front-passing moons show a crescent. */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--dark-x, 72%) var(--dark-y, 78%),
      rgba(0, 0, 0, calc(0.2 + var(--shade, 0.4) * 0.55)) 0%,
      rgba(0, 0, 0, calc(0.08 + var(--shade, 0.4) * 0.3)) 42%,
      transparent 78%
    );
    /* Thin limb line plus an atmospheric backlight that grows as the moon
       passes in front of the sun (shade → 1). */
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.08),
      inset 0 0 14px 2px rgba(255, 224, 185, calc(var(--shade, 0.4) * 0.4));
    z-index: 2;
  }

  /* Featured art is an opaque spinning wrap. The CSS highlight /
     terminator stay for generic moons; over art they read as a
     static mask that does not turn with the texture. */
  &[data-art="true"]::before,
  &[data-art="true"]::after {
    opacity: 0;
  }

  span {
    position: relative;
    z-index: 1;
    max-width: 52%;
    max-height: 52%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55));
  }

  &:hover,
  &:focus,
  &:focus-visible {
    outline: none;
    color: inherit;
    text-shadow: none;
    filter: var(--moon-filter, none);
  }
`;

/**
 * Warped sphere face: a canvas the renderer re-warps as the moon spins,
 * so the artwork keeps true spherical distortion (limb compression,
 * center magnification) at every rotation phase. Art is applied only
 * when a moon is featured (or next up); until then the canvas stays
 * transparent over the generic tinted sphere, and the first warp fades
 * the artwork in.
 */
const TexCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  image-rendering: auto;
  opacity: 0;
  transition: opacity 0.45s ease;
`;

const synthOscSpin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

/**
 * World-space oscillator disk around CymaSynth. Sibling of the moon so
 * the sphere can keep overflow:hidden; not billboarded, so the rings
 * stay in a Saturn-like plane as the camera tours.
 */
const SynthRingPlate = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${SYNTH_RING_PLATE_DESKTOP_PX}px;
  height: ${SYNTH_RING_PLATE_DESKTOP_PX}px;
  pointer-events: none;
  z-index: 19;
  overflow: visible;
  visibility: hidden;
  opacity: 0;
  transform-style: preserve-3d;

  &[data-compact="true"] {
    width: ${SYNTH_RING_PLATE_MOBILE_PX}px;
    height: ${SYNTH_RING_PLATE_MOBILE_PX}px;
  }

  &[data-posed="true"] .synth-osc {
    animation-play-state: running;
  }
`;

const SynthRingDisk = styled.div<{ $tiltX: number; $tiltZ: number }>`
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(${(p) => p.$tiltX}deg) rotateZ(${(p) => p.$tiltZ}deg);
`;

const SynthRingSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  shape-rendering: geometricPrecision;
`;

const SynthOscPath = styled.path<{ $dur: string }>`
  fill: none;
  stroke: ${CYMASYNTH_OSC_GREEN};
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.45;
  transform-origin: center center;
  shape-rendering: geometricPrecision;
  animation: ${synthOscSpin} ${(p) => p.$dur} linear infinite;
  animation-play-state: paused;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SYNTH_OSC_PATHS = CYMASYNTH_OSC_RINGS.map((ring) => ({
  ...ring,
  d: sineOscillatorRingPath(
    120,
    120,
    ring.radius,
    ring.amplitude,
    ring.cycles,
    256
  ),
}));

const SynthMoon = styled(Moon)`
  background:
    radial-gradient(
      circle at var(--lit-x, 32%) var(--lit-y, 28%),
      #d8d2ff 0%,
      #6c63ff 30%,
      #2a1860 64%,
      #0a0618 100%
    );
  box-shadow:
    inset -12px -16px 24px rgba(0, 0, 0, 0.6),
    inset 8px 10px 18px rgba(255, 255, 255, 0.2),
    0 0 36px rgba(108, 99, 255, 0.4),
    0 14px 28px rgba(0, 0, 0, 0.55);
`;

/**
 * Irregular dust around the sun. Multiple offset lobes read as a
 * volume instead of a perfect halo; layers drift on different clocks.
 * Sizes and blur radii are capped — blurred, blended layers this large
 * re-composite against the moving scene every frame. The `sun-fx` class
 * lets the low-detail latch pause the drift animations.
 */
/**
 * Soft gas around the sun. Gradient-only — no blur, blend, or drift.
 * SunWrap billboards every frame, so a filtered layer here is a
 * per-frame re-filter of a ~1000px plate.
 */
const SunNebula = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;
  z-index: 0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
`;

const SunNebulaGold = styled(SunNebula)`
  width: 520px;
  height: 440px;
  opacity: 0.7;
  background:
    radial-gradient(ellipse 55% 42% at 38% 46%, rgba(255, 214, 160, 0.45) 0%, transparent 70%),
    radial-gradient(ellipse 40% 50% at 62% 58%, rgba(255, 180, 120, 0.2) 0%, transparent 68%);

  @media (max-width: 768px) {
    width: 320px;
    height: 270px;
  }
`;

const SunNebulaViolet = styled(SunNebula)`
  width: 620px;
  height: 520px;
  opacity: 0.75;
  background:
    radial-gradient(ellipse 48% 38% at 28% 40%, rgba(108, 99, 255, 0.4) 0%, transparent 72%),
    radial-gradient(ellipse 36% 48% at 74% 62%, rgba(150, 90, 255, 0.22) 0%, transparent 70%);

  @media (max-width: 768px) {
    width: 380px;
    height: 320px;
  }
`;

const SunWrap = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: ${tourSunCss(OPENING_CAM)};
  z-index: 20;
  pointer-events: none;
  transform-style: preserve-3d;
`;

const SunCore = styled(Link).attrs({ className: "hero-sun" })`
  position: relative;
  z-index: 3;
  width: 560px;
  height: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-decoration: none;
  pointer-events: auto;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 0 48px rgba(255, 230, 180, 0.85),
    0 0 110px rgba(108, 99, 255, 0.55),
    inset -36px -44px 64px rgba(40, 10, 70, 0.35),
    inset 24px 28px 44px rgba(255, 255, 255, 0.28);

  &:hover,
  &:focus,
  &:focus-visible {
    color: inherit;
    outline: none;
    filter: none;
    box-shadow:
      0 0 48px rgba(255, 230, 180, 0.85),
      0 0 110px rgba(108, 99, 255, 0.55),
      inset -36px -44px 64px rgba(40, 10, 70, 0.35),
      inset 24px 28px 44px rgba(255, 255, 255, 0.28);
  }

  @media (max-width: 768px) {
    width: min(56vw, 240px);
    height: min(56vw, 240px);
    gap: 8px;
  }
`;

/**
 * Body of the sun. The wrap stays billboarded so the disc never goes
 * edge-on; the warped canvas on top is the same spherical wrap the
 * moons use, so the mark rolls around instead of sitting face-on.
 */
const SunFace = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 34% 30%,
      #fffaf0 0%,
      #ffe0a8 14%,
      #c9b4ff 36%,
      #6c63ff 56%,
      #2a1460 78%,
      #12071f 100%
    );

  &[data-art="true"] img {
    opacity: 0;
  }
`;

const SunCorona = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 720px;
  height: 720px;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(255, 220, 160, 0.42) 0%,
    rgba(108, 99, 255, 0.2) 38%,
    transparent 70%
  );

  @media (max-width: 768px) {
    width: min(88vw, 320px);
    height: min(88vw, 320px);
  }
`;

const SunFlare = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 140%;
  height: 18px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 240, 210, 0.15),
    rgba(255, 255, 255, 0.7),
    rgba(180, 170, 255, 0.28),
    transparent
  );
`;

/**
 * @brief Deterministic PRNG for stars and nebulae.
 * @param seed Fixed seed.
 * @returns Floats in [0, 1).
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reused shading record so posing allocates nothing per frame. */
const SHADE: SphereShadeOut = { litX: 50, litY: 40, shade: 0.5 };
/** Last written filter per moon; skips writes so blur layers are not re-rasterized. */
const lastFilter = new WeakMap<HTMLElement, string>();
/** Last written lighting key per moon; skips the 5 custom-property writes. */
const lastShadeKey = new WeakMap<HTMLElement, string>();
/** Last written opacity per moon. */
const lastOpacity = new WeakMap<HTMLElement, string>();
/** Whether the moon is currently shown (frustum/plane culling state). */
const lastVisible = new WeakMap<HTMLElement, boolean>();
/** CSS box size last written so the bitmap is not crushed then scaled up. */
const lastMoonCss = new WeakMap<HTMLElement, number>();

/**
 * @brief Sets a moon's CSS box. Featured moons stay at MOON_FOCUS_CSS_PX
 * so shadows stay cheap; the canvas bake can be 2× that and scales via
 * TexCanvas width/height 100%. Distant moons match their world diameter.
 * @param el Moon element.
 * @param px Edge in CSS pixels.
 */
function setMoonBitmapSize(el: HTMLElement, px: number): void {
  const capped = Math.min(MOON_FOCUS_CSS_PX, px);
  if (lastMoonCss.get(el) === capped) return;
  lastMoonCss.set(el, capped);
  el.style.width = `${capped}px`;
  el.style.height = `${capped}px`;
}

/**
 * @brief Stores a close-up bake and drops older ones so hi-res strips
 * do not accumulate for every product on the tour.
 * @param map Hi-res texture cache.
 * @param key Moon key.
 * @param tex Fresh bake.
 * @param onEvict Called when an older entry is dropped.
 * @param protect Keys that must stay pinned (staged moons).
 */
function rememberHiRes(
  map: Map<string, SphereTexture>,
  key: string,
  tex: SphereTexture,
  max = 4,
  onEvict?: (evictedKey: string) => void,
  protect?: ReadonlySet<string>
): void {
  if (map.has(key)) map.delete(key);
  map.set(key, tex);
  while (map.size > max) {
    let evicted = false;
    for (const oldest of map.keys()) {
      if (!oldest || oldest === key) continue;
      if (protect?.has(oldest)) continue;
      map.delete(oldest);
      onEvict?.(oldest);
      evicted = true;
      break;
    }
    if (!evicted) break;
  }
}

/** Camera state shared by every poseMoon call in one frame. */
const FRAME = {
  dollyZ: 0,
  camX: 0,
  camY: 0,
  camZ: 0,
  creditsW: 0,
  /** Half the board width plus margin, for horizontal frustum culling. */
  viewHalfW: 600,
  /** Latched on slow devices: drops the blur filter, the top paint cost. */
  lowDetail: false,
};

/**
 * @brief Writes a moon's physics pose and sun-lit shading onto its DOM node.
 * The element is fully billboarded (inverse of the camera rotation), so the
 * sphere always faces the viewer while the transform places it in real 3D.
 * Moons that are faded out (flyby/plane fade) or projected outside the
 * horizontal frustum are hidden entirely and skip all style work — with
 * orbits extending past the viewport this culls a large share of the
 * system most of the time. Quantized filter/lighting/opacity values are
 * cached per element and skipped when unchanged.
 * @param el Moon element (size is static, set from JSX).
 * @param x World x from the physics system (px, screen right).
 * @param height World out-of-plane height (px, up).
 * @param z World depth toward the camera (px).
 * @param camSpaceX Yaw-rotated x used for culling and lighting.
 * @param camSpaceZ Yaw-rotated depth used for depth cues and lighting.
 * @param aPx Semi-major axis in px (depth normalizer).
 * @param diameter Sphere diameter in px (for the frustum margin).
 * @param focusW Eased 0–1 credit close-up weight for this moon.
 * @returns World-space visual radius (for orbit-stroke holes). 0 if unused.
 * @note Camera state comes from the shared FRAME record, set once per frame.
 */
function poseMoon(
  el: HTMLElement,
  x: number,
  height: number,
  z: number,
  camSpaceX: number,
  camSpaceZ: number,
  aPx: number,
  diameter: number,
  focusW: number
): number {
  const creditsW = FRAME.creditsW;
  const depth = Math.min(1, Math.max(0, (camSpaceZ / aPx + 1) / 2));
  const dim = creditsW * (1 - focusW);
  const boost = creditsW * focusW;
  const cssSize = lastMoonCss.get(el) ?? diameter;
  // Real perspective already sizes the moons. A depth scale here pumped
  // every frame with the camera and read as vibration.
  const scale =
    (diameter / Math.max(1, cssSize)) * (0.96 + boost * 0.5) * (1 - 0.1 * dim);
  const visualR = (cssSize * scale) / 2;
  let opacity = (0.22 + depth * 0.78) * (1 - 0.58 * dim);
  // Flyby fade: moons approaching the perspective plane dissolve before
  // they can cross it (crossing renders mirrored). Focused moons never
  // reach the fade window by design of the dolly clamp.
  const zTotal = FRAME.dollyZ + camSpaceZ;
  const planeT = Math.min(
    1,
    Math.max(
      0,
      (zTotal - TOUR_PERSPECTIVE_PX * 0.8) / (TOUR_PERSPECTIVE_PX * 0.155)
    )
  );
  opacity *= 1 - planeT * planeT * (3 - 2 * planeT);
  opacity += (1 - opacity) * boost;
  if (focusW > 0.35) {
    opacity = Math.max(opacity, 0.94);
  }

  // Cull: invisible or projected beyond the horizontal frustum (with a
  // generous margin for roll/pitch). Hidden moons cost nothing to paint.
  const mag =
    TOUR_PERSPECTIVE_PX / Math.max(60, TOUR_PERSPECTIVE_PX - zTotal);
  const offscreen =
    Math.abs(camSpaceX) * mag - diameter * scale * mag * 0.5 >
    FRAME.viewHalfW * 1.3;
  if (focusW <= 0.35 && (opacity < 0.012 || offscreen)) {
    if (lastVisible.get(el) !== false) {
      lastVisible.set(el, false);
      el.style.visibility = "hidden";
    }
    return visualR;
  }
  if (lastVisible.get(el) !== true) {
    lastVisible.set(el, true);
    el.style.visibility = "visible";
  }

  const zIndex =
    focusW > 0.5
      ? 70
      : depth > 0.52
        ? Math.round(28 + depth * 18)
        : Math.round(2 + depth * 12);
  sphereShade(camSpaceX, height, camSpaceZ, SHADE);
  const baseBright = 1.08 - SHADE.shade * 0.38;
  const brightness = baseBright + (1.05 - baseBright) * boost;

  // Lighting is quantized coarsely: every step repaints the moon's
  // gradients and shadows, so fewer, bigger steps beat smooth creep.
  const litX = Math.round(SHADE.litX);
  const litY = Math.round(SHADE.litY);
  const shade = Math.round(SHADE.shade * 20) / 20;
  const shadeKey = `${litX}|${litY}|${shade}`;
  if (lastShadeKey.get(el) !== shadeKey) {
    lastShadeKey.set(el, shadeKey);
    el.style.setProperty("--lit-x", `${litX}%`);
    el.style.setProperty("--lit-y", `${litY}%`);
    el.style.setProperty("--dark-x", `${100 - litX}%`);
    el.style.setProperty("--dark-y", `${100 - litY}%`);
    el.style.setProperty("--shade", String(shade));
  }

  // Brightness only — a per-moon blur() forced a re-filter of the whole
  // layer on every change. Depth still reads via opacity and lighting.
  const brightQ = Math.round(brightness * 20) / 20;
  const filter = brightQ === 1 ? "none" : `brightness(${brightQ})`;
  if (lastFilter.get(el) !== filter) {
    lastFilter.set(el, filter);
    el.style.setProperty("--moon-filter", filter);
  }

  const zIndexStr = String(zIndex);
  if (el.style.zIndex !== zIndexStr) el.style.zIndex = zIndexStr;
  const opacityStr = opacity.toFixed(3);
  if (lastOpacity.get(el) !== opacityStr) {
    lastOpacity.set(el, opacityStr);
    el.style.opacity = opacityStr;
  }
  el.style.transform = [
    "translate(-50%, -50%)",
    `translate3d(${x.toFixed(3)}px, ${(-height).toFixed(3)}px, ${z.toFixed(3)}px)`,
    `rotateZ(${(-FRAME.camZ).toFixed(4)}deg)`,
    `rotateY(${(-FRAME.camY).toFixed(4)}deg)`,
    `rotateX(${(-FRAME.camX).toFixed(4)}deg)`,
    // Sit the disk in front of its ring plane so the stroke cannot
    // composite over the planet even where the dash hole is tight.
    `translateZ(${(visualR + 4).toFixed(3)}px)`,
    `scale(${scale.toFixed(4)})`,
  ].join(" ");
  return visualR;
}

/**
 * @brief Places CymaSynth's oscillator rings at the moon's world seat.
 * The disk is tilted in world space (not billboarded) so it reads as
 * Saturn rings while the sphere stays face-on.
 * @param el Ring plate element.
 * @param x World x (px, screen right).
 * @param height World height (px, up).
 * @param z World depth toward the camera (px).
 * @param visualDiameter Moon's posed diameter in px.
 * @param spinDeg Slow precession of the disk.
 * @param opacity Matched to the moon so flybys fade together.
 * @param zIndex Just under the moon.
 * @param visible False when the synth moon is culled.
 * @param compact When true, pose against the smaller phone plate.
 */
function poseSynthOscRings(
  el: HTMLElement,
  x: number,
  height: number,
  z: number,
  visualDiameter: number,
  spinDeg: number,
  opacity: number,
  zIndex: number,
  visible: boolean,
  compact = false
): void {
  if (!visible) {
    if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
    if (el.style.opacity !== "0") el.style.opacity = "0";
    if (el.dataset.posed) delete el.dataset.posed;
    return;
  }

  const platePx = compact
    ? SYNTH_RING_PLATE_MOBILE_PX
    : SYNTH_RING_PLATE_DESKTOP_PX;
  const scale = visualDiameter / synthRingMoonRefPx(platePx);
  el.style.transform = [
    "translate(-50%, -50%)",
    `translate3d(${x.toFixed(3)}px, ${(-height).toFixed(3)}px, ${z.toFixed(3)}px)`,
    `rotateX(${CYMASYNTH_RING_DISK_TILT_DEG}deg)`,
    `rotateZ(${spinDeg.toFixed(3)}deg)`,
    `scale(${scale.toFixed(4)})`,
  ].join(" ");
  el.dataset.posed = "true";
  el.style.zIndex = String(Math.max(1, zIndex - 1));
  el.style.opacity = opacity.toFixed(3);
  if (el.style.visibility !== "visible") el.style.visibility = "visible";
}

/**
 * @brief Renders the solar-system tour: Cymasphere as the sun, products as moons.
 * @param cymasphere Sun credit (optional until loaded).
 * @param cymasynth Closest large moon (optional until loaded).
 * @param nodes Remaining products, one per orbit seat.
 * @param parkImmediately When true, pose one frame then freeze.
 * @param tourCap Optional recording/debug credit-stop cap.
 * @returns The tour scene.
 * @example
 * <CircuitNetwork cymasynth={synth} nodes={catalog} />
 */
const CircuitNetwork: React.FC<CircuitNetworkProps> = ({
  cymasphere,
  cymasynth,
  nodes,
  parkImmediately = false,
  tourCap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const ringLayerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const synthRingsRef = useRef<HTMLDivElement>(null);
  const sunFaceRef = useRef<HTMLDivElement>(null);
  const sunCanvasRef = useRef<HTMLCanvasElement>(null);
  const sunTexRef = useRef<SphereTexture | null>(null);
  const sunAlignRef = useRef(0);
  const sunBoostRef = useRef(0);
  const creditWrapRef = useRef<HTMLDivElement>(null);
  const creditLinkRef = useRef<HTMLAnchorElement>(null);
  const creditRoleRef = useRef<HTMLSpanElement>(null);
  const creditNameRef = useRef<HTMLSpanElement>(null);
  const creditPriceRef = useRef<HTMLSpanElement>(null);
  const creditDescRef = useRef<HTMLParagraphElement>(null);
  const creditThumbRef = useRef<HTMLImageElement>(null);
  const lastCreditKey = useRef<string | null>(null);
  const moonRefs = useRef(new Map<string, HTMLAnchorElement>());
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>());
  const ringCircleRefs = useRef(new Map<number, SVGCircleElement>());
  const visualRByKey = useRef(new Map<string, number>());
  const lastRingDash = useRef(new Map<number, string>());
  const warpPhases = useRef(new Map<string, number>());
  const texturesHiRef = useRef(new Map<string, SphereTexture>());
  const creditLenRef = useRef(0);
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  /** Smoothed camera so look-at micro-steps do not shake the moons. */
  const camFollow = useRef({
    x: OPENING_CAM.rotateX,
    y: OPENING_CAM.rotateY,
    z: OPENING_CAM.rotateZ,
    tx: OPENING_CAM.translateX,
    ty: OPENING_CAM.translateY,
    tz: OPENING_CAM.translateZ,
    armed: true,
  });
  const startedAt = useRef<number | null>(null);
  const lastFrameAt = useRef<number | null>(null);
  const focusWeights = useRef(new Map<string, number>());
  const creditsWeight = useRef(0);
  const frameEma = useRef(16.7);
  /** Extra turntable rotation accumulated while a moon is featured. */
  const spinBoost = useRef(new Map<string, number>());
  /**
   * Phase offset so a hold starts with the artwork facing the camera.
   * Latched when a moon becomes focus or next, then the day spin
   * continues from that face-on start.
   */
  const faceAlign = useRef(new Map<string, number>());
  const facedKeys = useRef("");
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      isHeroMobileViewport(window.innerWidth, window.innerHeight)
  );
  // Start the tour immediately. IntersectionObserver pauses it when the
  // hero leaves the viewport; if IO never fires (embedded previews), the
  // camera and credit card still run.
  // IntersectionObserver updates a ref so scrolling the hero off-screen
  // pauses the tour without tearing down the rAF loop (that remount used
  // to feel like a reload on mobile when scrolling back).
  const heroOnScreenRef = useRef(true);
  const tourWasPausedRef = useRef(false);
  const pageHiddenRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(
    null
  );
  /** Keys the picker chose this moment — rAF-only, never re-renders. */
  const liveKeysRef = useRef<string[]>([]);
  const [stageKeys, setStageKeys] = useState<string[]>([]);
  const stageKeysRef = useRef<string[]>([]);
  const lingerAt = useRef(new Map<string, number>());
  const livePickAt = useRef(0);
  const liveForced = useRef("");
  const mountedRef = useRef(true);
  const candidatePool = useRef<VisibleMoonCandidate[]>([]);
  /** True once a phone has toured the catalog and the hero froze. */
  const parkedRef = useRef(false);
  const parkImmediatelyRef = useRef(parkImmediately);
  parkImmediatelyRef.current = parkImmediately;
  /**
   * Phones never canvas-warp. Texture strips + GPU blits are what push
   * iOS Safari into a memory/energy kill mid-tour.
   */
  const liteTourRef = useRef(
    typeof window !== "undefined" &&
      isHeroMobileViewport(window.innerWidth, window.innerHeight)
  );
  const mobile = isMobile;
  /** True when this visit should skip canvas warps (every phone Play). */
  const liteTour = liteTourRef.current && mobile;

  // Crash watchdog: a user reload or navigation fires pagehide first,
  // but a Safari memory/energy kill does not — so an entry left
  // "unclean" by the previous page load means the browser killed us.
  // Logged to the console so a tethered Web Inspector can attribute
  // reload loops (aliveSec + whether the tour had already parked).
  useEffect(() => {
    try {
      const prev = sessionStorage.getItem(HERO_TOUR_WATCHDOG_KEY);
      if (prev) {
        const rec = JSON.parse(prev) as {
          clean?: boolean;
          aliveSec?: number;
          parked?: boolean;
        };
        if (!rec.clean) {
          console.warn(
            `[hero] Previous visit ended without pagehide after ~${rec.aliveSec ?? "?"}s ` +
              `(tour parked: ${rec.parked ? "yes" : "no"}) — Safari likely killed the page (memory/energy).`
          );
        }
      }
    } catch {
      /* Private mode: no storage, no watchdog. */
    }
    const startedAtMs = Date.now();
    const write = (clean: boolean) => {
      try {
        sessionStorage.setItem(
          HERO_TOUR_WATCHDOG_KEY,
          JSON.stringify({
            clean,
            aliveSec: Math.round((Date.now() - startedAtMs) / 1000),
            parked: parkedRef.current,
          })
        );
      } catch {
        /* ignore */
      }
    };
    write(false);
    const beat = window.setInterval(() => write(false), 5000);
    const onHide = () => write(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(beat);
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, []);

  useEffect(() => {
    const applyMobile = () => {
      const next = isHeroMobileViewport(window.innerWidth, window.innerHeight);
      setIsMobile(next);
      if (next) {
        FRAME.lowDetail = true;
        containerRef.current?.setAttribute("data-low", "true");
      }
    };
    applyMobile();
    window.addEventListener("resize", applyMobile);
    window.addEventListener("orientationchange", applyMobile);
    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motionMql.matches);
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionMql.addEventListener("change", onMotion);
    const onPageVis = () => {
      pageHiddenRef.current = document.visibilityState === "hidden";
    };
    onPageVis();
    document.addEventListener("visibilitychange", onPageVis);
    return () => {
      window.removeEventListener("resize", applyMobile);
      window.removeEventListener("orientationchange", applyMobile);
      motionMql.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onPageVis);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const syncOnScreen = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      heroOnScreenRef.current = heroBoardIsOnScreen(r, vh);
    };
    syncOnScreen();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) {
            const r = e.boundingClientRect;
            const vh = window.innerHeight || 0;
            if (heroBoardIsOnScreen(r, vh)) {
              heroOnScreenRef.current = true;
              return;
            }
          }
          heroOnScreenRef.current = e.isIntersecting;
        }),
      { threshold: 0 }
    );
    observer.observe(el);
    window.addEventListener("resize", syncOnScreen);
    window.addEventListener("orientationchange", syncOnScreen);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncOnScreen);
      window.removeEventListener("orientationchange", syncOnScreen);
    };
  }, [mobile]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = (w: number, h: number) => {
      if (w < 8 || h < 8) return;
      setFrameSize((prev) =>
        prev && Math.abs(prev.w - w) < 12 && Math.abs(prev.h - h) < 12
          ? prev
          : { w, h }
      );
    };
    apply(el.getBoundingClientRect().width, el.getBoundingClientRect().height);
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) apply(box.width, box.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mobile) return;
    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      look.current.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
      look.current.ty = ((event.clientY - rect.top) / rect.height - 0.5) * -3;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mobile]);

  const moonCap = heroTourMoonCap(mobile, tourCap, !!cymasynth);
  const tourNodes = useMemo(
    () =>
      moonCap == null
        ? nodes
        : pickMobileTourNodes(nodes, moonCap, CURATED_FEATURED_ORDER),
    [moonCap, nodes]
  );
  const seats = useMemo(
    () => moonPlacements(tourNodes.length, mobile),
    [tourNodes.length, mobile]
  );
  const synthSeat = useMemo(() => cymasynthOrbit(mobile), [mobile]);
  const bakePx = useMemo(
    () => moonBakePx(mobile, heroBakeDpr()),
    [mobile]
  );

  const bodies = useMemo(() => {
    const list: Array<{
      key: string;
      node: CircuitNode;
      seat: MoonPlacement;
      synth: boolean;
      /** Axial spin period in seconds — a long, lazy day. */
      spinDur: number;
      /** Retrograde rotation for about half the moons. */
      spinRev: boolean;
      /** Bake resolution for the focus close-up (art is focus-only). */
      texSizeHi: number;
    }> = [];
    if (cymasynth) {
      list.push({
        key: `synth-${cymasynth.id}`,
        node: cymasynth,
        seat: synthSeat,
        synth: true,
        spinDur: SYNTH_SPIN_SEC,
        spinRev: false,
        texSizeHi: bakePx,
      });
    }
    seats.forEach((seat) => {
      const node = tourNodes[seat.index];
      if (!node) return;
      // Size and spin are keyed to the product (slug hash), not its fetch
      // position, so a moon keeps its character even if order changes.
      const hash = hashOrbitKey(node.slug || String(node.id));
      const d = moonDiameter(hash, seat.ring, mobile);
      list.push({
        key: String(node.id),
        node,
        seat: { ...seat, size: { w: d, h: d } },
        synth: false,
        spinDur: MOON_SPIN_SEC_MIN + ((hash % 1000) / 1000) * MOON_SPIN_SEC_SPAN,
        spinRev: ((hash >>> 3) & 1) === 1,
        texSizeHi: bakePx,
      });
    });
    return list;
  }, [bakePx, cymasynth, tourNodes, seats, synthSeat, mobile]);

  const system = useMemo(() => {
    const w = frameSize?.w ?? 1200;
    const h = frameSize?.h ?? 640;
    return createOrbitalSystem(
      bodies.map((body) => ({
        key: body.key,
        radius: orbitRadiusPx(body.seat.radius, w, h),
        startDeg: body.seat.startDeg,
        periodSec: body.seat.periodSec,
      }))
    );
  }, [bodies, frameSize]);

  useEffect(() => {
    if (liveKeysRef.current.length > 0 || bodies.length === 0) return;
    // Phones start empty: the rAF window mounts focus + next only.
    // Seeding four moons here was enough to trip Safari on Play.
    if (mobile) {
      liveKeysRef.current = [];
      stageKeysRef.current = [];
      setStageKeys([]);
      return;
    }
    const seed = bodies
      .slice(0, VISIBLE_MOON_BUDGET)
      .map((body) => body.key);
    liveKeysRef.current = seed;
    stageKeysRef.current = seed;
    seed.forEach((key) => lingerAt.current.set(key, 0));
    setStageKeys(seed);
  }, [bodies, mobile]);

  const credits = useMemo<CreditTarget[]>(() => {
    const ordered = orderCredits([
        {
          key: SUN_FOCUS_KEY,
          name: cymasphere?.name || "Cymasphere",
          slug: cymasphere?.slug || "cymasphere",
          price: cymasphere?.price,
          subtitle: (cymasphere?.tagline || "").trim(),
          description: (cymasphere?.description || "").trim(),
          image: CYMASPHERE_APP_ICON,
          sun: true,
          weight: 1.5,
          startDeg: 0,
          periodSec: 1,
          radius: 0,
          radiusPx: 0,
          size: 0,
        },
        ...bodies.map((body, i) => ({
          key: body.key,
          name: body.node.name,
          slug: body.node.slug,
          price: body.node.price,
          subtitle: (body.node.tagline || "").trim(),
          description: (body.node.description || "").trim(),
          image: body.node.image,
          weight: body.synth ? 2 : 1,
          startDeg: body.seat.startDeg,
          // Apparent angular rate includes apsidal precession, so the
          // credits camera keeps aiming true as orbits slowly rotate.
          periodSec: (2 * Math.PI) / (system.n[i] + system.prec[i]),
          radius: body.seat.radius,
          radiusPx: system.a[i],
          size: body.seat.size.w * (body.synth ? 1.45 : 1),
        })),
      ]);
    // Curated/capped list: sun → CymaSynth → featured moons. Short
    // enough that one loop + park finishes before Safari's energy
    // watchdog reloads the page. `tourCap` raises the slice for the
    // recorder.
    const stopCap = heroTourStopCap(mobile, tourCap);
    return stopCap == null ? ordered : ordered.slice(0, stopCap);
  }, [bodies, cymasphere, system, mobile, tourCap]);

  /**
   * @brief Moon keys whose bakes must not be evicted mid-hold.
   * @returns Live picker keys plus anything still mounted.
   */
  const textureProtectKeys = (): Set<string> => {
    const keys = new Set(liveKeysRef.current);
    for (const key of stageKeysRef.current) keys.add(key);
    return keys;
  };

  /**
   * @brief Maps staged moon keys to global sphere-texture cache keys.
   * @param moonKeys Moon body keys to keep pinned.
   * @param bodyList Catalog bodies for URL lookup.
   * @param compact Phone bake path when true.
   * @returns `url@size` keys for {@link trimSphereTextureCache}.
   */
  const textureCacheProtectKeys = (
    moonKeys: Iterable<string>,
    bodyList: typeof bodies,
    compact: boolean
  ): Set<string> => {
    const protect = new Set<string>();
    const byKey = new Map(bodyList.map((body) => [body.key, body]));
    for (const moonKey of moonKeys) {
      const body = byKey.get(moonKey);
      if (!body) continue;
      const wrap = moonWrapUrl(body, compact);
      if (!wrap) continue;
      const opts = moonWrapBakeOpts(body);
      const raw = opts?.surfaceShade === false ? ":raw" : "";
      protect.add(`${wrap}@${body.texSizeHi}${raw}`);
    }
    return protect;
  };

  /**
   * @brief Pins a bake and drops older ones, zeroing evicted canvases.
   * Phones keep two (hold + next) so Safari does not accumulate strips.
   * @param key Moon key.
   * @param tex Fresh bake.
   */
  const keepTexture = (key: string, tex: SphereTexture) => {
    const moonProtect = textureProtectKeys();
    rememberHiRes(
      texturesHiRef.current,
      key,
      tex,
      mobile ? MOBILE_TEXTURE_KEEP : 4,
      (evicted) => {
        const canvas = canvasRefs.current.get(evicted);
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
          canvas.style.opacity = "0";
          canvas.parentElement?.removeAttribute("data-art");
        }
        warpPhases.current.delete(evicted);
      },
      moonProtect
    );
    if (mobile) {
      trimSphereTextureCache(
        MOBILE_TEXTURE_KEEP,
        textureCacheProtectKeys(moonProtect, bodies, mobile)
      );
    }
  };

  // Desktop pre-bakes the first two stops. Phones wait for the rAF
  // window (focus + next only) so Play does not decode a pile at once.
  useEffect(() => {
    if (liteTour || mobile) return;
    const byKey = new Map(bodies.map((body) => [body.key, body]));
    const upcoming = credits
      .filter((credit) => !credit.sun)
      .slice(0, 2)
      .map((credit) => credit.key);
    for (const key of upcoming) {
      const body = byKey.get(key);
      const wrap = body ? moonWrapUrl(body, mobile) : "";
      if (!body || !wrap || texturesHiRef.current.has(body.key)) continue;
      void loadSphereTexture(wrap, body.texSizeHi, moonWrapBakeOpts(body)).then(
        (tex) => {
          if (!mountedRef.current) return;
          if (!tex) {
            console.warn(
              `[hero] texture for ${body.key} fell back to an untextured sphere — image host may lack CORS headers.`
            );
            return;
          }
          keepTexture(body.key, tex);
          warpPhases.current.delete(body.key);
        }
      );
    }
  }, [bodies, credits, mobile, liteTour]);

  useEffect(() => {
    // Phones keep the CSS poster only — a second 160px sun bake was
    // still enough extra canvas to trip Safari's memory watchdog.
    if (liteTour || mobile) return;
    const size = sunBakePx(false, heroBakeDpr());
    void loadSphereTexture(
      optimizedImageUrl(CYMASPHERE_SUN_SPHERE, size),
      size,
      { surfaceShade: false }
    ).then((tex) => {
      if (!mountedRef.current || !tex) return;
      sunTexRef.current = tex;
    });
  }, [mobile, liteTour]);

  const creditsByKey = useMemo(
    () => new Map(credits.map((credit) => [credit.key, credit])),
    [credits]
  );
  const bodyIndexByKey = useMemo(
    () => new Map(bodies.map((body, i) => [body.key, i])),
    [bodies]
  );

  // rAF reads these every frame so the loop is not torn down (and the
  // camera clock reset) when the homepage catalog arrives.
  const tourLive = useRef({
    credits,
    bodies,
    system,
    bodyIndexByKey,
    creditsByKey,
    frameSize,
    bakePx,
    mobile,
    liteTour,
  });
  tourLive.current = {
    credits,
    bodies,
    system,
    bodyIndexByKey,
    creditsByKey,
    frameSize,
    bakePx,
    mobile,
    liteTour,
  };

  useEffect(() => {
    let raf = 0;

    // Every moon keeps its day-length spin; featured moons add a faint
    // extra turntable so a close-up still creeps instead of freezing.
    const spinPhase = (
      body: (typeof bodies)[number],
      elapsed: number,
      featured: boolean
    ) => {
      if (reducedMotion) return 0;
      return moonSpinPhase(
        elapsed,
        body.spinDur,
        body.spinRev,
        featured,
        spinBoost.current.get(body.key) ?? 0,
        faceAlign.current.get(body.key) ?? 0
      );
    };
    // Re-warp a moon's canvas only when its spin has advanced enough to
    // move the texture ~a fifth of a pixel; at day-length spin speeds even
    // the focused moon only needs a warp every few frames.
    const warpBody = (
      body: (typeof bodies)[number],
      elapsed: number,
      threshold: number,
      featured: boolean
    ) => {
      // Art is focus-only: a moon without a hi-res bake stays a generic
      // tinted sphere (its canvas remains transparent).
      if (tourLive.current.liteTour) return false;
      const tex = texturesHiRef.current.get(body.key);
      const canvas = canvasRefs.current.get(body.key);
      if (!tex || !canvas) return false;
      const ph = spinPhase(body, elapsed, featured);
      const last = warpPhases.current.get(body.key);
      if (last !== undefined) {
        const raw = Math.abs(ph - last);
        if (Math.min(raw, 1 - raw) < threshold) return false;
      }
      // GPU blit path; the per-pixel CPU warp only runs as a fallback.
      if (!warpStripToCanvasGpu(tex, ph, canvas)) {
        warpStripToCanvas(
          tex,
          getWarpLUT(tex.strip.height),
          ph,
          canvas,
          "bilinear"
        );
      }
      warpPhases.current.set(body.key, ph);
      // First paint fades the art in over the generic sphere.
      if (canvas.style.opacity !== "1") {
        canvas.style.opacity = "1";
        canvas.parentElement?.setAttribute("data-art", "true");
      }
      return true;
    };

    /**
     * @brief Pins a bake from rAF using the live mobile flag.
     * @param key Moon key.
     * @param tex Fresh bake.
     */
    const pinTexture = (key: string, tex: SphereTexture) => {
      const compact = tourLive.current.mobile;
      const moonProtect = textureProtectKeys();
      rememberHiRes(
        texturesHiRef.current,
        key,
        tex,
        compact ? MOBILE_TEXTURE_KEEP : 4,
        (evicted) => {
          const canvas = canvasRefs.current.get(evicted);
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
            canvas.style.opacity = "0";
            canvas.parentElement?.removeAttribute("data-art");
          }
          warpPhases.current.delete(evicted);
        },
        moonProtect
      );
      if (compact) {
        trimSphereTextureCache(
          MOBILE_TEXTURE_KEEP,
          textureCacheProtectKeys(
            moonProtect,
            tourLive.current.bodies,
            compact
          )
        );
      }
    };

    let frameNo = 0;
    // Reused across frames (recreated only when the effect re-runs);
    // entries are mutated in place so steady state allocates nothing.
    const worldPos = new Map<
      string,
      { x: number; height: number; z: number }
    >();
    let lastCreditCss = "";
    let lastCreditCopy = "";
    let lastSunPhase: number | undefined;
    let ringFade = 1;
    const tick = (now: number) => {
      try {
      if (pageHiddenRef.current) {
        tourWasPausedRef.current = true;
        lastFrameAt.current = now;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (!heroOnScreenRef.current) {
        tourWasPausedRef.current = true;
        lastFrameAt.current = now;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      // Phones draw at ~15fps. Skip without touching lastFrameAt so
      // the next drawn frame gets a real dt. Still rAF, not setTimeout
      // — a throttled timer looked like a pause and froze the tour.
      if (
        tourLive.current.mobile &&
        lastFrameAt.current != null &&
        now - lastFrameAt.current < MOBILE_FRAME_MIN_MS
      ) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      frameNo += 1;
      const {
        credits,
        bodies,
        system,
        bodyIndexByKey,
        creditsByKey,
        frameSize,
        bakePx,
        mobile,
        liteTour: skipCanvas,
      } = tourLive.current;
      if (creditLenRef.current !== credits.length) {
        const prevLen = creditLenRef.current;
        creditLenRef.current = credits.length;
        // Growing the list (homepage catalog fetch) used to rewind the
        // fly-in to t=0 — a hard snap from mid-approach back to the
        // far galaxy. Keep the clock; only reset if the tour is new
        // or the list shrank.
        if (startedAt.current == null || credits.length < prevLen) {
          startedAt.current = now;
        }
      }
      if (startedAt.current == null) startedAt.current = now;
      // Resume after a tab hide or scroll-away pause without jumping the
      // tour clock. Slow draws while on-screen do not shift the epoch.
      const gap = lastFrameAt.current == null ? 16 : now - lastFrameAt.current;
      if (tourWasPausedRef.current) {
        startedAt.current += gap;
        tourWasPausedRef.current = false;
      }
      lastFrameAt.current = now;
      const gapClamped = Math.min(64, Math.max(8, gap));
      const ease = 1 - Math.exp(-gapClamped / 140);
      // Sustained slow frames latch low-detail mode: blur (the top paint
      // cost) is dropped for the rest of the session on this device.
      frameEma.current += (gapClamped - frameEma.current) * 0.05;
      if (!FRAME.lowDetail && frameNo > 40 && frameEma.current > 22) {
        FRAME.lowDetail = true;
        containerRef.current?.setAttribute("data-low", "true");
      }
      const elapsed = now - startedAt.current;
      // Phones park after the catalog has toured once. An endless rAF +
      // warp loop is exactly what iOS Safari's energy watchdog reloads
      // pages for, and each extra loop re-bakes every product texture.
      // The tour wraps to the opening wide shot at the loop boundary, so
      // this last frame renders that pose and then stops scheduling.
      if (
        !parkedRef.current &&
        (parkImmediatelyRef.current ||
          (mobile &&
            credits.length > 1 &&
            elapsed >= tourDurationMs(credits) * TOUR_MOBILE_MAX_LOOPS))
      ) {
        parkedRef.current = true;
      }
      const pos = stepOrbitalSystem(system, reducedMotion ? 0 : elapsed / 1000);
      for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        if (!body) continue;
        let wp = worldPos.get(body.key);
        if (!wp) {
          wp = { x: 0, height: 0, z: 0 };
          worldPos.set(body.key, wp);
        }
        wp.x = pos[i * 3];
        wp.height = pos[i * 3 + 1];
        wp.z = pos[i * 3 + 2];
      }
      const viewHalfW = (frameSize?.w ?? 1200) / 2;
      const cam = cameraTour(
        elapsed,
        reducedMotion,
        credits,
        worldPos,
        viewHalfW
      );

      const creditsTarget = cam.focusKey ? 1 : 0;
      let creditsW =
        creditsWeight.current + (creditsTarget - creditsWeight.current) * ease;
      if (Math.abs(creditsW - creditsTarget) < 0.005) creditsW = creditsTarget;
      creditsWeight.current = creditsW;

      look.current.x += (look.current.tx - look.current.x) * 0.04;
      look.current.y += (look.current.ty - look.current.y) * 0.04;
      // Holds lock the product on the optical axis — no mouse sway.
      const lookScale = 1 - creditsW;
      let camX = cam.rotateX + look.current.y * lookScale;
      let camY = cam.rotateY + look.current.x * lookScale;
      const holdingMoon = isStableMoonHold(cam, creditsW);
      const follow = camFollow.current;
      if (!follow.armed) {
        follow.x = camX;
        follow.y = camY;
        follow.z = cam.rotateZ;
        follow.tx = cam.translateX;
        follow.ty = cam.translateY;
        follow.tz = cam.translateZ;
        follow.armed = true;
      } else {
        const jump =
          Math.abs(angleDelta(follow.y, camY)) +
          Math.abs(cam.translateZ - follow.tz) / 80;
        // Moon holds track the live seat tightly. The sun hold is a
        // slow yaw — a 22ms tau here snapped the leftover fly-in lag
        // the moment Cymasphere was featured.
        const sunApproach =
          cam.focusKey === SUN_FOCUS_KEY ||
          (cam.focusKey == null && cam.nextKey === SUN_FOCUS_KEY);
        // Holds snap: a 22ms chase of the live Kepler seat plus 0.01px
        // CSS rounding was the rumble, worse on far/small moons.
        if (holdingMoon) {
          follow.x = camX;
          follow.y = camY;
          follow.z = cam.rotateZ;
          follow.tx = cam.translateX;
          follow.ty = cam.translateY;
          follow.tz = cam.translateZ;
        } else {
          const tau = sunApproach ? 320 : jump > 10 ? 32 : 150;
          const followK = 1 - Math.exp(-gapClamped / tau);
          follow.x += angleDelta(follow.x, camX) * followK;
          follow.y += angleDelta(follow.y, camY) * followK;
          follow.z += angleDelta(follow.z, cam.rotateZ) * followK;
          follow.tx += (cam.translateX - follow.tx) * followK;
          follow.ty += (cam.translateY - follow.ty) * followK;
          follow.tz += (cam.translateZ - follow.tz) * followK;
          camX = follow.x;
          camY = follow.y;
        }
      }
      if (sceneRef.current) {
        sceneRef.current.style.transform = tourSceneCss({
          rotateX: camX,
          rotateY: camY,
          rotateZ: follow.z,
          translateX: follow.tx,
          translateY: follow.ty,
          translateZ: follow.tz,
        });
      }
      if (skyRef.current) {
        skyRef.current.style.transform = skyCss(
          skyParallaxCss(follow.tz, camX, camY)
        );
      }
      if (sunRef.current) {
        // Billboard the sun too so its face never goes edge-on under yaw.
        sunRef.current.style.transform = tourSunCss({
          rotateX: camX,
          rotateY: camY,
          rotateZ: follow.z,
          sunScale: cam.sunScale,
        });
      }
      const sunFeatured = cam.focusKey === SUN_FOCUS_KEY;
      const hideRings =
        sunFeatured ||
        (cam.focusKey == null && cam.nextKey === SUN_FOCUS_KEY);
      if (ringLayerRef.current) {
        const ringTarget = hideRings ? 0 : 1;
        ringFade += (ringTarget - ringFade) * (1 - Math.exp(-gapClamped / 280));
        if (Math.abs(ringFade - ringTarget) < 0.01) ringFade = ringTarget;
        ringLayerRef.current.style.opacity = ringFade.toFixed(3);
        ringLayerRef.current.style.visibility =
          ringFade < 0.02 ? "hidden" : "visible";
      }
      if (sunFeatured && !reducedMotion) {
        sunBoostRef.current =
          (sunBoostRef.current + gapClamped / FEATURED_TURNTABLE_MS) % 1;
      }
      const sunTex = sunTexRef.current;
      const sunCanvas = sunCanvasRef.current;
      if (sunTex && sunCanvas && !skipCanvas && !mobile) {
        const ph = reducedMotion
          ? 0
          : moonSpinPhase(
              elapsed,
              SUN_SPIN_SEC,
              false,
              sunFeatured,
              sunBoostRef.current,
              sunAlignRef.current
            );
        const raw =
          lastSunPhase === undefined
            ? 1
            : Math.min(
                Math.abs(ph - lastSunPhase),
                1 - Math.abs(ph - lastSunPhase)
              );
        if (raw >= 0.4 / sunTex.strip.height) {
          if (!warpStripToCanvasGpu(sunTex, ph, sunCanvas)) {
            warpStripToCanvas(
              sunTex,
              getWarpLUT(sunTex.strip.height),
              ph,
              sunCanvas,
              "bilinear"
            );
          }
          lastSunPhase = ph;
          if (sunCanvas.style.opacity !== "1") {
            sunCanvas.style.opacity = "1";
            sunFaceRef.current?.setAttribute("data-art", "true");
          }
        }
      }
      if (creditWrapRef.current) {
        // Skip the style writes when the card has not visibly changed.
        const creditCss = `${cam.creditOpacity.toFixed(3)}|${cam.creditOpacity > 0.2}`;
        if (creditCss !== lastCreditCss) {
          lastCreditCss = creditCss;
          creditWrapRef.current.style.opacity = cam.creditOpacity.toFixed(3);
          creditWrapRef.current.style.pointerEvents =
            cam.creditOpacity > 0.2 ? "auto" : "none";
        }
      }
      const facePair = `${cam.focusKey ?? ""}|${cam.nextKey ?? ""}`;
      if (facePair !== facedKeys.current) {
        facedKeys.current = facePair;
        const latchFaceOn = (key: string | null) => {
          if (!key) return;
          const idx = bodyIndexByKey.get(key);
          const body = idx === undefined ? undefined : bodies[idx];
          if (!body) return;
          faceAlign.current.set(
            body.key,
            faceOnAlign(elapsed, body.spinDur, body.spinRev)
          );
          spinBoost.current.set(body.key, 0);
          warpPhases.current.delete(body.key);
        };
        latchFaceOn(cam.focusKey);
        latchFaceOn(cam.nextKey);
        // Cymasphere is on camera the whole fly-in. Face-on-resetting
        // its wrap when the hold starts snapped the mark.
      }
      const focused = cam.focusKey
        ? creditsByKey.get(cam.focusKey)
        : cam.nextKey
          ? creditsByKey.get(cam.nextKey)
          : undefined;
      if (focused && lastCreditKey.current !== focused.key) {
        lastCreditKey.current = focused.key;
        const focusedIdx = bodyIndexByKey.get(focused.key);
        const focusedBody =
          focusedIdx === undefined ? undefined : bodies[focusedIdx];
        const prefetchHi = (body?: (typeof bodies)[number]) => {
          if (skipCanvas) return;
          const wrap = body ? moonWrapUrl(body, mobile) : "";
          if (!body || !wrap || texturesHiRef.current.has(body.key)) return;
          void loadSphereTexture(
            wrap,
            body.texSizeHi,
            moonWrapBakeOpts(body)
          ).then((tex) => {
            if (!tex || !mountedRef.current) return;
            pinTexture(body.key, tex);
            warpPhases.current.delete(body.key);
          });
        };
        prefetchHi(focusedBody);
        const nextIdx = cam.nextKey
          ? bodyIndexByKey.get(cam.nextKey)
          : undefined;
        prefetchHi(
          nextIdx === undefined ? undefined : bodies[nextIdx]
        );
      }
      if (focused) {
        const role = focused.subtitle || "";
        const sunCredit = Boolean(focused.sun);
        const focusedIdx = bodyIndexByKey.get(focused.key);
        const focusedBody =
          focusedIdx === undefined ? undefined : bodies[focusedIdx];
        const synthCredit = focusedBody?.synth === true;
        const thumbSrc = sunCredit
          ? optimizedImageUrl(CYMASPHERE_APP_ICON, 128)
          : synthCredit
            ? optimizedImageUrl(CYMASYNTH_MARK, 128)
            : focused.image
              ? optimizedImageUrl(focused.image, 128)
              : "";
        const blurb = featuredProductBlurb(focused, synthCredit);
        const copySide =
          sunCredit || holdFrameOffset(focused.key, viewHalfW).x > 0
            ? "left"
            : "right";
        const copyKey = `${focused.key}|${focused.name}|${role}|${focused.price ?? ""}|${thumbSrc}|${blurb}|${copySide}`;
        if (copyKey !== lastCreditCopy) {
          lastCreditCopy = copyKey;
          if (creditWrapRef.current) {
            creditWrapRef.current.dataset.side = copySide;
          }
          if (creditLinkRef.current && focused.slug) {
            creditLinkRef.current.href = `/product/${focused.slug}`;
            creditLinkRef.current.setAttribute(
              "aria-label",
              `Open ${focused.name}`
            );
          }
          if (creditNameRef.current) {
            creditNameRef.current.textContent = focused.name;
          }
          if (creditRoleRef.current) {
            creditRoleRef.current.textContent = role;
            creditRoleRef.current.style.display = role ? "" : "none";
          }
          if (creditPriceRef.current) {
            creditPriceRef.current.textContent = focused.price ?? "";
          }
          if (creditDescRef.current) {
            creditDescRef.current.textContent = blurb;
            creditDescRef.current.style.display = blurb ? "" : "none";
          }
          if (creditThumbRef.current) {
            creditThumbRef.current.dataset.sun = sunCredit ? "true" : "false";
            if (thumbSrc) {
              creditThumbRef.current.src = thumbSrc;
              creditThumbRef.current.style.display = "";
            } else {
              creditThumbRef.current.removeAttribute("src");
              creditThumbRef.current.style.display = "none";
            }
          }
        }
      }

      FRAME.dollyZ = follow.tz;
      FRAME.camX = camX;
      FRAME.camY = camY;
      FRAME.camZ = follow.z;
      FRAME.creditsW = creditsW;
      FRAME.viewHalfW = viewHalfW;

      const yawRad = (camY * Math.PI) / 180;
      const cosYaw = Math.cos(yawRad);
      const sinYaw = Math.sin(yawRad);
      const hideSynth = hideSynthForSunApproach(
        cam.focusKey,
        cam.nextKey,
        cam.creditOpacity
      );
      const sunFocus = cam.focusKey === SUN_FOCUS_KEY;
      let visible: string[];
      if (mobile) {
        visible = mobileStageKeys(cam.focusKey, cam.nextKey, sunFocus);
        if (hideSynth) {
          const synthKey = bodies.find((body) => body.synth)?.key;
          if (synthKey) visible = visible.filter((key) => key !== synthKey);
        }
      } else {
        const pool = candidatePool.current;
        if (pool.length !== bodies.length) pool.length = bodies.length;
        for (let i = 0; i < bodies.length; i += 1) {
          const body = bodies[i];
          if (!body) continue;
          const wx = pos[i * 3];
          const wz = pos[i * 3 + 2];
          const slot = pool[i] ?? {
            key: "",
            camSpaceX: 0,
            camSpaceZ: 0,
            aPx: 0,
          };
          slot.key = body.key;
          slot.synth = body.synth;
          slot.camSpaceX = wx * cosYaw + wz * sinYaw;
          slot.camSpaceZ = wz * cosYaw - wx * sinYaw;
          slot.aPx = system.a[i];
          pool[i] = slot;
        }
        visible = pickVisibleMoons(pool, {
          focusKey: cam.focusKey,
          nextKey: cam.nextKey,
          sunFocus,
          dollyZ: cam.translateZ,
          viewHalfW: FRAME.viewHalfW,
          budget: VISIBLE_MOON_BUDGET,
          previous: liveKeysRef.current,
          hideSynth,
        });
      }
      const forced = `${cam.focusKey ?? ""}|${cam.nextKey ?? ""}`;
      const forcedChanged = forced !== liveForced.current;
      const stale = now - livePickAt.current > 180;
      if (mobile) {
        liveForced.current = forced;
        livePickAt.current = now;
        liveKeysRef.current = visible;
      } else if (
        (forcedChanged || stale) &&
        (visible.length !== liveKeysRef.current.length ||
          visible.some((key) => !liveKeysRef.current.includes(key)))
      ) {
        liveForced.current = forced;
        livePickAt.current = now;
        liveKeysRef.current = visible;
      }
      const visibleSet = new Set(visible);
      if (cam.focusKey !== SUN_FOCUS_KEY) {
        for (const key of visible) lingerAt.current.set(key, now);
      } else if (!mobile) {
        // Desktop: keep the last moons mounted (hidden) so leaving
        // Cymasphere does not remount generic spheres and flash.
        lingerAt.current.forEach((_, key) => lingerAt.current.set(key, now));
      }
      if (hideSynth) {
        const synthKey = bodies.find((body) => body.synth)?.key;
        if (synthKey) lingerAt.current.delete(synthKey);
      }
      const lingerMs = mobile ? MOBILE_STAGE_LINGER_MS : 2500;
      const nextStage: string[] = [];
      lingerAt.current.forEach((seen, key) => {
        if (now - seen < lingerMs) nextStage.push(key);
        else lingerAt.current.delete(key);
      });
      if (
        nextStage.length !== stageKeysRef.current.length ||
        nextStage.some((key) => !stageKeysRef.current.includes(key))
      ) {
        stageKeysRef.current = nextStage;
        setStageKeys(nextStage);
      }
      moonRefs.current.forEach((el, key) => {
        if (visibleSet.has(key)) return;
        if (lastVisible.get(el) !== false) {
          lastVisible.set(el, false);
          el.style.visibility = "hidden";
          el.style.opacity = "0";
        }
      });
      for (let v = 0; v < visible.length; v += 1) {
        const i = bodyIndexByKey.get(visible[v]);
        if (i === undefined) continue;
        const body = bodies[i];
        if (!body) continue;
        const el = moonRefs.current.get(body.key);
        if (!el) continue;
        const isFocusKey = body.key === cam.focusKey;
        const worldD = Math.max(body.seat.size.w, body.seat.size.h);
        const hiTex = isFocusKey
          ? texturesHiRef.current.get(body.key)
          : undefined;
        setMoonBitmapSize(
          el,
          hiTex ? (mobile ? MOON_FOCUS_CSS_PX_MOBILE : MOON_FOCUS_CSS_PX) : worldD
        );
        const wx = pos[i * 3];
        const wh = pos[i * 3 + 1];
        const wz = pos[i * 3 + 2];
        const zc = wz * cosYaw - wx * sinYaw;
        const focusTarget = isFocusKey ? 1 : 0;
        let focusW =
          (focusWeights.current.get(body.key) ?? 0) * (1 - ease) +
          focusTarget * ease;
        if (Math.abs(focusW - focusTarget) < 0.005) focusW = focusTarget;
        focusWeights.current.set(body.key, focusW);
        if (focusW > 0.001 && !reducedMotion) {
          // Featured moons keep a slow display turn (~48s/rev extra).
          spinBoost.current.set(
            body.key,
            ((spinBoost.current.get(body.key) ?? 0) +
              (focusW * gapClamped) / FEATURED_TURNTABLE_MS) %
              1
          );
        }
        visualRByKey.current.set(
          body.key,
          poseMoon(
            el,
            wx,
            wh,
            wz,
            wx * cosYaw + wz * sinYaw,
            zc,
            system.a[i],
            Math.max(body.seat.size.w, body.seat.size.h),
            focusW
          )
        );
      }

      const synthBody = bodies.find((body) => body.synth);
      const ringsEl = synthRingsRef.current;
      if (synthBody && ringsEl && !mobile) {
        const si = bodyIndexByKey.get(synthBody.key);
        if (si !== undefined) {
          const synthEl = moonRefs.current.get(synthBody.key);
          const moonOnCamera =
            !!synthEl &&
            visibleSet.has(synthBody.key) &&
            lastVisible.get(synthEl) === true;
          const moonOpacity = moonOnCamera
            ? Number(synthEl.style.opacity || "0")
            : 0;
          const visualR =
            visualRByKey.current.get(synthBody.key) ??
            Math.max(synthBody.seat.size.w, synthBody.seat.size.h) / 2;
          poseSynthOscRings(
            ringsEl,
            pos[si * 3],
            pos[si * 3 + 1],
            pos[si * 3 + 2],
            visualR * 2,
            reducedMotion ? 0 : (elapsed / 90) % 360,
            moonOpacity,
            synthEl ? Number(synthEl.style.zIndex || "20") : 19,
            moonOnCamera && moonOpacity > 0.08,
            mobile
          );
        }
      }

      const ringCirc = 2 * Math.PI * ORBIT_RING_LOCAL_R;
      if (!mobile) ringCircleRefs.current.forEach((circle, r) => {
        const gaps: { angle: number; half: number }[] = [];
        let ex: [number, number, number] | undefined;
        let ey: [number, number, number] | undefined;
        for (let i = 0; i < system.count; i += 1) {
          if (Math.round(system.a[i]) !== Math.round(r)) continue;
          if (!ex || !ey) {
            const basis = orbitRingBasisCss(
              system.sinNode[i],
              system.cosNode[i],
              system.sinI[i],
              system.cosI[i]
            );
            ex = basis.ex;
            ey = basis.ey;
          }
          const body = bodies[i];
          const visualR =
            visualRByKey.current.get(body.key) ??
            Math.max(body.seat.size.w, body.seat.size.h) / 2;
          gaps.push({
            angle: orbitRingAngleCss(
              pos[i * 3],
              -pos[i * 3 + 1],
              pos[i * 3 + 2],
              ex,
              ey
            ),
            half: orbitRingGapHalf(visualR, system.a[i]),
          });
        }
        const dash = orbitRingDash(ringCirc, gaps).dasharray;
        if (lastRingDash.current.get(r) === dash) return;
        lastRingDash.current.set(r, dash);
        circle.setAttribute("stroke-dasharray", dash);
        circle.setAttribute("stroke-dashoffset", "0");
      });

      if (bodies.length > 0) {
        const focusedIdx = cam.focusKey
          ? bodyIndexByKey.get(cam.focusKey)
          : undefined;
        const focusedBody =
          focusedIdx === undefined ? undefined : bodies[focusedIdx];
        // Warp budget: the featured moon may re-warp every frame, but
        // ambient moons take turns — at most one per frame — so draw-call
        // bursts never stack up in a single frame.
        let ambientWarped = false;
        for (let k = 0; k < visible.length; k += 1) {
          const offset = (k + frameNo) % visible.length;
          const key = visible[offset];
          const idx = bodyIndexByKey.get(key);
          const body = idx === undefined ? undefined : bodies[idx];
          if (!body) continue;
          const featured = body === focusedBody;
          if (!featured && (mobile || ambientWarped)) continue;
          const warped = warpBody(
            body,
            elapsed,
            featured ? 0.55 / bakePx : 0.002,
            featured
          );
          if (!featured && warped) ambientWarped = true;
        }
      }

      } finally {
        if (parkedRef.current) {
          // Freeze on the closing wide shot and hand the memory back:
          // strips, scratch canvases, and warp tables all release. The
          // painted moon/sun canvases keep their last frame, and links
          // stay clickable — the hero just becomes a still.
          containerRef.current?.setAttribute("data-parked", "true");
          texturesHiRef.current.clear();
          sunTexRef.current = null;
          releaseAllSphereTextureResources();
        } else {
          raf = window.requestAnimationFrame(tick);
        }
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const ringRadii = useMemo(() => {
    const seen = new Set<number>();
    const rings: { r: number; matrix: string }[] = [];
    for (let i = 0; i < system.count; i += 1) {
      const r = Math.round(system.a[i]);
      if (seen.has(r)) continue;
      seen.add(r);
      rings.push({
        r: system.a[i],
        matrix: orbitRingMatrix3d(
          system.a[i],
          system.sinNode[i],
          system.cosNode[i],
          system.sinI[i],
          system.cosI[i],
          ORBIT_RING_LOCAL_R
        ),
      });
    }
    return rings.sort((a, b) => a.r - b.r);
  }, [system]);

  // Static background JSX is memoized so state changes (stage picks,
  // texture arrivals, resizes) reconcile the same element references and
  // React skips these subtrees entirely.
  const starField = useMemo(() => {
    const rand = mulberry32(77);
    /**
     * @brief Builds one parallax star plane as a box-shadow list.
     * @param count Stars on this sheet.
     * @param halfW Horizontal spread in px (sheet is centered).
     * @param halfH Vertical spread in px.
     * @param z Sheet depth; nearer sheets slide more per camera move.
     * @param bright Base alpha; nearer sheets are brighter and bigger.
     */
    const sheet = (
      count: number,
      halfW: number,
      halfH: number,
      z: number,
      bright: number
    ) => {
      const shadows: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const x = Math.round((rand() * 2 - 1) * halfW);
        const y = Math.round((rand() * 2 - 1) * halfH);
        const spread = rand() < 0.78 ? 0 : rand() < 0.9 ? 1 : 2;
        const a = (bright * (0.35 + rand() * 0.65)).toFixed(2);
        shadows.push(`${x}px ${y}px 0 ${spread}px rgba(255, 255, 255, ${a})`);
      }
      return { z, boxShadow: shadows.join(", ") };
    };
    // Far sheets are wide so the sky still fills the frame when the
    // camera dollies out or yaws across the system.
    // Shadows stay static; Sky's transform is what zooms/slides them.
    const sheets = mobile
      ? [sheet(20, 900, 700, 0, 0.5)]
      : [sheet(120, 1800, 1100, 0, 0.62)];
    return sheets.map((s, i) => (
      <StarSheet
        key={i}
        style={{
          transform: "translate(-50%, -50%)",
          boxShadow: s.boxShadow,
        }}
      />
    ));
  }, [mobile]);

  const ringField = useMemo(
    () =>
      ringRadii.map((ring, i) => (
        <OrbitRing
          key={ring.r}
          $r={ring.r}
          $matrix={ring.matrix}
          $alpha={Math.max(0.16, 0.38 - i * 0.035)}
          viewBox={`0 0 ${ORBIT_RING_BASE_PX} ${ORBIT_RING_BASE_PX}`}
          aria-hidden
        >
          <circle
            ref={(el: SVGCircleElement | null) => {
              if (el) ringCircleRefs.current.set(ring.r, el);
              else ringCircleRefs.current.delete(ring.r);
            }}
            cx={ORBIT_RING_BASE_PX / 2}
            cy={ORBIT_RING_BASE_PX / 2}
            r={ORBIT_RING_LOCAL_R}
          />
        </OrbitRing>
      )),
    [ringRadii]
  );

  // Rebuilt only when the staged set changes; every other re-render
  // reuses the same elements so mounted moons are untouched. Moons fly
  // as generic tinted spheres — a remount re-applies cached art at once
  // when this moon was recently featured (canvas repaints from the
  // hi-res bake, no fade).
  const moonField = useMemo(
    () =>
      bodies
        .filter((body) => stageKeys.includes(body.key))
        .map((body) => {
          const MoonTag = body.synth ? SynthMoon : Moon;
          const initials = body.node.name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("");
          return (
            <MoonTag
              key={body.key}
              href={`/product/${body.node.slug}`}
              aria-label={body.node.name}
              ref={(el) => {
                if (el) {
                  moonRefs.current.set(body.key, el);
                  if (!lastMoonCss.has(el)) {
                    setMoonBitmapSize(el, body.seat.size.w);
                  }
                } else moonRefs.current.delete(body.key);
              }}
            >
              {body.node.image ? (
                liteTour ? (
                  <img
                    src={optimizedImageUrl(
                      body.synth ? CYMASYNTH_SPHERE : body.node.image,
                      128
                    )}
                    alt=""
                    width={128}
                    height={128}
                    decoding="async"
                    draggable={false}
                    style={{
                      position: "absolute",
                      inset: "8%",
                      width: "84%",
                      height: "84%",
                      borderRadius: "50%",
                      objectFit: "cover",
                      opacity: 0.92,
                    }}
                  />
                ) : (
                <TexCanvas
                  ref={(el: HTMLCanvasElement | null) => {
                    if (el) {
                      canvasRefs.current.set(body.key, el);
                      const tex = texturesHiRef.current.get(body.key);
                      if (tex) {
                        const ph = warpPhases.current.get(body.key) ?? 0;
                        if (!warpStripToCanvasGpu(tex, ph, el)) {
                          warpStripToCanvas(
                            tex,
                            getWarpLUT(tex.strip.height),
                            ph,
                            el,
                            "bilinear"
                          );
                        }
                        warpPhases.current.set(body.key, ph);
                        el.style.opacity = "1";
                        el.parentElement?.setAttribute("data-art", "true");
                      }
                    } else {
                      canvasRefs.current.delete(body.key);
                    }
                  }}
                />
                )
              ) : (
                <span>{initials}</span>
              )}
            </MoonTag>
          );
        }),
    [bodies, stageKeys, liteTour]
  );

  return (
    <Board ref={containerRef}>
      <Sky ref={skyRef}>
        {starField}
        {!mobile ? (
          <>
            <NebulaViolet $x={28} $y={38} $w={58} $h={48} />
            <NebulaGold $x={62} $y={52} $w={50} $h={42} />
            <NebulaTeal $x={48} $y={46} $w={44} $h={36} />
          </>
        ) : null}
      </Sky>
      <Scene ref={sceneRef}>
        <RingLayer ref={ringLayerRef}>{mobile ? null : ringField}</RingLayer>
        <BodyLayer>
          {cymasynth && !mobile ? (
            <SynthRingPlate
              ref={synthRingsRef}
              data-compact={mobile ? "true" : undefined}
              aria-hidden
            >
              {SYNTH_OSC_PATHS.map((ring) => (
                <SynthRingDisk
                  key={`${ring.cycles}-${ring.radius}`}
                  $tiltX={ring.tiltX}
                  $tiltZ={ring.tiltZ}
                >
                  <SynthRingSvg viewBox="0 0 240 240" aria-hidden>
                    <SynthOscPath
                      className="synth-osc"
                      d={ring.d}
                      $dur={ring.duration}
                    />
                  </SynthRingSvg>
                </SynthRingDisk>
              ))}
            </SynthRingPlate>
          ) : null}
          {moonField}

          <SunWrap ref={sunRef}>
            {!mobile ? (
              <>
                <SunNebulaViolet />
                <SunNebulaGold />
                <SunCorona />
                <SunFlare />
              </>
            ) : null}
            <SunCore
              href="/product/cymasphere"
              className="hero-sun"
              aria-label="Cymasphere"
            >
              <SunFace ref={sunFaceRef}>
                <SunMark
                  src={CYMASPHERE_SUN_SPHERE_POSTER}
                  alt=""
                  fetchPriority="low"
                  decoding="async"
                />
                {!mobile ? (
                  <TexCanvas
                    ref={(el: HTMLCanvasElement | null) => {
                      sunCanvasRef.current = el;
                    }}
                  />
                ) : null}
              </SunFace>
            </SunCore>
          </SunWrap>
        </BodyLayer>
      </Scene>
      <Vignette />
      <CreditSlot ref={creditWrapRef}>
        <CreditCard
          ref={creditLinkRef}
          href="/product/cymasphere"
          aria-label="Open featured product"
        >
          <CreditThumb ref={creditThumbRef} alt="" style={{ display: "none" }} />
          <CreditText>
            <CreditRole ref={creditRoleRef} />
            <CreditName ref={creditNameRef} />
            <CreditPrice ref={creditPriceRef} />
            <CreditBlurb ref={creditDescRef} />
          </CreditText>
        </CreditCard>
      </CreditSlot>
    </Board>
  );
};

export default React.memo(CircuitNetwork);
