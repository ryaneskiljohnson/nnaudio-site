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
 * JS is not on the LCP path. The 3D tour idle-starts on phones and
 * desktop. `?heroAutoTour=1` starts immediately. `?tourCap=N` caps
 * credit stops. Hero height is reserved in globals.css (#home) so a
 * late sheet cannot collapse-then-expand.
 */

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { DEFAULT_CYMASYNTH_NODE, type CircuitNode } from "./circuit-node";
import {
  formatHeroDealPrice,
  orderHeroTourCatalog,
  partitionHeroTourProducts,
  seedRowToCard,
  type HomepageProductRow,
} from "@/lib/homepage-hero-seed";
import {
  parseHeroTourQuery,
  prefersLiteHeroTour,
  readHeroTourEnvironment,
  resolveHeroTourStart,
  scheduleDesktopHeroTour,
} from "@/utils/hero-tour";
import { scrollToHash } from "@/utils/scrollToHash";
import HeroReloadDebugMark from "@/components/HeroReloadDebugMark";
import { logHeroDebug } from "@/utils/hero-reload-debug";

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
  /** True when this product is a target of the active shop promotion. */
  shopPromoted?: boolean;
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
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;

  .hero-nowrap {
    white-space: nowrap;
  }

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
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
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

  .hero-nowrap {
    white-space: nowrap;
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
 * @brief Defers CircuitNetwork until idle on phones and desktop.
 * Both start with the tour off so hydration matches.
 * `?heroAutoTour=1` starts immediately.
 * @returns Tour mount flag and optional recording cap.
 */
function useOptInHeroTour(): {
  allowTour: boolean;
  tourCap: number | undefined;
} {
  const [allowTour, setAllowTour] = useState(false);
  const [tourCap, setTourCap] = useState<number | undefined>(undefined);

  useEffect(() => {
    const query = parseHeroTourQuery(window.location.search);
    setTourCap(query.tourCap);
    const lite = prefersLiteHeroTour(readHeroTourEnvironment(window));
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const start = resolveHeroTourStart({
      lite,
      reduceMotion,
      autoTour: query.autoTour,
      force3d: query.force3d,
    });
    logHeroDebug("hero-tour-resolve", {
      lite,
      allowTour: start.allowTour,
      scheduleDesktop: start.scheduleDesktop,
      autoTour: query.autoTour,
      force3d: query.force3d,
      reduceMotion,
    });
    if (start.allowTour) setAllowTour(true);
    if (!start.scheduleDesktop) return;
    return scheduleDesktopHeroTour(() => {
      logHeroDebug("hero-idle-start", {});
      setAllowTour(true);
    }, window);
  }, []);

  return { allowTour, tourCap };
}

/**
 * @brief Maps a fetched product to a board chip node.
 * @param product Source product.
 * @returns Chip node for the circuit board.
 */
function toNode(product: HeroProduct): CircuitNode {
  const image =
    product.featured_image_url || product.image || product.logo_url || "";
  const deal = formatHeroDealPrice(product.sale_price, product.price);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image,
    price: deal.current,
    compareAtPrice: deal.compareAt,
    tagline: product.tagline || "",
    description: product.short_description || product.tagline || "",
    promoted: Boolean(product.shopPromoted),
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
  const { allowTour, tourCap } = useOptInHeroTour();
  const [liveCatalog, setLiveCatalog] = useState<{
    instruments: HeroProduct[];
    effects: HeroProduct[];
    packs: HeroProduct[];
    midiFx: HeroProduct[];
    cymasphere: HeroProduct | null;
  } | null>(null);

  useEffect(() => {
    logHeroDebug("hero-allowTour", {
      allowTour,
      tourCap: tourCap ?? null,
    });
  }, [allowTour, tourCap]);

  const seedEmpty =
    instruments.length + effects.length + packs.length + midiFx.length === 0;

  useEffect(() => {
    if (!seedEmpty) {
      setLiveCatalog(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/products?status=active&limit=200");
        const data = (await response.json()) as {
          success?: boolean;
          products?: HomepageProductRow[];
        };
        if (cancelled || !data.success || !data.products?.length) return;
        const split = partitionHeroTourProducts(data.products);
        setLiveCatalog({
          instruments: split.instruments.map(seedRowToCard),
          effects: split.effects.map(seedRowToCard),
          packs: split.packs.map(seedRowToCard),
          midiFx: split.midiFx.map(seedRowToCard),
          cymasphere: split.cymasphere ? seedRowToCard(split.cymasphere) : null,
        });
      } catch (error) {
        console.error("Hero tour catalog fetch failed:", error);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [seedEmpty]);

  const tourInstruments = seedEmpty ? liveCatalog?.instruments ?? [] : instruments;
  const tourEffects = seedEmpty ? liveCatalog?.effects ?? [] : effects;
  const tourPacks = seedEmpty ? liveCatalog?.packs ?? [] : packs;
  const tourMidiFx = seedEmpty ? liveCatalog?.midiFx ?? [] : midiFx;
  const tourCymasphere =
    cymasphere ?? (seedEmpty ? liveCatalog?.cymasphere ?? null : null);

  const { cymasynth, nodes } = useMemo(() => {
    const synthProduct = tourInstruments.find(
      (p) => (p.slug || "").toLowerCase() === "cymasynth"
    );
    const synthNode = synthProduct
      ? toNode(synthProduct)
      : DEFAULT_CYMASYNTH_NODE;

    const skip = new Set(["cymasynth", "cymasphere", "nnaudio-access"]);
    const pick = (list: HeroProduct[]): CircuitNode[] =>
      list
        .filter((p) => !skip.has((p.slug || "").toLowerCase()))
        .map((p) => toNode(p));

    const buckets = [
      pick(tourInstruments),
      pick(tourEffects),
      pick(tourMidiFx),
      pick(tourPacks),
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
      nodes: orderHeroTourCatalog(mixed),
    };
  }, [tourInstruments, tourEffects, tourPacks, tourMidiFx]);

  const supportRest =
    productCount > 0
      ? ` writes from the center: harmony, voicings, and patterns - melodies, groove, and texture. In orbit: CymaSynth and ${productCount}+ instruments, effects, and packs.`
      : " writes from the center: harmony, voicings, and patterns - melodies, groove, and texture. In orbit: CymaSynth and a catalog of instruments, effects, and packs.";
  const supportLineMobile =
    productCount > 0
      ? `Harmony, voicings, and patterns from the center. CymaSynth and ${productCount}+ more in orbit.`
      : "Harmony, voicings, and patterns from the center. CymaSynth and the catalog in orbit.";

  return (
    <Hero id="home">
      <HeroReloadDebugMark source="ecosystem-hero" />
      <BoardArea>
        <BoardFade>
          {allowTour ? (
            <CircuitNetwork
              cymasphere={tourCymasphere ? toNode(tourCymasphere) : null}
              cymasynth={cymasynth}
              nodes={nodes}
              tourCap={tourCap}
            />
          ) : (
            <StaticHeroPoster />
          )}
        </BoardFade>
        <Headline data-hero-headline="">
          <Title>
            Worlds of sound.
            <br />
            Orbiting in harmony.
          </Title>
          <Support>
            <span className="hero-nowrap whitespace-nowrap">Cymasphere</span>
            {supportRest}
          </Support>
          <SupportMobile>{supportLineMobile}</SupportMobile>
          <Ctas>
            <PrimaryCta
              className="hero-cta hero-cta-primary"
              href="/product/cymasphere"
            >
              Explore <span className="hero-nowrap whitespace-nowrap">Cymasphere</span>
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
