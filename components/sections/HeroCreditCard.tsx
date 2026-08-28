"use client";

/**
 * @fileoverview Shared homepage credit-card overlay. Used by the live
 * CircuitNetwork tour and the prerendered video player so wrap CSS and
 * layout stay identical.
 * @module components/sections/HeroCreditCard
 */

import Link from "next/link";
import styled, { css } from "styled-components";
import {
  CREDIT_NAME_FONT_DESKTOP,
  CREDIT_NAME_FONT_MOBILE,
  CREDIT_NAME_WRAP_CSS,
} from "@/utils/hero-credit-style";
import { featuredProductBlurb } from "@/utils/hero-tour-credits";
import { optimizedImageUrl } from "@/utils/optimized-image-url";

const nameWrap = css`
  overflow-wrap: ${CREDIT_NAME_WRAP_CSS.overflowWrap};
  word-break: ${CREDIT_NAME_WRAP_CSS.wordBreak};
  white-space: ${CREDIT_NAME_WRAP_CSS.whiteSpace};
  hyphens: ${CREDIT_NAME_WRAP_CSS.hyphens};
`;

/**
 * Overlay slot for the tour credit. A plain div so rAF can write opacity
 * onto a real DOM node — `styled(Link)` refs are not reliable in Next 16.
 */
export const CreditSlot = styled.div`
  position: absolute;
  left: 6.5%;
  right: auto;
  top: 40%;
  transform: translateY(-58%);
  z-index: 40;
  max-width: min(38vw, 420px);
  pointer-events: none;
  opacity: 0;
  isolation: isolate;
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
      env(safe-area-inset-top, 0px) + var(--site-header-height) +
        var(--site-promo-strip-height) + 0.625rem
    );
    transform: none;
    max-width: min(88vw, 340px);

    &[data-side="right"] {
      left: 4%;
      right: auto;
    }
  }
`;

export const CreditCard = styled(Link).attrs({ className: "hero-credit" })`
  display: flex;
  align-items: center;
  gap: 20px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.65);

  @media (max-width: 768px) {
    gap: 14px;
  }
`;

export const CreditThumb = styled.img`
  width: 112px;
  height: 112px;
  flex-shrink: 0;
  padding: 14px;
  border-radius: 50%;
  object-fit: contain;
  image-rendering: auto;
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

export const CreditText = styled.div`
  min-width: 0;
`;

export const CreditRole = styled.span`
  display: block;
  margin-bottom: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 214, 170, 0.78);
`;

export const CreditName = styled.span`
  display: block;
  font-size: ${CREDIT_NAME_FONT_DESKTOP};
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.03em;
  color: #fff;
  ${nameWrap}

  @media (max-width: 768px) {
    font-size: ${CREDIT_NAME_FONT_MOBILE};
  }

  ${CreditCard}:hover & {
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }
`;

export const CreditPrice = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
`;

export const CreditBlurb = styled.p`
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

/** Product fields the React video overlay needs. */
export type HeroCreditCardModel = {
  key: string;
  name: string;
  slug: string;
  price?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  sun?: boolean;
};

/**
 * @brief HTML credit card driven by the video (or a fallback clock).
 * @param credit Product to show.
 * @param opacity 0–1 from the hold window.
 * @returns Overlay card, or null when nothing is focused.
 */
export function HeroCreditOverlay({
  credit,
  opacity,
}: {
  credit: HeroCreditCardModel | null;
  opacity: number;
}) {
  if (!credit || opacity <= 0) return null;
  const synth = credit.key.startsWith("synth-");
  const blurb = featuredProductBlurb(credit, synth);
  const thumbSrc = credit.image ? optimizedImageUrl(credit.image, 128) : "";
  return (
    <CreditSlot
      data-hero-credit=""
      data-credit-key={credit.key}
      style={{
        opacity,
        pointerEvents: opacity > 0 ? "auto" : "none",
      }}
    >
      <CreditCard
        href={`/product/${credit.slug}`}
        aria-label={`Open ${credit.name}`}
      >
        {thumbSrc ? (
          <CreditThumb
            src={thumbSrc}
            alt=""
            data-sun={credit.sun ? "true" : "false"}
          />
        ) : null}
        <CreditText>
          {credit.subtitle ? <CreditRole>{credit.subtitle}</CreditRole> : null}
          <CreditName>{credit.name}</CreditName>
          {credit.price ? <CreditPrice>{credit.price}</CreditPrice> : null}
          {blurb ? <CreditBlurb>{blurb}</CreditBlurb> : null}
        </CreditText>
      </CreditCard>
    </CreditSlot>
  );
}
