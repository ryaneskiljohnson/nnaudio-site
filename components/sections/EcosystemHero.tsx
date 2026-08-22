"use client";

/**
 * @fileoverview Homepage hero: a cinematic tour of the Cymasphere solar
 * system, then a two-line headline and CTAs underneath.
 * @module components/sections/EcosystemHero
 * @note Title and support copy are static (no Framer opacity-0) so LCP can
 * paint with the HTML. Critical #home h1 / CTA rules live in globals.css so
 * the headline is visible before styled-components hydrates. The tour is a
 * dynamic import so its JS is not on the LCP path. Hero height is reserved
 * in globals.css (#home) so a late sheet cannot collapse-then-expand.
 */

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import type { CircuitNode } from "./CircuitNetwork";
import { scrollToHash } from "@/utils/scrollToHash";

/** Minimal product shape consumed from the homepage fetches. */
export interface HeroProduct {
  id: string | number;
  name: string;
  slug: string;
  image?: string;
  logo_url?: string;
  featured_image_url?: string;
  price?: number | string;
  sale_price?: number | null;
  /** One-line subtitle shown on the credit card during the camera tour. */
  tagline?: string;
  short_description?: string;
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
  font-size: 2.8rem;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 0%, #c9c4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 8px 24px rgba(5, 6, 13, 0.85));

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

/**
 * Decorative tour fade only. Headline copy stays in the first paint so LCP
 * is not gated on hydration (opacity 0 until useAnimation was 21s on mobile).
 */
const BoardFade = styled(motion.div)`
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

/**
 * Same box as the tour board so swapping the dynamic import in does not
 * change layout. Background matches CircuitNetwork's Board.
 */
const BoardPlaceholder = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  background: #02030a;
`;

const CircuitNetwork = dynamic(() => import("./CircuitNetwork"), {
  ssr: false,
  loading: () => <BoardPlaceholder />,
});

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
        <BoardFade
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <CircuitNetwork
            cymasphere={cymasphere ? toNode(cymasphere) : null}
            cymasynth={cymasynth}
            nodes={nodes}
          />
        </BoardFade>
        <Headline>
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
