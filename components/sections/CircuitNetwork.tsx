"use client";

/**
 * @fileoverview Homepage solar-system tour: Three.js scene + HTML credits.
 * Kepler and cameraTour are unchanged; the renderer is a 1080p / 60 FPS
 * WebGL game loop. Lite / Play gating stays in EcosystemHero.
 * @module components/sections/CircuitNetwork
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import {
  type CreditTarget,
  type MoonPlacement,
  SUN_FOCUS_KEY,
  angleDelta,
  cameraTour,
  cymasynthOrbit,
  hideSynthForSunApproach,
  holdFrameOffset,
  moonDiameter,
  moonPlacements,
  orbitRadiusPx,
  creditStageKeys,
  orderCredits,
  pickVisibleMoons,
  sunScaleFromCamera,
  tourDurationMs,
  VISIBLE_MOON_BUDGET,
  type VisibleMoonCandidate,
} from "@/utils/circuit-network-layout";
import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import {
  HERO_TOUR_WATCHDOG_KEY,
  heroBoardIsOnScreen,
  heroTourMoonCap,
  heroTourStopCap,
  latchHeroCompactTour,
  mobileStageKeys,
  pickMobileTourNodes,
  previousHeroTourWasKilled,
  readHeroCompactTour,
  shouldKeepHeroFrameSize,
} from "@/utils/hero-tour";
import { logHeroDebug } from "@/utils/hero-reload-debug";
import {
  createOrbitalSystem,
  hashOrbitKey,
  stepOrbitalSystem,
} from "@/utils/orbital-physics";
import { optimizedImageUrl } from "@/utils/optimized-image-url";
import { faceOnAlign, moonSpinPhase } from "@/utils/sphere-texture";
import type { CircuitNode } from "./circuit-node";
import type { HeroBodyDef } from "@/components/hero-gl/bodies";
import { HERO_SUN_DIAMETER_PX, shouldSkipHeroFrame } from "@/components/hero-gl/caps";
import { HeroScene, heroWebglAvailable } from "@/components/hero-gl/HeroScene";

export type { CircuitNode } from "./circuit-node";

const CYMASPHERE_APP_ICON = "/images/cymasphere-app-icon.png";
const CYMASYNTH_MARK = "/images/cymasynth-mark.png";
const CYMASPHERE_SUN_POSTER = "/images/cymasphere-sun-sphere-hero.webp";
const SUN_SPIN_SEC = 80;
const SYNTH_SPIN_SEC = 56;
const MOON_SPIN_SEC_MIN = 40;
const MOON_SPIN_SEC_SPAN = 24;
const FEATURED_TURNTABLE_MS = 22000;
const TOUR_MOBILE_MAX_LOOPS = 1;

const OPENING_CAM = cameraTour(0, false);

interface CircuitNetworkProps {
  cymasphere?: CircuitNode | null;
  cymasynth?: CircuitNode | null;
  nodes: CircuitNode[];
  parkImmediately?: boolean;
  tourCap?: number;
}

function readHeroWatchdog(): string | null {
  try {
    return sessionStorage.getItem(HERO_TOUR_WATCHDOG_KEY);
  } catch {
    return null;
  }
}

function plainProductCopy(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  background: #02030a;
`;

const GlCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
  background: radial-gradient(
    ellipse at 50% 50%,
    transparent 42%,
    rgba(2, 3, 10, 0.72) 100%
  );
`;

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
      env(safe-area-inset-top, 0px) + var(--site-header-height) + 12px
    );
    transform: none;
    max-width: min(92vw, 420px);
  }
`;

const CreditCard = styled(Link)`
  display: flex;
  align-items: flex-start;
  gap: 18px;
  text-decoration: none;
  color: inherit;
  pointer-events: auto;

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

const FallbackPoster = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #02030a;
`;

const PosterSun = styled.img`
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(220px, 42vw);
  height: auto;
  transform: translate(-50%, -50%);
  border-radius: 50%;
`;

const VisuallyHidden = styled.nav`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * @brief Cinematic Three.js tour of the Cymasphere system.
 */
const CircuitNetwork: React.FC<CircuitNetworkProps> = ({
  cymasphere,
  cymasynth,
  nodes,
  parkImmediately = false,
  tourCap,
}) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HeroScene | null>(null);
  const creditWrapRef = useRef<HTMLDivElement>(null);
  const creditLinkRef = useRef<HTMLAnchorElement>(null);
  const creditRoleRef = useRef<HTMLSpanElement>(null);
  const creditNameRef = useRef<HTMLSpanElement>(null);
  const creditPriceRef = useRef<HTMLSpanElement>(null);
  const creditDescRef = useRef<HTMLParagraphElement>(null);
  const creditThumbRef = useRef<HTMLImageElement>(null);
  const lastCreditKey = useRef<string | null>(null);
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
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
  const lastDrawAt = useRef<number | null>(null);
  const lastFrameAt = useRef<number | null>(null);
  const creditsWeight = useRef(0);
  const spinBoost = useRef(new Map<string, number>());
  const faceAlign = useRef(new Map<string, number>());
  const facedKeys = useRef("");
  const candidatePool = useRef<VisibleMoonCandidate[]>([]);
  const liveKeysRef = useRef<string[]>([]);
  const keepArtSig = useRef("");
  const focusWeights = useRef(new Map<string, number>());
  const sunBoostRef = useRef(0);
  const sunAlignRef = useRef(0);
  const compactInitial =
    typeof window !== "undefined" && readHeroCompactTour(window);
  const compactLatchedRef = useRef<boolean | null>(
    typeof window !== "undefined" ? compactInitial : null
  );
  const [isMobile, setIsMobile] = useState(compactInitial);
  const heroOnScreenRef = useRef(true);
  const tourWasPausedRef = useRef(false);
  const pageHiddenRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const [webglOk, setWebglOk] = useState(true);
  const mountedRef = useRef(true);
  const parkedRef = useRef(false);
  const parkImmediatelyRef = useRef(parkImmediately);
  parkImmediatelyRef.current = parkImmediately;
  const rafRef = useRef(0);
  const startLoopRef = useRef<() => void>(() => undefined);
  const mobile = isMobile;

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
          logHeroDebug("watchdog-unclean", {
            aliveSec: rec.aliveSec ?? null,
            parked: rec.parked === true,
          });
        }
      }
    } catch {
      /* private mode */
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
      const measured = readHeroCompactTour(window);
      const { compact, ignoredFlip } = latchHeroCompactTour(
        compactLatchedRef.current,
        measured
      );
      if (ignoredFlip) {
        logHeroDebug("compact-flip-ignored", {
          latched: compactLatchedRef.current,
          measured,
          w: window.innerWidth,
          h: window.innerHeight,
        });
      }
      if (compactLatchedRef.current !== compact) {
        compactLatchedRef.current = compact;
        setIsMobile(compact);
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
      if (!pageHiddenRef.current) startLoopRef.current();
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
    logHeroDebug("circuit-mount", {
      mobile,
      moonCap: heroTourMoonCap(mobile, tourCap, !!cymasynth),
      nodes: nodes.length,
      previousKilled: previousHeroTourWasKilled(readHeroWatchdog()),
      webgl: heroWebglAvailable(),
    });
    return () => {
      mountedRef.current = false;
      logHeroDebug("circuit-unmount", {
        mobile: compactLatchedRef.current,
        parked: parkedRef.current,
      });
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const syncOnScreen = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const next = heroBoardIsOnScreen(r, vh);
      if (next !== heroOnScreenRef.current) {
        logHeroDebug("hero-on-screen", {
          onScreen: next,
          top: r.top,
          bottom: r.bottom,
          vh,
        });
      }
      heroOnScreenRef.current = next;
      if (next) startLoopRef.current();
    };
    syncOnScreen();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          let next = e.isIntersecting;
          if (!e.isIntersecting) {
            const r = e.boundingClientRect;
            const vh = window.innerHeight || 0;
            if (heroBoardIsOnScreen(r, vh)) next = true;
          }
          heroOnScreenRef.current = next;
          if (next) startLoopRef.current();
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
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = (w: number, h: number) => {
      if (w < 8 || h < 8) return;
      setFrameSize((prev) => {
        if (
          shouldKeepHeroFrameSize(
            prev,
            { w, h },
            compactLatchedRef.current === true
          )
        ) {
          return prev;
        }
        logHeroDebug("frame-size", { prev, next: { w, h } });
        return { w, h };
      });
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

  const bodies = useMemo(() => {
    const list: Array<{
      key: string;
      node: CircuitNode;
      seat: MoonPlacement;
      synth: boolean;
      spinDur: number;
      spinRev: boolean;
    }> = [];
    if (cymasynth) {
      list.push({
        key: `synth-${cymasynth.id}`,
        node: cymasynth,
        seat: synthSeat,
        synth: true,
        spinDur: SYNTH_SPIN_SEC,
        spinRev: false,
      });
    }
    seats.forEach((seat) => {
      const node = tourNodes[seat.index];
      if (!node) return;
      const hash = hashOrbitKey(node.slug || String(node.id));
      const d = moonDiameter(hash, seat.ring, mobile);
      list.push({
        key: String(node.id),
        node,
        seat: { ...seat, size: { w: d, h: d } },
        synth: false,
        spinDur: MOON_SPIN_SEC_MIN + ((hash % 1000) / 1000) * MOON_SPIN_SEC_SPAN,
        spinRev: ((hash >>> 3) & 1) === 1,
      });
    });
    return list;
  }, [cymasynth, tourNodes, seats, synthSeat, mobile]);

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
        periodSec: (2 * Math.PI) / (system.n[i] + system.prec[i]),
        radius: body.seat.radius,
        radiusPx: system.a[i],
        size: body.seat.size.w * (body.synth ? 1.45 : 1),
      })),
    ]);
    const stopCap = heroTourStopCap(mobile, tourCap);
    return stopCap == null ? ordered : ordered.slice(0, stopCap);
  }, [bodies, cymasphere, system, mobile, tourCap]);

  const creditsByKey = useMemo(
    () => new Map(credits.map((credit) => [credit.key, credit])),
    [credits]
  );
  const bodyIndexByKey = useMemo(
    () => new Map(bodies.map((body, i) => [body.key, i])),
    [bodies]
  );

  const bodyDefs = useMemo<HeroBodyDef[]>(
    () =>
      bodies.map((body) => ({
        key: body.key,
        slug: body.node.slug,
        name: body.node.name,
        kind: body.synth ? "synth" : "moon",
        diameter: body.seat.size.w,
        image: body.node.image,
        spinDur: body.spinDur,
        spinRev: body.spinRev,
      })),
    [bodies]
  );

  const tourLive = useRef({
    credits,
    bodies,
    system,
    bodyIndexByKey,
    creditsByKey,
    frameSize,
    mobile,
    bodyDefs,
  });
  tourLive.current = {
    credits,
    bodies,
    system,
    bodyIndexByKey,
    creditsByKey,
    frameSize,
    mobile,
    bodyDefs,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = HeroScene.tryCreate({ canvas, compact: mobile });
    if (!scene) {
      setWebglOk(false);
      return;
    }
    setWebglOk(true);
    sceneRef.current = scene;
    const box = containerRef.current?.getBoundingClientRect();
    if (box) scene.setViewSize(box.width, box.height);
    scene.setBodies(bodyDefs);
    scene.setOrbitSystem(mobile ? null : system);
    void scene.loadBodyArt({
      key: SUN_FOCUS_KEY,
      slug: "cymasphere",
      name: "Cymasphere",
      kind: "sun",
      diameter: HERO_SUN_DIAMETER_PX,
      spinDur: SUN_SPIN_SEC,
      spinRev: false,
    });
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // Recreate only when the compact latch flips — catalog updates sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setBodies(bodyDefs);
    scene.setOrbitSystem(mobile ? null : system);
  }, [bodyDefs, system, mobile]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !frameSize) return;
    scene.setViewSize(frameSize.w, frameSize.h);
  }, [frameSize]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const def of bodyDefs) {
      void scene.loadBodyArt(def);
    }
  }, [credits, bodyDefs]);

  useEffect(() => {
    let raf = 0;
    const worldPos = new Map<string, { x: number; height: number; z: number }>();
    let lastCreditCss = "";
    let lastCreditCopy = "";
    const creditLenRef = { current: 0 };

    const writeCredit = (
      cam: ReturnType<typeof cameraTour>,
      viewHalfW: number
    ) => {
      const { creditsByKey, bodyIndexByKey, bodies } = tourLive.current;
      if (creditWrapRef.current) {
        const creditCss = `${cam.creditOpacity.toFixed(3)}|${cam.creditOpacity > 0.2}`;
        if (creditCss !== lastCreditCss) {
          lastCreditCss = creditCss;
          creditWrapRef.current.style.opacity = cam.creditOpacity.toFixed(3);
          creditWrapRef.current.style.pointerEvents =
            cam.creditOpacity > 0.2 ? "auto" : "none";
        }
      }
      const focused = cam.focusKey
        ? creditsByKey.get(cam.focusKey)
        : cam.nextKey
          ? creditsByKey.get(cam.nextKey)
          : undefined;
      if (!focused || lastCreditKey.current === focused.key) return;
      lastCreditKey.current = focused.key;
      const focusedIdx = bodyIndexByKey.get(focused.key);
      const focusedBody =
        focusedIdx === undefined ? undefined : bodies[focusedIdx];
      const synthCredit = focusedBody?.synth === true;
      const sunCredit = Boolean(focused.sun);
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
      const copyKey = `${focused.key}|${focused.name}|${focused.subtitle ?? ""}|${focused.price ?? ""}|${thumbSrc}|${blurb}|${copySide}`;
      if (copyKey === lastCreditCopy) return;
      lastCreditCopy = copyKey;
      if (creditWrapRef.current) creditWrapRef.current.dataset.side = copySide;
      if (creditLinkRef.current && focused.slug) {
        creditLinkRef.current.href = `/product/${focused.slug}`;
        creditLinkRef.current.setAttribute("aria-label", `Open ${focused.name}`);
      }
      if (creditNameRef.current) creditNameRef.current.textContent = focused.name;
      if (creditRoleRef.current) {
        creditRoleRef.current.textContent = focused.subtitle || "";
        creditRoleRef.current.style.display = focused.subtitle ? "" : "none";
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
    };

    const tick = (now: number) => {
      const scene = sceneRef.current;
      if (parkedRef.current || !scene) {
        raf = 0;
        rafRef.current = 0;
        return;
      }
      if (scene.contextLost) {
        setWebglOk(false);
        raf = 0;
        rafRef.current = 0;
        return;
      }
      if (pageHiddenRef.current || !heroOnScreenRef.current) {
        tourWasPausedRef.current = true;
        lastFrameAt.current = now;
        raf = 0;
        rafRef.current = 0;
        return;
      }
      const skipDraw = shouldSkipHeroFrame(now, lastDrawAt.current);
      const {
        credits,
        bodies,
        system,
        bodyIndexByKey,
        frameSize,
        mobile: compact,
        bodyDefs,
      } = tourLive.current;
      if (creditLenRef.current !== credits.length) {
        const prevLen = creditLenRef.current;
        creditLenRef.current = credits.length;
        if (startedAt.current == null || credits.length < prevLen) {
          startedAt.current = now;
        }
      }
      if (startedAt.current == null) startedAt.current = now;
      const gap = lastFrameAt.current == null ? 16 : now - lastFrameAt.current;
      if (tourWasPausedRef.current) {
        startedAt.current += gap;
        tourWasPausedRef.current = false;
      }
      lastFrameAt.current = now;
      const gapClamped = Math.min(64, Math.max(8, gap));
      const ease = 1 - Math.exp(-gapClamped / 140);
      const elapsed = now - startedAt.current;
      if (
        !parkedRef.current &&
        (parkImmediatelyRef.current ||
          (compact &&
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
      const lookScale = 1 - creditsW;
      let camX = cam.rotateX + look.current.y * lookScale;
      let camY = cam.rotateY + look.current.x * lookScale;
      const staged = creditStageKeys(cam);
      const trackingMoon = staged.length > 0;
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
        const sunApproach =
          cam.focusKey === SUN_FOCUS_KEY ||
          (cam.focusKey == null && cam.nextKey === SUN_FOCUS_KEY);
        // Hold + hop use the live look-at / zoom-out-follow pose.
        // Easing yaw while the dolly lagged is what let moons fly past.
        if (trackingMoon) {
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

      const facePair = `${cam.focusKey ?? ""}|${cam.nextKey ?? ""}`;
      if (facePair !== facedKeys.current) {
        facedKeys.current = facePair;
        const latchFaceOn = (key: string | null) => {
          if (!key || key === SUN_FOCUS_KEY) return;
          const idx = bodyIndexByKey.get(key);
          const body = idx === undefined ? undefined : bodies[idx];
          if (!body) return;
          faceAlign.current.set(
            body.key,
            faceOnAlign(elapsed, body.spinDur, body.spinRev)
          );
          spinBoost.current.set(body.key, 0);
        };
        latchFaceOn(cam.focusKey);
        latchFaceOn(cam.nextKey);
      }

      const sunFeatured = cam.focusKey === SUN_FOCUS_KEY;
      if (sunFeatured && !reducedMotion) {
        sunBoostRef.current =
          (sunBoostRef.current + gapClamped / FEATURED_TURNTABLE_MS) % 1;
      }
      scene.poseSun(
        reducedMotion
          ? 0
          : moonSpinPhase(
              elapsed,
              SUN_SPIN_SEC,
              false,
              sunFeatured,
              sunBoostRef.current,
              sunAlignRef.current
            )
      );

      scene.poseBodies(pos, system.keys);
      const hideSynth = hideSynthForSunApproach(
        cam.focusKey,
        cam.nextKey,
        cam.creditOpacity
      );
      const sunFocus = cam.focusKey === SUN_FOCUS_KEY;
      const yawRad = (camY * Math.PI) / 180;
      const cosYaw = Math.cos(yawRad);
      const sinYaw = Math.sin(yawRad);
      let visible: string[];
      if (credits.length > 0) {
        visible = staged;
      } else if (compact) {
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
          dollyZ: follow.tz,
          viewHalfW,
          budget: VISIBLE_MOON_BUDGET,
          previous: liveKeysRef.current,
          hideSynth,
        });
      }
      liveKeysRef.current = visible;
      const visibleSet = new Set(visible);
      const keepArt = new Set(visibleSet);
      if (cam.focusKey && cam.focusKey !== SUN_FOCUS_KEY) {
        keepArt.add(cam.focusKey);
      }
      if (cam.nextKey && cam.nextKey !== SUN_FOCUS_KEY) {
        keepArt.add(cam.nextKey);
      }
      const byKey = new Map(bodyDefs.map((d) => [d.key, d]));
      for (const key of keepArt) {
        const def = byKey.get(key);
        if (def) void scene.loadBodyArt(def);
      }
      if (bodies.length > 8) {
        const keepSig = [...keepArt].sort().join("\0");
        if (keepSig !== keepArtSig.current) {
          keepArtSig.current = keepSig;
          scene.evictArt(keepArt);
        }
      }
      for (const body of bodies) {
        const onStage = visibleSet.has(body.key);
        scene.setBodyVisible(body.key, onStage);
        const featured = body.key === cam.focusKey;
        const focusTarget = featured ? 1 : 0;
        let focusW =
          (focusWeights.current.get(body.key) ?? 0) * (1 - ease) +
          focusTarget * ease;
        if (Math.abs(focusW - focusTarget) < 0.005) focusW = focusTarget;
        focusWeights.current.set(body.key, focusW);
        if (featured && !reducedMotion) {
          spinBoost.current.set(
            body.key,
            ((spinBoost.current.get(body.key) ?? 0) +
              gapClamped / FEATURED_TURNTABLE_MS) %
              1
          );
        }
        scene.poseBodyFocusScale(body.key, body.seat.size.w, focusW);
        scene.poseBodySpinByKey(
          body.key,
          reducedMotion
            ? 0
            : moonSpinPhase(
                elapsed,
                body.spinDur,
                body.spinRev,
                featured,
                spinBoost.current.get(body.key) ?? 0,
                faceAlign.current.get(body.key) ?? 0
              )
        );
      }

      const synthBody = bodies.find((body) => body.synth);
      if (synthBody) {
        const si = bodyIndexByKey.get(synthBody.key);
        const wp =
          si === undefined
            ? null
            : {
                x: pos[si * 3],
                height: pos[si * 3 + 1],
                z: pos[si * 3 + 2],
              };
        scene.poseSynth(
          wp,
          synthBody.seat.size.w,
          reducedMotion ? 0 : (elapsed / 90) % 360,
          visibleSet.has(synthBody.key) && !compact
        );
      }

      scene.setOrbitsVisible(
        credits.length === 0 || (cam.focusKey == null && !cam.traveling)
      );
      scene.poseSunScale(sunScaleFromCamera(follow.tz));
      scene.applyCamera({
        ...cam,
        rotateX: camX,
        rotateY: camY,
        rotateZ: follow.z,
        translateX: follow.tx,
        translateY: follow.ty,
        translateZ: follow.tz,
      });
      scene.billboardFacingCamera();
      writeCredit(cam, viewHalfW);
      if (!skipDraw) {
        lastDrawAt.current = now;
        scene.render();
      }

      if (parkedRef.current) {
        raf = 0;
        rafRef.current = 0;
        containerRef.current?.setAttribute("data-parked", "true");
        return;
      }
      raf = window.requestAnimationFrame(tick);
      rafRef.current = raf;
    };

    const startLoop = () => {
      if (parkedRef.current || rafRef.current) return;
      raf = window.requestAnimationFrame(tick);
      rafRef.current = raf;
    };
    startLoopRef.current = startLoop;
    startLoop();

    return () => {
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [reducedMotion]);

  const onCanvasPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    const board = containerRef.current;
    if (!scene || !board) return;
    const hit = scene.pick(event.clientX, event.clientY, board.getBoundingClientRect());
    if (!hit) return;
    const href = `/product/${hit.slug}`;
    if (event.metaKey || event.ctrlKey || event.button === 1) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  };

  return (
    <Board ref={containerRef} data-hero-gl="true">
      <GlCanvas
        ref={canvasRef}
        aria-hidden
        onPointerUp={onCanvasPointerUp}
      />
      {!webglOk ? (
        <FallbackPoster aria-hidden>
          <PosterSun
            src={CYMASPHERE_SUN_POSTER}
            alt=""
            width={1280}
            height={1280}
            decoding="async"
          />
        </FallbackPoster>
      ) : null}
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
      <VisuallyHidden aria-label="Cymasphere system">
        <Link href="/product/cymasphere">Cymasphere</Link>
        {bodies.map((body) => (
          <Link key={body.key} href={`/product/${body.node.slug}`}>
            {body.node.name}
          </Link>
        ))}
      </VisuallyHidden>
    </Board>
  );
};

export default React.memo(CircuitNetwork);
