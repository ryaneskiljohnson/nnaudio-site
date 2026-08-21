"use client";

/**
 * @fileoverview Compact catalog category grid: one tile per category with a
 * live product count, plus a one-line NNAudio Access mention. Replaces the
 * former stack of per-category slider sections.
 * @module components/sections/CategoryGrid
 */

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { motion } from "framer-motion";

/** A single category tile. */
export interface CategoryTile {
  key: string;
  label: string;
  href: string;
  count: number;
}

interface CategoryGridProps {
  /** Tiles to display; tiles with count 0 are hidden. */
  categories: CategoryTile[];
}

const Section = styled.section`
  padding: 100px 20px 70px;
  background: linear-gradient(180deg, #07080f 0%, #0a0a0a 100%);

  @media (max-width: 768px) {
    padding: 64px 16px 48px;
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled(motion.h2)`
  margin: 0 0 0.6rem;
  text-align: center;
  font-size: 2.2rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

const Sub = styled(motion.p)`
  margin: 0 auto 2.6rem;
  max-width: 480px;
  text-align: center;
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.6);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Tile = styled(motion.create(Link))`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.6rem 1.5rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  transition: border-color 0.25s ease, background 0.25s ease,
    transform 0.25s ease;

  &:hover {
    background: rgba(108, 99, 255, 0.08);
    border-color: rgba(108, 99, 255, 0.45);
    transform: translateY(-3px);
  }
`;

const Count = styled.span`
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent, #4ecdc4);
  line-height: 1;
`;

const Label = styled.span`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 1.02rem;
  font-weight: 600;
  color: #fff;

  &::after {
    content: "→";
    color: rgba(255, 255, 255, 0.4);
    transition: transform 0.25s ease, color 0.25s ease;
  }

  ${Tile}:hover &::after {
    transform: translateX(4px);
    color: var(--accent, #4ecdc4);
  }
`;

const AccessLine = styled.p`
  margin: 2.4rem 0 0;
  text-align: center;
  font-size: 0.98rem;
  color: rgba(255, 255, 255, 0.55);

  a {
    color: var(--accent, #4ecdc4);
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6 },
};

/**
 * @brief Renders the catalog category tiles with counts and the NNAudio
 * Access one-liner.
 * @param categories Tiles with live counts; zero-count tiles are hidden.
 * @returns The category grid section.
 * @example
 * <CategoryGrid categories={[{ key: "fx", label: "Effects", href: "/products?category=audio-fx-plugin", count: 12 }]} />
 */
const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  const visible = categories.filter((c) => c.count > 0);
  if (visible.length === 0) return null;

  return (
    <Section id="catalog">
      <Inner>
        <Title {...reveal}>The whole catalog</Title>
        <Sub {...reveal} transition={{ duration: 0.6, delay: 0.1 }}>
          Every product works on its own. Together they answer to Cymasphere.
        </Sub>
        <Grid>
          {visible.map((c, i) => (
            <Tile
              key={c.key}
              href={c.href}
              {...reveal}
              transition={{ duration: 0.5, delay: 0.08 * i }}
            >
              <Count>{c.count}</Count>
              <Label>{c.label}</Label>
            </Tile>
          ))}
        </Grid>
        <AccessLine>
          Everything installs through{" "}
          <Link href="/downloads">NNAudio Access</Link> — one free desktop app
          for downloads, installs, and updates.
        </AccessLine>
      </Inner>
    </Section>
  );
};

export default CategoryGrid;
