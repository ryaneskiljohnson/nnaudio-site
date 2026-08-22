"use client";

/**
 * @fileoverview CymaSynth flagship-instrument spotlight: mirrored layout to
 * the Cymasphere spotlight with product art from the catalog API and terse
 * engine facts.
 * @module components/sections/CymasynthSpotlight
 */

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";
import { motion } from "framer-motion";

/** Catalog record fields used by the spotlight. */
export interface CymasynthProduct {
  name: string;
  slug: string;
  featured_image_url?: string;
  logo_url?: string;
  backgroundImage?: string;
  price?: number | string;
  sale_price?: number | null;
}

interface CymasynthSpotlightProps {
  /** CymaSynth catalog record; visual falls back gracefully when absent. */
  product?: CymasynthProduct | null;
}

const Section = styled.section`
  padding: 110px 20px;
  background:
    radial-gradient(circle at 85% 25%, rgba(78, 205, 196, 0.1), transparent 45%),
    linear-gradient(180deg, #0a0a14 0%, #07080f 100%);

  @media (max-width: 768px) {
    padding: 72px 16px;
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

const Copy = styled(motion.div)``;

const Eyebrow = styled.p`
  margin: 0 0 0.7rem;
  color: var(--accent, #4ecdc4);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0 0 0.6rem;
  font-size: 2.6rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Tagline = styled.p`
  margin: 0 0 1.8rem;
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.65);
`;

const Features = styled.ul`
  margin: 0 0 2rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const Feature = styled.li`
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.85);

  &::before {
    content: "";
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--primary, #6c63ff);
    transform: rotate(45deg);
  }
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.4rem;
  flex-wrap: wrap;
`;

const Price = styled.span`
  font-size: 1.9rem;
  font-weight: 800;
  color: #fff;

  s {
    margin-right: 0.6rem;
    font-size: 1.1rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
  }
`;

const Cta = styled(Link)`
  display: inline-block;
  padding: 14px 34px;
  border-radius: 50px;
  background: rgba(78, 205, 196, 0.12);
  border: 1px solid rgba(78, 205, 196, 0.55);
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: transform 0.25s ease, background 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(78, 205, 196, 0.22);
    box-shadow: 0 8px 30px rgba(78, 205, 196, 0.25);
  }
`;

const Visual = styled(motion.div)`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(78, 205, 196, 0.3);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #10142a 0%, #060810 100%);

  @media (max-width: 900px) {
    order: 2;
  }
`;

const VisualBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  img {
    object-fit: cover;
  }
`;

const ProductArt = styled.div`
  position: relative;
  z-index: 1;
  width: 78%;
  height: 78%;
  filter: drop-shadow(0 12px 40px rgba(0, 0, 0, 0.8));

  img {
    object-fit: contain;
  }
`;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7 },
};

/**
 * @brief True when a catalog URL is a raster image next/image can optimize.
 * @param url Featured, logo, or background URL from the products API.
 * @returns Whether the URL should be passed to next/image.
 * @note Video fallbacks on `backgroundImage` must stay out of the optimizer.
 */
function isRasterImageUrl(url?: string): url is string {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
  } catch {
    return false;
  }
  return !/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

/**
 * @brief Formats a numeric price with optional sale strikethrough.
 * @param price List price value.
 * @param salePrice Sale price value or null.
 * @returns JSX price markup.
 */
function renderPrice(price?: number | string, salePrice?: number | null) {
  const list = typeof price === "number" ? price : 99;
  if (typeof salePrice === "number" && salePrice < list) {
    return (
      <>
        <s>${list}</s>${salePrice}
      </>
    );
  }
  return <>${list}</>;
}

/**
 * @brief Renders the CymaSynth spotlight with catalog art and engine facts.
 * @param product CymaSynth record from the products API (image and pricing).
 * @returns The CymaSynth spotlight section.
 * @note Feature facts (oscillators, wavetable frames, mod routes, voices) are
 * fixed product truths, not marketing copy, so they live here rather than in
 * the database description.
 * @note Catalog PNGs are loaded through next/image so Vercel can serve
 * sized WebP/AVIF instead of the raw 1–2 MB Supabase files.
 */
const CymasynthSpotlight: React.FC<CymasynthSpotlightProps> = ({ product }) => {
  const image = product?.featured_image_url || product?.logo_url;
  const rawBackdrop = product?.backgroundImage;
  const backdrop = isRasterImageUrl(rawBackdrop) ? rawBackdrop : undefined;
  const productArt = isRasterImageUrl(image) ? image : undefined;

  return (
    <Section id="cymasynth">
      <Inner>
        <Copy {...reveal}>
          <Eyebrow>The Flagship Instrument</Eyebrow>
          <Title>CymaSynth</Title>
          <Tagline>
            A professional wavetable synthesizer built for the ecosystem.
          </Tagline>
          <Features>
            <Feature>3 oscillators with 256-frame wavetable morphing</Feature>
            <Feature>64-route modulation matrix, dual filters</Feature>
            <Feature>32-voice polyphony with a built-in FX chain</Feature>
          </Features>
          <PriceRow>
            <Price>{renderPrice(product?.price, product?.sale_price)}</Price>
            <Cta href="/product/cymasynth">Explore CymaSynth</Cta>
          </PriceRow>
        </Copy>

        <Visual {...reveal} transition={{ duration: 0.7, delay: 0.15 }}>
          {backdrop && (
            <VisualBackdrop>
              <Image
                src={backdrop}
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 55vw"
                quality={70}
                aria-hidden
              />
            </VisualBackdrop>
          )}
          {productArt && (
            <ProductArt>
              <Image
                src={productArt}
                alt="CymaSynth"
                fill
                sizes="(max-width: 900px) 80vw, 40vw"
                quality={75}
              />
            </ProductArt>
          )}
        </Visual>
      </Inner>
    </Section>
  );
};

export default CymasynthSpotlight;
