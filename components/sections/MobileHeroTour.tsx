"use client";

/**
 * @fileoverview Lite homepage hero tour: crossfading product stills and
 * credit cards without CircuitNetwork (no CSS 3D or canvas sphere warps).
 * @module components/sections/MobileHeroTour
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import type { CircuitNode } from "./circuit-node";
import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import {
  MOBILE_2D_HOLD_MS,
  buildMobileTourStops,
  heroBoardIsOnScreen,
  mobileTourIsParked,
  type MobileTourStop,
} from "@/utils/hero-tour";

interface MobileHeroTourProps {
  cymasphere?: CircuitNode | null;
  cymasynth?: CircuitNode | null;
  nodes: CircuitNode[];
  tourCap?: number;
}

const Board = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #02030a;
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

const PlanetWrap = styled.div`
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  width: min(52vw, 240px);
  height: min(52vw, 240px);
  pointer-events: none;
`;

const PlanetImg = styled.img<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  opacity: ${(p) => (p.$active ? 1 : 0)};
  transition: opacity 0.65s ease;
  box-shadow:
    0 0 48px rgba(255, 230, 180, 0.28),
    0 0 90px rgba(108, 99, 255, 0.22);
  animation: ${fadeIn} 0.65s ease;
`;

const CreditSlot = styled.div`
  position: absolute;
  left: 4%;
  top: calc(
    env(safe-area-inset-top, 0px) + var(--site-header-height) +
      var(--site-promo-strip-height) + 0.625rem
  );
  z-index: 2;
  max-width: min(88vw, 340px);
  pointer-events: none;
`;

const CreditCard = styled(Link).attrs({ className: "hero-credit" })`
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.65);
  pointer-events: auto;
`;

const CreditThumb = styled.img<{ $sun?: boolean }>`
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  padding: ${(p) => (p.$sun ? "0" : "8px")};
  border-radius: 50%;
  object-fit: ${(p) => (p.$sun ? "cover" : "contain")};
  background: radial-gradient(
    circle at 32% 28%,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(20, 18, 38, 0.9) 60%,
    rgba(5, 5, 10, 1) 100%
  );
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.55),
    0 0 26px rgba(108, 99, 255, 0.28);
`;

const CreditRole = styled.span`
  display: block;
  margin-bottom: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 214, 170, 0.78);
`;

const CreditName = styled.span`
  display: block;
  font-size: clamp(1.15rem, 6vw, 1.55rem);
  font-weight: 800;
  line-height: 0.95;
  color: #fff;
`;

const CreditMeta = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.62);
`;

/**
 * @brief Maps a circuit node to the slim shape used by buildMobileTourStops.
 * @param node Product node.
 * @returns Mobile tour node.
 */
function toMobileNode(node: CircuitNode) {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    image: node.image,
    price: node.price,
    tagline: node.tagline,
  };
}

/**
 * @brief Credit overlay for one 2D tour stop.
 * @param stop Current credit.
 * @returns Linked credit card.
 */
function CreditOverlay({ stop }: { stop: MobileTourStop }) {
  const role = stop.sun ? "Flagship" : stop.slug === "cymasynth" ? "Synth" : "In orbit";
  return (
    <CreditSlot>
      <CreditCard href={`/product/${stop.slug}`}>
        <CreditThumb
          src={stop.image}
          alt=""
          decoding="async"
          $sun={stop.sun}
        />
        <div>
          <CreditRole>{role}</CreditRole>
          <CreditName>{stop.name}</CreditName>
          {(stop.price || stop.tagline) && (
            <CreditMeta>
              {[stop.price, stop.tagline].filter(Boolean).join(" · ")}
            </CreditMeta>
          )}
        </div>
      </CreditCard>
    </CreditSlot>
  );
}

/**
 * @brief Lightweight product reel for phones and touch-primary devices.
 * @param props Catalog nodes and optional tour cap.
 * @returns 2D crossfade tour board.
 */
const MobileHeroTour: React.FC<MobileHeroTourProps> = ({
  cymasphere,
  cymasynth,
  nodes,
  tourCap,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  const stops = useMemo(
    () =>
      buildMobileTourStops(
        cymasphere ? toMobileNode(cymasphere) : null,
        cymasynth ? toMobileNode(cymasynth) : null,
        nodes.map(toMobileNode),
        undefined,
        CURATED_FEATURED_ORDER,
        tourCap
      ),
    [cymasphere, cymasynth, nodes, tourCap]
  );

  const parked = mobileTourIsParked(index, stops.length);
  const current = stops[index] ?? stops[0];

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const syncOnScreen = () => {
      const rect = board.getBoundingClientRect();
      setOnScreen(heroBoardIsOnScreen(rect, window.innerHeight));
    };
    syncOnScreen();
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setOnScreen(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(board);
    window.addEventListener("scroll", syncOnScreen, { passive: true });
    window.addEventListener("resize", syncOnScreen);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncOnScreen);
      window.removeEventListener("resize", syncOnScreen);
    };
  }, []);

  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState !== "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (parked || !onScreen || !pageVisible || stops.length <= 1) return;
    const timer = window.setTimeout(() => {
      setIndex((prev) => Math.min(prev + 1, stops.length - 1));
    }, MOBILE_2D_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index, parked, onScreen, pageVisible, stops.length]);

  if (!current) {
    return <Board ref={boardRef} aria-hidden />;
  }

  return (
    <Board ref={boardRef} data-parked={parked ? "true" : undefined}>
      <PlanetWrap aria-hidden>
        {stops.map((stop, i) => (
          <PlanetImg
            key={stop.key}
            src={stop.image}
            alt=""
            decoding="async"
            $active={i === index}
          />
        ))}
      </PlanetWrap>
      <CreditOverlay stop={current} />
    </Board>
  );
};

export default React.memo(MobileHeroTour);
