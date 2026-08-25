"use client";

/**
 * @fileoverview Cymasphere flagship spotlight: real product UI screenshots
 * and copy over the hero-sized Cymasphere sphere, plus feature lines, price, and
 * a single CTA. Visual-first by design. Phones skip the sphere bitmap,
 * drop-shadow, and backdrop blur so Safari does not keep a full-bleed
 * filter layer composited (that jank is what feels like a reload).
 * @module components/sections/CymasphereSpotlight
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";
import { motion } from "framer-motion";
import EnergyBall from "@/components/common/EnergyBall";
import {
  prefersLiteHeroTour,
  readHeroTourEnvironment,
} from "@/utils/hero-tour";

interface CymasphereSpotlightProps {
  /** Current list price; falls back to the catalog default. */
  price?: number;
  /** Current sale price; null hides the strikethrough. */
  salePrice?: number | null;
}

const Section = styled.section`
  position: relative;
  overflow: hidden;
  padding: 110px 20px;
  background:
    radial-gradient(circle at 15% 20%, rgba(108, 99, 255, 0.12), transparent 45%),
    linear-gradient(180deg, #080911 0%, #0a0a14 100%);

  @media (max-width: 768px) {
    padding: 72px 16px;
  }
`;

/**
 * 4K Cymasphere planet behind the whole spotlight so screenshots and
 * copy both sit on the sun.
 */
const SphereBackdrop = styled.div`
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 50%;
  width: min(1400px, 130%);
  pointer-events: none;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 0 64px rgba(108, 99, 255, 0.4));

  img {
    display: block;
    width: 100%;
    height: auto;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(8, 9, 17, 0.42);
  }

  @media (max-width: 900px), (pointer: coarse) {
    width: min(520px, 88%);
    filter: none;
    background: radial-gradient(
      circle at 50% 45%,
      rgba(255, 220, 160, 0.28) 0%,
      rgba(108, 99, 255, 0.2) 36%,
      transparent 70%
    );

    &::after {
      display: none;
    }
  }
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

const ScreenshotStack = styled(motion.div)`
  position: relative;
  width: 100%;

  @media (max-width: 900px) {
    order: 2;
  }
`;

const MainShot = styled.div`
  position: relative;
  z-index: 1;
  width: 88%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(108, 99, 255, 0.3);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);

  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const SecondShot = styled.div`
  position: absolute;
  z-index: 2;
  right: 0;
  bottom: 0;
  width: 46%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(78, 205, 196, 0.35);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);

  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

/**
 * Semi-transparent panel so the copy stays readable over the sphere.
 */
const Copy = styled(motion.div)`
  padding: 2rem 2.15rem;
  border-radius: 20px;
  background: rgba(8, 9, 17, 0.64);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  @media (max-width: 900px), (pointer: coarse) {
    order: 1;
    padding: 1.6rem 1.4rem;
    background: rgba(8, 9, 17, 0.92);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 0.7rem;
  color: var(--primary, #6c63ff);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  margin: 0 0 0.8rem;
`;

/* Brand wordmark treatment matching the Cymasphere site logo. */
const Title = styled.h2`
  margin: 0;
  font-size: 2.4rem;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  font-family: var(--font-montserrat), -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;

  .cyma {
    background: linear-gradient(90deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  @media (max-width: 768px) {
    font-size: 1.7rem;
    letter-spacing: 2px;
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
    background: var(--accent, #4ecdc4);
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
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
`;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7 },
};

/** Intrinsic pixels of the Song View screenshot (public asset). */
const SONG_VIEW = { src: "/images/cymasphere-features/Song View.webp", w: 2844, h: 1990 };
/** Intrinsic pixels of the Palette View screenshot (public asset). */
const PALETTE_VIEW = { src: "/images/cymasphere-features/Palette View.webp", w: 2864, h: 1998 };
/** Hero-sized Cymasphere planet (below the fold; not the 4K 2.2MB original). */
const SUN_SPHERE = "/images/cymasphere-sun-sphere-hero.webp";

/**
 * @brief Renders the Cymasphere spotlight over the 4K sphere, with UI
 * screenshots on the left and copy on the right. Screenshots keep
 * their native aspect ratio so the UI is not cropped into a 16:10 frame.
 * @param price List price (default 499).
 * @param salePrice Sale price (default 199); pass null to hide.
 * @returns The Cymasphere spotlight section.
 */
const CymasphereSpotlight: React.FC<CymasphereSpotlightProps> = ({
  price = 499,
  salePrice = 199,
}) => {
  const [song, setSong] = useState(SONG_VIEW);
  const [palette, setPalette] = useState(PALETTE_VIEW);
  const [liteVisuals] = useState(() =>
    typeof window !== "undefined"
      ? prefersLiteHeroTour(readHeroTourEnvironment(window))
      : false
  );
  return (
    <Section id="cymasphere">
      <SphereBackdrop>
        {liteVisuals ? null : (
          <Image
            src={SUN_SPHERE}
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 900px) 100vw, 70vw"
            loading="lazy"
            aria-hidden
          />
        )}
      </SphereBackdrop>
      <Inner>
        <ScreenshotStack {...reveal}>
          <MainShot>
            <Image
              src={song.src}
              alt="Cymasphere Song View"
              width={song.w}
              height={song.h}
              sizes="(max-width: 900px) 88vw, 50vw"
              loading="lazy"
              onLoadingComplete={(img) =>
                setSong((prev) =>
                  prev.w === img.naturalWidth && prev.h === img.naturalHeight
                    ? prev
                    : { ...prev, w: img.naturalWidth, h: img.naturalHeight }
                )
              }
            />
          </MainShot>
          <SecondShot>
            <Image
              src={palette.src}
              alt="Cymasphere Harmony Palette"
              width={palette.w}
              height={palette.h}
              sizes="(max-width: 900px) 46vw, 25vw"
              loading="lazy"
              onLoadingComplete={(img) =>
                setPalette((prev) =>
                  prev.w === img.naturalWidth && prev.h === img.naturalHeight
                    ? prev
                    : { ...prev, w: img.naturalWidth, h: img.naturalHeight }
                )
              }
            />
          </SecondShot>
        </ScreenshotStack>

        <Copy {...reveal} transition={{ duration: 0.7, delay: 0.15 }}>
          <Eyebrow>The Brain</Eyebrow>
          <TitleRow>
            <EnergyBall size="52px" marginRight="16px" />
            <Title>
              <span className="cyma">CYMA</span>
              <span>SPHERE</span>
            </Title>
          </TitleRow>
          <Tagline>
            Intelligent music creation — standalone, AU, and VST3.
          </Tagline>
          <Features>
            <Feature>Harmony palettes that voice every chord for you</Feature>
            <Feature>Pattern and groove generators that write with you</Feature>
            <Feature>MIDI out to any instrument in your DAW</Feature>
          </Features>
          <PriceRow>
            <Price>
              {salePrice != null && salePrice < price ? (
                <>
                  <s>${price}</s>${salePrice}
                </>
              ) : (
                <>${price}</>
              )}
            </Price>
            <Cta href="/product/cymasphere">Explore Cymasphere</Cta>
          </PriceRow>
        </Copy>
      </Inner>
    </Section>
  );
};

export default CymasphereSpotlight;
