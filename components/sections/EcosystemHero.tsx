"use client";

/**
 * @fileoverview Homepage hero: a cinematic tour of the Cymasphere solar
 * system, then a two-line headline and CTAs underneath.
 * @module components/sections/EcosystemHero
 */

import React, { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { motion, useAnimation } from "framer-motion";
import CircuitNetwork, { CircuitNode } from "./CircuitNetwork";
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
  height: 100dvh;
  min-height: 100dvh;
  width: 100%;
  padding: 0;
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
    bottom: 18px;
  }
`;

const Title = styled(motion.h1)`
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
    font-size: 1.7rem;
    margin-bottom: 0.45rem;
  }
`;

const Support = styled(motion.p)`
  margin: 0 auto 1.2rem;
  max-width: 480px;
  font-size: 1.02rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 4px 18px rgba(5, 6, 13, 0.9);

  @media (max-width: 768px) {
    font-size: 0.88rem;
    margin-bottom: 0.9rem;
  }
`;

const Ctas = styled(motion.div)`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryCta = styled(motion.a)`
  display: inline-block;
  padding: 12px 28px;
  border-radius: 50px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: #fff;
  font-weight: 600;
  font-size: 1.02rem;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
`;

const SecondaryCta = styled(motion.a)`
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
  transition: background 0.3s ease, border-color 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.45);
  }
`;

const BoardArea = styled(motion.div)`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
`;

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
    tagline: product.tagline || product.short_description || "",
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
  const controls = useAnimation();

  // Animate in after mount to avoid an SSR/hydration flash.
  useEffect(() => {
    controls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: i * 0.12 },
    }));
  }, [controls]);

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

  return (
    <Hero id="home">
      <BoardArea custom={0} initial={{ opacity: 0, y: 18 }} animate={controls}>
        <CircuitNetwork
          cymasphere={cymasphere ? toNode(cymasphere) : null}
          cymasynth={cymasynth}
          nodes={nodes}
        />
        <Headline>
          <Title custom={1} initial={{ opacity: 0, y: 18 }} animate={controls}>
            Worlds of sound.
            <br />
            Orbiting in harmony.
          </Title>
          <Support custom={2} initial={{ opacity: 0, y: 18 }} animate={controls}>
            {supportLine}
          </Support>
          <Ctas custom={3} initial={{ opacity: 0, y: 18 }} animate={controls}>
            <PrimaryCta
              href="/product/cymasphere"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Explore Cymasphere
            </PrimaryCta>
            <SecondaryCta
              href="#catalog"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
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
