"use client";

/**
 * @fileoverview Homepage hero: a cinematic tour of the Cymasphere solar
 * system, then a two-line headline and CTAs underneath.
 * @module components/sections/EcosystemHero
 * @note Title and support copy are static (no Framer opacity-0) so LCP can
 * paint with the HTML. The h1 stays solid white (no gradient / transparent
 * fill) so hydration cannot restyle the LCP element. Critical #home h1 / CTA
 * rules live in globals.css so the headline is visible before
 * styled-components hydrates. CircuitNetwork is a dynamic import so its
 * JS is not on the LCP path. Lite devices wait for Play, then mount the
 * live 3D tour (cheap GPU warps, no CPU fallback). `?heroAutoTour=1`
 * skips Play. `?tourCap=N` caps credit stops. Hero height is reserved
 * in globals.css (#home) so a late sheet cannot collapse-then-expand.
 */

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import styled, { keyframes } from "styled-components";
import type { CircuitNode } from "./circuit-node";
import {
  parseHeroTourQuery,
  prefersLiteHeroTour,
  readHeroTourEnvironment,
  resolveHeroTourStart,
  scheduleDesktopHeroTour,
} from "@/utils/hero-tour";
import { scrollToHash } from "@/utils/scrollToHash";

/** Minimal product shape consumed from the homepage fetches. */
export interface HeroProduct {
  id: string | number;
  name: string;
  slug: string;
  image?: string;
  logo_url?: string | null;
  featured_image_url?: string | null;
  price?: number | string;
  sale_price?: number | null;
  /** One-line subtitle shown on the credit card during the camera tour. */
  tagline?: string;
  short_description?: string | null;
}

interface EcosystemHeroProps {
  /** Cymasphere product for the sun credit card. */
  cymasphere?: HeroProduct | null;
  /** Instrument plugins (CymaSynth is pulled out of this list). */
  instruments: HeroProduct[];
  /** Audio FX plugins. */
  effects: HeroProduct[];
  /** MIDI and sample packs. */
  packs: HeroProduct[];
  /** MIDI FX plugins. */
  midiFx?: HeroProduct[];
  /** Total product count for the support line; hidden when 0. */
  productCount?: number;
}

const Hero = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* Match globals.css #home. svh avoids URL-bar resize CLS. */
  height: 100svh;
  min-height: 100svh;
  width: 100%;
  padding: 0;
  margin-bottom: 28px;
  overflow: hidden;
  background: #02030a;
`;

const Headline = styled.div`
  position: absolute;
  left: 50%;
  bottom: 28px;
  z-index: 4;
  width: min(560px, calc(100% - 2rem));
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;

  a {
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    width: min(560px, calc(100% - 1.5rem));
  }
`;

const Title = styled.h1`
  margin: 0 0 0.65rem;
  color: #fff;
  -webkit-text-fill-color: #fff;
  font-size: 2.8rem;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.02em;
  background: none;
  text-shadow: 0 8px 24px rgba(5, 6, 13, 0.85);

  @media (max-width: 768px) {
    font-size: clamp(1.35rem, 6.4vw, 1.7rem);
    margin-bottom: 0.4rem;
  }
`;

const Support = styled.p`
  margin: 0 auto 1.2rem;
  max-width: 480px;
  font-size: 1.02rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 4px 18px rgba(5, 6, 13, 0.9);

  @media (max-width: 768px) {
    display: none;
  }
`;

/**
 * Shorter support line for phones so the copy does not cover the tour.
 */
const SupportMobile = styled(Support)`
  display: none;

  @media (max-width: 768px) {
    display: block;
    max-width: 34rem;
    font-size: 0.84rem;
    line-height: 1.4;
    margin-bottom: 0.7rem;
  }

  @media (max-width: 768px) and (max-height: 700px) {
    display: none;
  }
`;

const Ctas = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
  }
`;

const PrimaryCta = styled.a`
  display: inline-block;
  padding: 12px 28px;
  border-radius: 50px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: #fff;
  font-weight: 600;
  font-size: 1.02rem;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  transition: box-shadow 0.3s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
    transform: scale(1.04);
  }

  &:active {
    transform: scale(0.96);
  }

  @media (max-width: 768px) {
    padding: 12px 18px;
    min-height: 44px;
    font-size: 0.95rem;
    text-align: center;
  }
`;

const SecondaryCta = styled.a`
  display: inline-block;
  padding: 12px 28px;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  font-weight: 600;
  font-size: 1.02rem;
  text-decoration: none;
  backdrop-filter: blur(10px);
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.45);
    transform: scale(1.04);
  }

  &:active {
    transform: scale(0.96);
  }

  @media (max-width: 768px) {
    padding: 12px 18px;
    min-height: 44px;
    font-size: 0.95rem;
    text-align: center;
  }
`;

const BoardArea = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
`;

const boardFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * Decorative tour fade only. Headline copy stays in the first paint so LCP
 * is not gated on hydration. CSS keyframes — no Framer on the LCP path.
 */
const BoardFade = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: ${boardFadeIn} 0.6s ease forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * Same box as the tour board so swapping the dynamic import in does not
 * change layout. The sun is the rendered Cymasphere planet (1280 webp;
 * the tour bakes the 4K original after Play).
 */
const BoardPlaceholder = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  background: #02030a;
  position: relative;
  overflow: hidden;
`;

const PosterSunImg = styled.img`
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(42vw, 220px);
  height: min(42vw, 220px);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  object-fit: cover;
  box-shadow:
    0 0 48px rgba(255, 230, 180, 0.35),
    0 0 110px rgba(108, 99, 255, 0.28);
`;

const PosterMoon = styled.div<{ $x: string; $y: string; $size: string }>`
  position: absolute;
  left: ${(p) => p.$x};
  top: ${(p) => p.$y};
  width: ${(p) => p.$size};
  height: ${(p) => p.$size};
  border-radius: 50%;
  background: radial-gradient(
    circle at 32% 28%,
    rgba(255, 255, 255, 0.55),
    rgba(140, 150, 200, 0.35) 42%,
    rgba(20, 18, 40, 0.9)
  );
  opacity: 0.7;
`;

const PlayTourButton = styled.button`
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 5;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(5, 6, 16, 0.55);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transform: translate(-50%, 92px);
  cursor: pointer;
  backdrop-filter: blur(8px);

  &:hover,
  &:focus-visible {
    border-color: rgba(201, 180, 255, 0.8);
    outline: none;
  }

  @media (max-width: 900px), (pointer: coarse) {
    backdrop-filter: none;
    background: rgba(5, 6, 16, 0.82);
  }
`;

const CircuitNetwork = dynamic(
  () => import(/* webpackPrefetch: false */ "./CircuitNetwork"),
  {
    ssr: false,
    loading: () => <StaticHeroPoster />,
  }
);

/** Rendered Cymasphere planet for the idle disk (220px). Tour bakes 4K. */
const CYMASPHERE_SUN_POSTER = "/images/cymasphere-sun-sphere-hero.webp";

/**
 * @brief Parked wide shot used until the tour chunk is allowed to load.
 * Uses the rendered Cymasphere sphere, not a bald CSS orb.
 * @returns Decorative sun and moons.
 */
function StaticHeroPoster() {
  return (
    <BoardPlaceholder aria-hidden>
      <PosterMoon $x="18%" $y="28%" $size="44px" />
      <PosterMoon $x="74%" $y="22%" $size="32px" />
      <PosterMoon $x="68%" $y="62%" $size="56px" />
      <PosterSunImg
        src={CYMASPHERE_SUN_POSTER}
        alt=""
        width={1280}
        height={1280}
        decoding="async"
      />
    </BoardPlaceholder>
  );
}

/**
 * @brief Desktop defers CircuitNetwork until idle. Lite devices stay on
 * the poster until Play, then mount the same live 3D tour.
 * Both sides start with tours off so hydration matches.
 * `?heroAutoTour=1` starts immediately.
 * @returns Tour mount flags, Play visibility, and the Play handler.
 */
function useOptInHeroTour(): {
  allowTour: boolean;
  showPlay: boolean;
  tourCap: number | undefined;
  startMobileTour: () => void;
} {
  const [allowTour, setAllowTour] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [tourCap, setTourCap] = useState<number | undefined>(undefined);

  useEffect(() => {
    const query = parseHeroTourQuery(window.location.search);
    setTourCap(query.tourCap);
    const start = resolveHeroTourStart({
      lite: prefersLiteHeroTour(readHeroTourEnvironment(window)),
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      autoTour: query.autoTour,
      force3d: query.force3d,
    });
    if (start.allowTour) setAllowTour(true);
    if (start.showPlay) setShowPlay(true);
    if (!start.scheduleDesktop) return;
    return scheduleDesktopHeroTour(() => {
      setAllowTour(true);
      setShowPlay(false);
    }, window);
  }, []);

  /**
   * @brief Downloads CircuitNetwork after an explicit tap on a phone.
   */
  const startMobileTour = () => {
    setAllowTour(true);
    setShowPlay(false);
  };

  return { allowTour, showPlay, tourCap, startMobileTour };
}

/**
 * @brief Formats a product price for chip tooltips ("Free" when 0).
 * @param product Source product.
 * @returns Display string or undefined when no price exists.
 */
function displayPrice(product: HeroProduct): string | undefined {
  const value =
    typeof product.sale_price === "number"
      ? product.sale_price
      : typeof product.price === "number"
        ? product.price
        : undefined;
  if (value === undefined) return undefined;
  return value === 0 ? "Free" : `$${value}`;
}

/**
 * @brief Maps a fetched product to a board chip node.
 * @param product Source product.
 * @returns Chip node for the circuit board.
 */
function toNode(product: HeroProduct): CircuitNode {
  const image =
    product.featured_image_url || product.image || product.logo_url || "";
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image,
    price: displayPrice(product),
    tagline: product.tagline || "",
    description: product.short_description || product.tagline || "",
  };
}

/**
 * @brief Homepage hero pairing a terse headline with the live ecosystem board.
 * @param cymasphere Flagship product for the sun credit card.
 * @param instruments Instrument plugins from the catalog fetch.
 * @param effects Audio FX plugins from the catalog fetch.
 * @param packs Packs from the catalog fetch.
 * @param productCount Total catalog size shown in the support line.
 * @returns The ecosystem hero section.
 */
const EcosystemHero: React.FC<EcosystemHeroProps> = ({
  cymasphere,
  instruments,
  effects,
  packs,
  midiFx = [],
  productCount = 0,
}) => {
  const pathname = usePathname();
  const { allowTour, showPlay, tourCap, startMobileTour } = useOptInHeroTour();

  const { cymasynth, nodes } = useMemo(() => {
    const synthProduct = instruments.find((p) => p.slug === "cymasynth");
    const synthNode = synthProduct ? toNode(synthProduct) : null;

    const skip = new Set(["cymasynth", "cymasphere", "nnaudio-access"]);
    const pick = (list: HeroProduct[]): CircuitNode[] =>
      list
        .filter((p) => !skip.has((p.slug || "").toLowerCase()))
        .map((p) => toNode(p));

    const buckets = [
      pick(instruments),
      pick(effects),
      pick(midiFx),
      pick(packs),
    ];
    const seen = new Set<string>();
    const mixed: CircuitNode[] = [];
    const max = Math.max(...buckets.map((b) => b.length));
    for (let i = 0; i < max; i++) {
      for (const bucket of buckets) {
        const node = bucket[i];
        if (!node) continue;
        const key = String(node.slug || node.id);
        if (seen.has(key)) continue;
        seen.add(key);
        mixed.push(node);
      }
    }

    return {
      cymasynth: synthNode,
      nodes: mixed,
    };
  }, [instruments, effects, packs, midiFx]);

  const supportLine =
    productCount > 0
      ? `Cymasphere writes from the center: harmony, voicings, and patterns - melodies, groove, and texture. In orbit: CymaSynth and ${productCount}+ instruments, effects, and packs.`
      : "Cymasphere writes from the center: harmony, voicings, and patterns - melodies, groove, and texture. In orbit: CymaSynth and a catalog of instruments, effects, and packs.";
  const supportLineMobile =
    productCount > 0
      ? `Harmony, voicings, and patterns from the center. CymaSynth and ${productCount}+ more in orbit.`
      : "Harmony, voicings, and patterns from the center. CymaSynth and the catalog in orbit.";

  return (
    <Hero id="home">
      <BoardArea>
        <BoardFade>
          {allowTour ? (
            <CircuitNetwork
              cymasphere={cymasphere ? toNode(cymasphere) : null}
              cymasynth={cymasynth}
              nodes={nodes}
              tourCap={tourCap}
            />
          ) : (
            <StaticHeroPoster />
          )}
          {showPlay && (
            <PlayTourButton type="button" onClick={startMobileTour}>
              Play tour
            </PlayTourButton>
          )}
        </BoardFade>
        <Headline data-hero-headline="">
          <Title>
            Worlds of sound.
            <br />
            Orbiting in harmony.
          </Title>
          <Support>{supportLine}</Support>
          <SupportMobile>{supportLineMobile}</SupportMobile>
          <Ctas>
            <PrimaryCta
              className="hero-cta hero-cta-primary"
              href="/product/cymasphere"
            >
              Explore Cymasphere
            </PrimaryCta>
            <SecondaryCta
              className="hero-cta hero-cta-secondary"
              href="#catalog"
              onClick={(e) => {
                if (scrollToHash("#catalog", pathname ?? "/")) e.preventDefault();
              }}
            >
              Browse The Universe
            </SecondaryCta>
          </Ctas>
        </Headline>
      </BoardArea>
    </Hero>
  );
};

export default EcosystemHero;
