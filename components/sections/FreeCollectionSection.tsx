/**
 * @fileoverview Curated homepage section for the free collection. This gives
 * free offers a stronger landing-page feel than a generic catalog carousel.
 * @module components/sections/FreeCollectionSection
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { scrollToHash } from "@/utils/scrollToHash";
import { FaChevronLeft, FaChevronRight, FaDesktop, FaGift, FaLayerGroup, FaMagic } from "react-icons/fa";
import ProductCard from "@/components/products/ProductCard";

interface Product {
  id: number | string;
  name: string;
  slug?: string;
  tagline?: string;
  short_description?: string;
  description?: string;
  category?: string;
  image?: string;
  featured_image_url?: string;
  logo_url?: string;
  price: number | string;
  sale_price?: number | null;
}

interface FreeCollectionSectionProps {
  products: Product[];
}

const Section = styled.section`
  padding: 72px 20px 84px;
  background:
    radial-gradient(circle at top left, rgba(108, 99, 255, 0.12), transparent 24%),
    linear-gradient(180deg, #07080f 0%, #0d1120 100%);
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.65rem;
  text-align: center;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0 0 0.9rem;
  text-align: center;
  color: var(--text);
  font-size: clamp(2.1rem, 3.8vw, 3.3rem);
`;

const Subtitle = styled.p`
  max-width: 780px;
  margin: 0 auto 2rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const IntroGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const IntroCard = styled.div`
  padding: 1.35rem 1.4rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
`;

const VisualCard = styled.div`
  min-height: 320px;
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  background:
    linear-gradient(180deg, rgba(7, 8, 15, 0.2), rgba(7, 8, 15, 0.78)),
    url("/images/landing/free-collection-visual.webp");
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: flex-end;

  @media (max-width: 920px) {
    min-height: 260px;
  }
`;

const VisualOverlay = styled.div`
  width: 100%;
  padding: 1.35rem 1.4rem;
  background: linear-gradient(
    180deg,
    rgba(7, 8, 15, 0) 0%,
    rgba(7, 8, 15, 0.7) 45%,
    rgba(7, 8, 15, 0.88) 100%
  );
`;

const VisualTitle = styled.h3`
  margin: 0 0 0.45rem;
  color: var(--text);
  font-size: 1.2rem;
`;

const VisualBody = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.6;
`;

const IntroTitle = styled.h3`
  margin: 0 0 0.6rem;
  color: var(--text);
  font-size: 1.15rem;
`;

const IntroBody = styled.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
`;

const MiniList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.8rem;
`;

const MiniItem = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const MiniIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  background: linear-gradient(
    135deg,
    rgba(108, 99, 255, 0.22) 0%,
    rgba(78, 205, 196, 0.18) 100%
  );
`;

const MiniText = styled.div`
  h4 {
    margin: 0 0 0.2rem;
    color: var(--text);
    font-size: 0.96rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const MOBILE_PADDING_PX = 16;

const SliderWrapper = styled.div<{ $centerMode?: boolean }>`
  position: relative;
  margin-top: 2rem;
  overflow: ${(p) => (p.$centerMode ? "visible" : "hidden")};
  width: 100%;

  @media (max-width: 768px) {
    margin-left: -20px;
    margin-right: -20px;
    width: calc(100% + 40px);
    padding: 0 ${MOBILE_PADDING_PX}px;
    box-sizing: border-box;
  }
`;

const SliderCenterInner = styled.div`
  position: relative;
  width: 100%;
  min-height: 1px;
`;

const ProductsSlider = styled.div<{
  $translateX: number;
  $centered: boolean;
  $asCenteredItem?: boolean;
}>`
  display: flex;
  gap: 2rem;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  ${(p) => (p.$centered ? "justify-content: center;" : "")}
  ${(p) =>
    p.$asCenteredItem
      ? `position: relative; left: 50%; transform: translate(calc(-50% + ${p.$translateX}px), 0);`
      : `transform: translateX(${p.$translateX}px);`}

  > * {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const ProductCardWrapper = styled.div<{ $width?: number }>`
  flex: 0 0 ${(p) => (p.$width ? `${p.$width}px` : "auto")};
  width: ${(p) => (p.$width ? `${p.$width}px` : "auto")};
  min-width: ${(p) => (p.$width ? `${p.$width}px` : "auto")};
  max-width: ${(p) => (p.$width ? `${p.$width}px` : "auto")};
`;

const NavButton = styled.button<{ $direction: "left" | "right" }>`
  position: absolute;
  top: 50%;
  ${(p) => (p.$direction === "left" ? "left: 15px;" : "right: 15px;")}
  transform: translateY(-50%);
  z-index: 20;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(138, 43, 226, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  svg {
    font-size: 1.2rem;
  }

  @media (max-width: 768px) {
    ${(p) => (p.$direction === "left" ? "left: 6px;" : "right: 6px;")}
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    border-width: 1.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    svg {
      font-size: 0.9rem;
    }
  }

  &:hover:not(:disabled) {
    background: rgba(138, 43, 226, 0.8);
    border-color: rgba(138, 43, 226, 1);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 2rem;

  @media (max-width: 768px) {
    margin-top: 1.25rem;
  }
`;

const Dot = styled.button<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? "#8a2be2" : "rgba(255, 255, 255, 0.3)")};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;

  &:hover {
    background: ${(p) => (p.$active ? "#8a2be2" : "rgba(255, 255, 255, 0.5)")};
    transform: scale(1.2);
  }
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.85rem;
  margin-top: 2rem;
`;

const PrimaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  color: white;
  font-weight: 700;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  box-shadow: 0 12px 30px rgba(138, 43, 226, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(138, 43, 226, 0.45);
  }
`;

const SecondaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  color: white;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  transition: transform 0.25s ease, border-color 0.25s ease,
    background 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.32);
    background: rgba(255, 255, 255, 0.08);
  }
`;

/** @brief Normalize product for ProductCard (price number, optional fields). */
function toCardProduct(p: Product) {
  return {
    ...p,
    slug: p.slug ?? undefined,
    tagline: p.tagline ?? undefined,
    short_description: p.short_description ?? undefined,
    description: p.description ?? undefined,
    category: p.category ?? undefined,
    sale_price: p.sale_price ?? undefined,
    featured_image_url: p.featured_image_url ?? undefined,
    logo_url: p.logo_url ?? undefined,
    price:
      typeof p.price === "string"
        ? parseFloat(p.price.replace("$", "")) || 0
        : p.price ?? 0,
  };
}

const MAX_CARDS_PER_VIEW = 3;
const ARROW_SPACE = 100;
const GAP_DESKTOP = 32;
const GAP_MOBILE = 12;

/**
 * @brief Shows the free collection with intro and a slider of all free products.
 * @param props - Free products to display.
 * @returns Curated free collection section with product slider.
 */
export default function FreeCollectionSection({
  products,
}: FreeCollectionSectionProps) {
  const pathname = usePathname();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(MAX_CARDS_PER_VIEW);
  const [cardWidth, setCardWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const displayedProducts = products;
  const maxIndex = Math.max(0, displayedProducts.length - cardsPerView);
  const allCardsFit = displayedProducts.length <= cardsPerView;

  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (displayedProducts.length === 0) return;
    const containerWidth = sliderRef.current
      ? sliderRef.current.parentElement?.parentElement?.clientWidth ??
        sliderRef.current.parentElement?.clientWidth ??
        (typeof window !== "undefined" ? window.innerWidth : 1200)
      : typeof window !== "undefined"
        ? window.innerWidth
        : 1200;
    const gap = isMobile ? GAP_MOBILE : GAP_DESKTOP;
    const numCards = isMobile
      ? 1
      : Math.min(MAX_CARDS_PER_VIEW, displayedProducts.length);
    let width: number;
    if (isMobile) {
      width = (typeof window !== "undefined" ? window.innerWidth : 1200) - MOBILE_PADDING_PX * 2;
    } else {
      const actualWidth = Math.min(containerWidth, 1200);
      const availableWidth = actualWidth - ARROW_SPACE * 2;
      const totalGapWidth = gap * Math.max(0, numCards - 1);
      width = numCards > 0 ? (availableWidth - totalGapWidth) / numCards : 280;
    }
    setCardsPerView(numCards);
    setCardWidth(width);
  }, [displayedProducts.length, isMobile]);

  useEffect(() => {
    if (!sliderRef.current) return;
    const gap = isMobile ? GAP_MOBILE : GAP_DESKTOP;
    const cardWithGap = cardWidth + gap;
    if (isMobile) {
      setTranslateX(-(currentIndex * cardWithGap));
      return;
    }
    if (allCardsFit) {
      setTranslateX(0);
      return;
    }
    const containerWidth =
      sliderRef.current.parentElement?.parentElement?.clientWidth ??
      sliderRef.current.parentElement?.clientWidth ??
      window.innerWidth;
    const actualWidth = Math.min(containerWidth, 1200);
    const availableWidth = actualWidth - ARROW_SPACE * 2;
    const totalCardsWidth = cardWidth * cardsPerView + gap * (cardsPerView - 1);
    const centerOffset = ARROW_SPACE + (availableWidth - totalCardsWidth) / 2;
    setTranslateX(centerOffset - currentIndex * cardWithGap);
  }, [currentIndex, cardWidth, cardsPerView, isMobile, allCardsFit]);

  const nextSlide = useCallback(() => {
    const calculatedMaxIndex = Math.max(0, displayedProducts.length - cardsPerView);
    if (calculatedMaxIndex > 0) {
      setCurrentIndex((prev) => Math.min(prev + cardsPerView, calculatedMaxIndex));
    }
  }, [displayedProducts.length, cardsPerView]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? Math.max(prev - cardsPerView, 0) : 0));
  }, [cardsPerView]);

  const goToSlide = (index: number) => setCurrentIndex(index);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (touchStart == null || touchEnd == null) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentIndex < maxIndex) setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
    if (distance < -50 && currentIndex > 0) setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Section id="free-products">
      <Inner>
        <Eyebrow>Free Collection</Eyebrow>
        <Title>Hear the sound. Feel the workflow. Spend nothing first.</Title>
        <Subtitle>
          This is the easiest way into the catalog: free plugins, free MIDI,
          and NNAudio Access in one cleaner collection built to give you a real
          feel for how NNAudio fits the way you work.
        </Subtitle>

        <IntroGrid>
          <VisualCard>
            <VisualOverlay>
              <VisualTitle>Get the feel of the catalog before you commit</VisualTitle>
              <VisualBody>
                The free collection is where you hear the sound, test the
                workflow, and decide what deserves a permanent place in your
                setup.
              </VisualBody>
            </VisualOverlay>
          </VisualCard>

          <IntroCard>
            <MiniList>
              <MiniItem>
                <MiniIcon>
                  <FaGift />
                </MiniIcon>
                <MiniText>
                  <h4>Free plugins</h4>
                  <p>Quick utility and creative tools you can drop into real sessions.</p>
                </MiniText>
              </MiniItem>
              <MiniItem>
                <MiniIcon>
                  <FaMagic />
                </MiniIcon>
                <MiniText>
                  <h4>Free MIDI</h4>
                  <p>Fast inspiration when you want stronger ideas without digging.</p>
                </MiniText>
              </MiniItem>
              <MiniItem>
                <MiniIcon>
                  <FaDesktop />
                </MiniIcon>
                <MiniText>
                  <h4>NNAudio Access</h4>
                  <p>The cleaner way to install, update, and manage what you own.</p>
                </MiniText>
              </MiniItem>
            </MiniList>
          </IntroCard>
        </IntroGrid>

        <SliderWrapper $centerMode={allCardsFit && !isMobile}>
          {allCardsFit && !isMobile ? (
            <SliderCenterInner>
              <ProductsSlider
                ref={sliderRef}
                $translateX={translateX}
                $centered={allCardsFit}
                $asCenteredItem
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {displayedProducts.map((product, index) => (
                  <ProductCardWrapper key={product.id} $width={cardWidth}>
                    <ProductCard
                      product={toCardProduct(product)}
                      index={index}
                      showCartButton
                      showPluginType={false}
                    />
                  </ProductCardWrapper>
                ))}
              </ProductsSlider>
            </SliderCenterInner>
          ) : (
            <ProductsSlider
              ref={sliderRef}
              $translateX={translateX}
              $centered={allCardsFit}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {displayedProducts.map((product, index) => (
                <ProductCardWrapper key={product.id} $width={cardWidth}>
                  <ProductCard
                    product={toCardProduct(product)}
                    index={index}
                    showCartButton
                    showPluginType={false}
                  />
                </ProductCardWrapper>
              ))}
            </ProductsSlider>
          )}

          {displayedProducts.length > cardsPerView && (
            <>
              <NavButton
                $direction="left"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevSlide();
                }}
                disabled={currentIndex === 0}
                aria-label="Previous free products"
              >
                <FaChevronLeft />
              </NavButton>
              <NavButton
                $direction="right"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextSlide();
                }}
                disabled={currentIndex >= maxIndex}
                aria-label="Next free products"
              >
                <FaChevronRight />
              </NavButton>
            </>
          )}

          {!isMobile && maxIndex > 0 && (
            <DotsContainer>
              {Array.from({
                length: Math.ceil((displayedProducts.length - cardsPerView) / cardsPerView) + 1,
              }).map((_, index) => {
                const slideIndex = index * cardsPerView;
                return (
                  <Dot
                    key={index}
                    $active={currentIndex === slideIndex}
                    onClick={() => goToSlide(slideIndex)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                );
              })}
            </DotsContainer>
          )}
        </SliderWrapper>

        <CtaRow>
          <PrimaryCta href="/free-tools">
            <FaGift />
            See The Full Free Collection
          </PrimaryCta>
          <SecondaryCta
            href="#bundles"
            onClick={(e) => {
              if (scrollToHash("#bundles", pathname ?? "/")) e.preventDefault();
            }}
          >
            <FaLayerGroup />
            See What Opens Up Next
          </SecondaryCta>
        </CtaRow>
      </Inner>
    </Section>
  );
}
