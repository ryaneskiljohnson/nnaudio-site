"use client";

/**
 * @fileoverview Catalog "universe" grid: a bento layout of category tiles,
 * each with its own accent hue, a dashed orbit arc, a cluster of real
 * product artwork moons, live counts, and an NNAudio Access tile that
 * fills the last slot. Carries the solar-system theme from the hero.
 * @module components/sections/CategoryGrid
 */

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";
import { motion } from "framer-motion";
import { isOptimizableImageSrc } from "@/utils/optimized-image-url";

/** A single category tile. */
export interface CategoryTile {
  key: string;
  label: string;
  href: string;
  count: number;
  /** One-line description under the label. */
  blurb?: string;
  /** Up to four product artwork URLs rendered as orbiting moons. */
  images?: string[];
  /** Keep the tile even when count is 0 (NNAudio Access). */
  alwaysShow?: boolean;
}

interface CategoryGridProps {
  /** Tiles to display; tiles with count 0 are hidden. */
  categories: CategoryTile[];
}

/** Accent color per category key (rgb triplet for alpha composition). */
const CATEGORY_RGB: Record<string, string> = {
  instruments: "108, 99, 255",
  effects: "78, 205, 196",
  "midi-fx": "255, 154, 96",
  packs: "255, 110, 160",
  bundles: "255, 210, 110",
  free: "120, 220, 140",
  access: "72, 140, 255",
};

const Section = styled.section`
  position: relative;
  overflow: hidden;
  padding: 110px 20px 80px;
  background:
    radial-gradient(ellipse 60% 40% at 18% 8%, rgba(108, 99, 255, 0.09), transparent 60%),
    radial-gradient(ellipse 50% 36% at 85% 90%, rgba(78, 205, 196, 0.07), transparent 60%),
    linear-gradient(180deg, #07080f 0%, #0a0a0a 100%);

  @media (max-width: 768px) {
    padding: 72px 16px 56px;
  }
`;

/** Sparse static stars so the section stays in the hero's universe. */
const Stars = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(1px 1px at 12% 22%, rgba(255, 255, 255, 0.55), transparent 100%),
    radial-gradient(1px 1px at 28% 68%, rgba(255, 255, 255, 0.35), transparent 100%),
    radial-gradient(1.5px 1.5px at 44% 12%, rgba(255, 255, 255, 0.45), transparent 100%),
    radial-gradient(1px 1px at 63% 42%, rgba(255, 255, 255, 0.3), transparent 100%),
    radial-gradient(1.5px 1.5px at 78% 18%, rgba(255, 255, 255, 0.5), transparent 100%),
    radial-gradient(1px 1px at 88% 62%, rgba(255, 255, 255, 0.35), transparent 100%),
    radial-gradient(1px 1px at 8% 86%, rgba(255, 255, 255, 0.3), transparent 100%),
    radial-gradient(1.5px 1.5px at 94% 88%, rgba(255, 255, 255, 0.4), transparent 100%);
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
`;

const Eyebrow = styled(motion.p)`
  margin: 0 0 0.7rem;
  text-align: center;
  color: var(--accent, #4ecdc4);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
`;

const Title = styled(motion.h2)`
  margin: 0 0 0.7rem;
  text-align: center;
  font-size: 2.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 0%, #c9c4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 1.9rem;
  }
`;

const Sub = styled(motion.p)`
  margin: 0 auto 3rem;
  max-width: 520px;
  text-align: center;
  font-size: 1.05rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);

  @media (max-width: 768px) {
    margin-bottom: 2.2rem;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.1rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.9rem;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

/**
 * One category card. `--cat` carries the accent rgb; the dashed orbit
 * arc and artwork cluster sit top-right, copy bottom-left.
 */
const Tile = styled(motion.create(Link))<{ $wide?: boolean }>`
  position: relative;
  overflow: hidden;
  grid-column: span ${(p) => (p.$wide ? 6 : 3)};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.3rem;
  min-height: ${(p) => (p.$wide ? "220px" : "200px")};
  padding: 1.6rem 1.5rem 1.45rem;
  border-radius: 18px;
  background:
    radial-gradient(130% 100% at 88% -10%, rgba(var(--cat), 0.16), transparent 55%),
    rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease,
    transform 0.3s ease;

  /* Dashed orbit arc the artwork moons sit on. */
  &::before {
    content: "";
    position: absolute;
    top: -72px;
    right: -60px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    border: 1px dashed rgba(var(--cat), 0.35);
    transition: transform 0.5s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--cat), 0.55);
    box-shadow:
      0 18px 44px rgba(0, 0, 0, 0.45),
      0 0 36px rgba(var(--cat), 0.16);

    &::before {
      transform: rotate(14deg);
    }
  }

  @media (max-width: 900px) {
    grid-column: span 1;
    min-height: 180px;
  }
`;

/** Overlapping product-artwork moons pinned to the tile's orbit arc. */
const MoonCluster = styled.div`
  position: absolute;
  top: 1.2rem;
  right: 1.25rem;
  display: flex;
  flex-direction: row-reverse;

  img {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    background: #0a0a14;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    transition: transform 0.3s ease;

    &:not(:first-child) {
      margin-right: -16px;
    }
  }

  ${Tile}:hover & img {
    transform: translateX(-3px);

    &:first-child {
      transform: translateX(0) scale(1.06);
    }
  }

  @media (max-width: 900px) {
    img {
      width: 44px;
      height: 44px;
    }
  }
`;

const Count = styled.span`
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1;
  color: rgb(var(--cat));
  text-shadow: 0 0 24px rgba(var(--cat), 0.35);
`;

const Label = styled.span`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;

  &::after {
    content: "→";
    color: rgba(255, 255, 255, 0.4);
    transition: transform 0.25s ease, color 0.25s ease;
  }

  ${Tile}:hover &::after {
    transform: translateX(4px);
    color: rgb(var(--cat));
  }
`;

const Blurb = styled.span`
  font-size: 0.92rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.55);
`;

/**
 * @brief 52px category-tile moon. Uses next/image when the host is
 * allowlisted; unknown hosts stay a plain img so the homepage cannot throw.
 * @param src Artwork URL from the catalog seed or API.
 * @returns Optimized or fallback moon image.
 */
function CategoryMoonThumb({ src }: { src: string }) {
  if (isOptimizableImageSrc(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={52}
        height={52}
        sizes="52px"
        loading="lazy"
      />
    );
  }
  return <img src={src} alt="" loading="lazy" />;
}

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6 },
};

/**
 * @brief Renders the catalog bento grid: per-category accent hues, real
 * artwork clusters on dashed orbit arcs, and live counts. The first two
 * tiles span wide; NNAudio Access fills the last slot when a category
 * is empty so the grid does not leave a hole.
 * @param categories Tiles with live counts; zero-count tiles are hidden
 * unless `alwaysShow` is set.
 * @returns The catalog universe section.
 * @example
 * <CategoryGrid categories={[{ key: "effects", label: "Effects", href: "/products?category=audio-fx-plugin", count: 12, images: ["/a.webp"] }]} />
 */
const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  const visible = categories.filter((c) => c.count > 0 || c.alwaysShow);
  if (visible.length === 0) return null;

  return (
    <Section id="catalog">
      <Stars />
      <Inner>
        <Eyebrow {...reveal}>The catalog</Eyebrow>
        <Title {...reveal} transition={{ duration: 0.6, delay: 0.05 }}>
          Find what you need
        </Title>
        <Sub {...reveal} transition={{ duration: 0.6, delay: 0.1 }}>
          Every product works on its own. Together they answer to Cymasphere.
        </Sub>
        <Grid>
          {visible.map((c, i) => (
            <Tile
              key={c.key}
              href={c.href}
              $wide={i < 2}
              style={
                {
                  "--cat": CATEGORY_RGB[c.key] ?? "108, 99, 255",
                } as React.CSSProperties
              }
              {...reveal}
              transition={{ duration: 0.5, delay: 0.07 * i }}
            >
              {c.images && c.images.length > 0 && (
                <MoonCluster aria-hidden>
                  {c.images.slice(0, i < 2 ? 4 : 3).map((src, moonIndex) => (
                    <CategoryMoonThumb
                      key={`${src}-${moonIndex}`}
                      src={src}
                    />
                  ))}
                </MoonCluster>
              )}
              <Count>{c.count}</Count>
              <Label>{c.label}</Label>
              {c.blurb && <Blurb>{c.blurb}</Blurb>}
            </Tile>
          ))}
        </Grid>
      </Inner>
    </Section>
  );
};

export default CategoryGrid;
