"use client";

/**
 * @fileoverview Cinematic tour of the Cymasphere system. The camera flies
 * in on the sun, then holds on each product like show credits. Moon motion
 * comes from the analytic Kepler system in utils/orbital-physics; every
 * body is billboarded to the camera and lit by the sun at the origin.
 * The sun uses the same spherical wrap as the moons, so its mark rolls
 * instead of sitting as a flat logo.
 * Pose is written from rAF so React does not re-render every frame.
 * @module components/sections/CircuitNetwork
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import {
  type CreditTarget,
  type MoonPlacement,
  type VisibleMoonCandidate,
  TOUR_PERSPECTIVE_PX,
  VISIBLE_MOON_BUDGET,
  VISIBLE_MOON_BUDGET_MOBILE,
  cameraTour,
  cymasynthOrbit,
  moonDiameter,
  moonPlacements,
  orbitRadiusPx,
  orderCredits,
  pickVisibleMoons,
  SUN_FOCUS_KEY,
} from "@/utils/circuit-network-layout";
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
import {
  type SphereTexture,
  getWarpLUT,
  loadSphereTexture,
  faceOnAlign,
  moonSpinPhase,
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
 * Downscaled Cymasphere planet for the hero wrap. The 4K source stays
 * on the spotlight; a 1280² JPEG is enough for the 560px sun.
 */
const CYMASPHERE_SUN_SPHERE = "/images/cymasphere-sun-sphere-hero.jpg";
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
 * @brief Close-up bake edge. Matches CSS pixels on 1× displays; 2× on
 * Retina so the wrap is not stretched (that stretch is the grain).
 * @param compact When true, bake for the mobile focus disk.
 * @returns Strip height in device pixels.
 */
function moonBakePx(compact = false): number {
  const dpr =
    typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const css = compact ? MOON_FOCUS_CSS_PX_MOBILE : MOON_FOCUS_CSS_PX;
  return Math.round(css * dpr);
}

/**
 * @brief Sun wrap bake. Matches the 560px disk at device pixels so
 * Retina does not stretch a 768 strip (that stretch is the grain).
 * @param compact When true, bake for the smaller phone sun.
 * @returns Strip height in device pixels.
 */
function sunBakePx(compact = false): number {
  const dpr =
    typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  if (compact) return dpr >= 2 ? 512 : 384;
  return dpr >= 2 ? 1120 : 560;
}

/** A product rendered as a moon. */
export interface CircuitNode {
  id: string | number;
  name: string;
  slug: string;
  /** Logo or artwork URL shown on the moon. */
  image: string;
  /** Display price, e.g. "$99". */
  price?: string;
  /** One-line subtitle for the credit card. */
  tagline?: string;
}

interface CircuitNetworkProps {
  /** Cymasphere — sun credit card (subtitle + artwork). */
  cymasphere?: CircuitNode | null;
  /** CymaSynth — closest large moon. */
  cymasynth?: CircuitNode | null;
  /** Remaining catalog products on the outer orbits. */
  nodes: CircuitNode[];
}

const Board = styled.div`
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  height: 100%;
  margin: 0 auto;
  overflow: hidden;
  perspective: ${TOUR_PERSPECTIVE_PX}px;

  /* Low-detail latch: drop decorative filters/blends so the moving
     3D scene is not re-filtering megapixel layers every frame. */
  &[data-low="true"] .sun-fx {
    animation: none !important;
    filter: none !important;
    mix-blend-mode: normal !important;
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
  top: clamp(5.75rem, 16vh, 8.5rem);
  bottom: auto;
  z-index: 40;
  max-width: min(52vw, 620px);
  pointer-events: none;
  opacity: 0;

  @media (max-width: 768px) {
    left: 4%;
    right: auto;
    top: max(4.25rem, calc(env(safe-area-inset-top, 0px) + 3.4rem));
    max-width: min(88vw, 340px);
  }
`;

const CreditCard = styled(Link)`
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

  ${CreditCard}:hover & {
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.55),
      0 0 32px rgba(255, 214, 170, 0.45);
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

const Scene = styled.div`
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform;
`;

/**
 * Screen-space dust. World-space plates go edge-on when the camera
 * yaws and read as flat discs; these sit on the board so they stay
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
  transform: translate(-50%, -50%) translateZ(2px);
  z-index: 20;
  pointer-events: none;
  transform-style: preserve-3d;
`;

const SunCore = styled(Link)`
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

  &:hover {
    box-shadow:
      0 0 64px #fff,
      0 0 130px rgba(108, 99, 255, 0.7),
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
 */
function rememberHiRes(
  map: Map<string, SphereTexture>,
  key: string,
  tex: SphereTexture
): void {
  if (map.has(key)) map.delete(key);
  map.set(key, tex);
  while (map.size > 4) {
    const oldest = map.keys().next().value;
    if (!oldest || oldest === key) break;
    map.delete(oldest);
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
    `translate3d(${x.toFixed(2)}px, ${(-height).toFixed(2)}px, ${z.toFixed(2)}px)`,
    `rotateZ(${(-FRAME.camZ).toFixed(3)}deg)`,
    `rotateY(${(-FRAME.camY).toFixed(3)}deg)`,
    `rotateX(${(-FRAME.camX).toFixed(3)}deg)`,
    // Sit the disk in front of its ring plane so the stroke cannot
    // composite over the planet even where the dash hole is tight.
    `translateZ(${(visualR + 4).toFixed(2)}px)`,
    `scale(${scale.toFixed(4)})`,
  ].join(" ");
  return visualR;
}

/**
 * @brief Renders the solar-system tour: Cymasphere as the sun, products as moons.
 * @param cymasphere Sun credit (optional until loaded).
 * @param cymasynth Closest large moon (optional until loaded).
 * @param nodes Remaining products, one per orbit seat.
 * @returns The tour scene.
 * @example
 * <CircuitNetwork cymasynth={synth} nodes={catalog} />
 */
const CircuitNetwork: React.FC<CircuitNetworkProps> = ({
  cymasphere,
  cymasynth,
  nodes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const ringLayerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
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
    x: 0,
    y: 0,
    z: 0,
    tx: 0,
    ty: 0,
    tz: 0,
    armed: false,
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
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  // Start the tour immediately. IntersectionObserver pauses it when the
  // hero leaves the viewport; if IO never fires (embedded previews), the
  // camera and credit card still run.
  const [isVisible, setIsVisible] = useState(true);
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
  const mobile = isMobile === true;

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const onResize = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onResize);
    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motionMql.matches);
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionMql.addEventListener("change", onMotion);
    return () => {
      mql.removeEventListener("change", onResize);
      motionMql.removeEventListener("change", onMotion);
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
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) {
            const r = e.boundingClientRect;
            const vh = window.innerHeight || 0;
            // Embedded previews sometimes report 0 intersection while the
            // board still fills the viewport — keep the tour running then.
            if (r.height > 8 && r.top < vh && r.bottom > 0) {
              setIsVisible(true);
              return;
            }
          }
          setIsVisible(e.isIntersecting);
        }),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const seats = useMemo(
    () => moonPlacements(nodes.length, mobile),
    [nodes.length, mobile]
  );
  const synthSeat = useMemo(() => cymasynthOrbit(mobile), [mobile]);
  const bakePx = useMemo(() => moonBakePx(mobile), [mobile]);

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
      const node = nodes[seat.index];
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
  }, [bakePx, cymasynth, nodes, seats, synthSeat, mobile]);

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
    const seed = bodies
      .slice(0, mobile ? VISIBLE_MOON_BUDGET_MOBILE : VISIBLE_MOON_BUDGET)
      .map((body) => body.key);
    liveKeysRef.current = seed;
    stageKeysRef.current = seed;
    seed.forEach((key) => lingerAt.current.set(key, 0));
    setStageKeys(seed);
  }, [bodies, mobile]);

  const credits = useMemo<CreditTarget[]>(
    () =>
      orderCredits([
        {
          key: SUN_FOCUS_KEY,
          name: cymasphere?.name || "Cymasphere",
          slug: cymasphere?.slug || "cymasphere",
          price: cymasphere?.price,
          subtitle: (cymasphere?.tagline || "").trim(),
          image: CYMASPHERE_APP_ICON,
          sun: true,
          weight: 3,
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
      ]),
    [bodies, cymasphere, system]
  );

  // Product art is deferred: moons fly as generic tinted spheres and only
  // the featured / next tour stop gets its artwork baked and warped on.
  // This pre-bakes just the first two stops so the opening holds have art
  // ready; later stops bake from the rAF prefetch as the tour advances.
  useEffect(() => {
    const byKey = new Map(bodies.map((body) => [body.key, body]));
    const upcoming = credits
      .filter((credit) => !credit.sun)
      .slice(0, 2)
      .map((credit) => credit.key);
    for (const key of upcoming) {
      const body = byKey.get(key);
      if (!body?.node.image || texturesHiRef.current.has(body.key)) continue;
      void loadSphereTexture(body.node.image, body.texSizeHi).then((tex) => {
        if (!mountedRef.current) return;
        if (!tex) {
          console.warn(
            `[hero] texture for ${body.key} fell back to an untextured sphere — image host may lack CORS headers.`
          );
          return;
        }
        rememberHiRes(texturesHiRef.current, body.key, tex);
        warpPhases.current.delete(body.key);
      });
    }
  }, [bodies, credits]);

  useEffect(() => {
    const size = sunBakePx(mobile);
    void loadSphereTexture(CYMASPHERE_SUN_SPHERE, size, {
      surfaceShade: false,
    }).then((tex) => {
      if (!mountedRef.current || !tex) return;
      sunTexRef.current = tex;
    });
  }, [mobile]);

  const creditsByKey = useMemo(
    () => new Map(credits.map((credit) => [credit.key, credit])),
    [credits]
  );
  const bodyIndexByKey = useMemo(
    () => new Map(bodies.map((body, i) => [body.key, i])),
    [bodies]
  );

  useEffect(() => {
    if (!isVisible) return;
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
    let lastRingsHidden = false;
    const tick = (now: number) => {
      try {
      frameNo += 1;
      if (creditLenRef.current !== credits.length) {
        creditLenRef.current = credits.length;
        startedAt.current = now;
      }
      if (startedAt.current == null) startedAt.current = now;
      // Frame gap: rAF stopped (scrolled away / hidden tab). Shift the
      // epoch so the tour resumes where it paused instead of jumping.
      const gap = lastFrameAt.current == null ? 16 : now - lastFrameAt.current;
      if (gap > 400) startedAt.current += gap;
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
          Math.abs(camY - follow.y) + Math.abs(cam.translateZ - follow.tz) / 80;
        // Holds track the live moon tightly. A long tau left the disk
        // chasing the camera by a few magnified pixels every frame.
        const tau = creditsW > 0.65 ? 22 : jump > 10 ? 32 : 150;
        const followK = 1 - Math.exp(-gapClamped / tau);
        follow.x += (camX - follow.x) * followK;
        follow.y += (camY - follow.y) * followK;
        follow.z += (cam.rotateZ - follow.z) * followK;
        follow.tx += (cam.translateX - follow.tx) * followK;
        follow.ty += (cam.translateY - follow.ty) * followK;
        follow.tz += (cam.translateZ - follow.tz) * followK;
        camX = follow.x;
        camY = follow.y;
      }
      if (sceneRef.current) {
        sceneRef.current.style.transform = [
          `translate3d(${follow.tx.toFixed(2)}px, ${follow.ty.toFixed(2)}px, ${follow.tz.toFixed(2)}px)`,
          `rotateX(${camX.toFixed(3)}deg)`,
          `rotateY(${camY.toFixed(3)}deg)`,
          `rotateZ(${follow.z.toFixed(3)}deg)`,
        ].join(" ");
      }
      if (sunRef.current) {
        // Billboard the sun too so its face never goes edge-on under yaw.
        sunRef.current.style.transform = [
          "translate(-50%, -50%)",
          "translateZ(2px)",
          `rotateZ(${(-follow.z).toFixed(3)}deg)`,
          `rotateY(${(-camY).toFixed(3)}deg)`,
          `rotateX(${(-camX).toFixed(3)}deg)`,
          `scale(${cam.sunScale.toFixed(3)})`,
        ].join(" ");
      }
      const sunFeatured = cam.focusKey === SUN_FOCUS_KEY;
      const hideRings =
        sunFeatured ||
        (cam.focusKey == null && cam.nextKey === SUN_FOCUS_KEY);
      if (ringLayerRef.current && hideRings !== lastRingsHidden) {
        lastRingsHidden = hideRings;
        ringLayerRef.current.style.opacity = hideRings ? "0" : "1";
        ringLayerRef.current.style.visibility = hideRings ? "hidden" : "visible";
      }
      if (sunFeatured && !reducedMotion) {
        sunBoostRef.current =
          (sunBoostRef.current + gapClamped / FEATURED_TURNTABLE_MS) % 1;
      }
      const sunTex = sunTexRef.current;
      const sunCanvas = sunCanvasRef.current;
      if (sunTex && sunCanvas) {
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
        if (cam.focusKey === SUN_FOCUS_KEY) {
          sunAlignRef.current = faceOnAlign(elapsed, SUN_SPIN_SEC, false);
          sunBoostRef.current = 0;
          lastSunPhase = undefined;
        }
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
          if (!body?.node.image || texturesHiRef.current.has(body.key)) return;
          void loadSphereTexture(body.node.image, body.texSizeHi).then((tex) => {
            if (!tex) return;
            rememberHiRes(texturesHiRef.current, body.key, tex);
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
        const thumbSrc = sunCredit ? CYMASPHERE_APP_ICON : focused.image || "";
        const copyKey = `${focused.key}|${focused.name}|${role}|${focused.price ?? ""}|${thumbSrc}`;
        if (copyKey !== lastCreditCopy) {
          lastCreditCopy = copyKey;
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
      const visible = pickVisibleMoons(pool, {
        focusKey: cam.focusKey,
        nextKey: cam.nextKey,
        sunFocus: cam.focusKey === SUN_FOCUS_KEY,
        dollyZ: cam.translateZ,
        viewHalfW: FRAME.viewHalfW,
        budget: mobile ? VISIBLE_MOON_BUDGET_MOBILE : VISIBLE_MOON_BUDGET,
        previous: liveKeysRef.current,
      });
      const forced = `${cam.focusKey ?? ""}|${cam.nextKey ?? ""}`;
      const forcedChanged = forced !== liveForced.current;
      const stale = now - livePickAt.current > 180;
      if (
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
      } else {
        // Keep the last moons mounted (hidden) so leaving Cymasphere
        // does not remount generic spheres and flash.
        lingerAt.current.forEach((_, key) => lingerAt.current.set(key, now));
      }
      const nextStage: string[] = [];
      lingerAt.current.forEach((seen, key) => {
        if (now - seen < 2500) nextStage.push(key);
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

      const ringCirc = 2 * Math.PI * ORBIT_RING_LOCAL_R;
      ringCircleRefs.current.forEach((circle, r) => {
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
          if (!featured && ambientWarped) continue;
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
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [
    bodies,
    bodyIndexByKey,
    credits,
    creditsByKey,
    frameSize,
    isVisible,
    mobile,
    reducedMotion,
    bakePx,
    system,
  ]);

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
    // One static sheet on the board (not inside the moving Scene) so
    // the camera does not re-composite hundreds of shadows every frame.
    const sheets = mobile
      ? [sheet(70, 1400, 900, 0, 0.62)]
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
              ) : (
                <span>{initials}</span>
              )}
            </MoonTag>
          );
        }),
    [bodies, stageKeys]
  );

  return (
    <Board ref={containerRef}>
      {starField}
      <NebulaViolet $x={28} $y={38} $w={58} $h={48} />
      <NebulaGold $x={62} $y={52} $w={50} $h={42} />
      <NebulaTeal $x={48} $y={46} $w={44} $h={36} />
      <Scene ref={sceneRef}>
        <RingLayer ref={ringLayerRef}>{ringField}</RingLayer>
        <BodyLayer>
          {moonField}

          <SunWrap ref={sunRef}>
            <SunNebulaViolet />
            <SunNebulaGold />
            <SunCorona />
            <SunFlare />
            <SunCore href="/product/cymasphere" aria-label="Cymasphere">
              <SunFace ref={sunFaceRef}>
                <SunMark src={CYMASPHERE_SUN_SPHERE} alt="" />
                <TexCanvas
                  ref={(el: HTMLCanvasElement | null) => {
                    sunCanvasRef.current = el;
                  }}
                />
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
          </CreditText>
        </CreditCard>
      </CreditSlot>
    </Board>
  );
};

export default React.memo(CircuitNetwork);
