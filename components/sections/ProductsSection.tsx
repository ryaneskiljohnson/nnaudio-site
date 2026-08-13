/**
 * @fileoverview Reusable homepage merch section for product sliders, centered
 * elite-bundle presentation, and optional catalog exit links.
 * @module components/sections/ProductsSection
 */

"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProductCard from "@/components/products/ProductCard";

const SectionContainer = styled.section`
  padding: 60px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  position: relative;
  overflow: visible;

  &:nth-child(even) {
    background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 50%, #1a1a2e 100%);
  }
`;

const ContentContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const SectionEyebrow = styled(motion.p)`
  margin: 0 0 0.65rem;
  text-align: center;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SectionSubtitle = styled(motion.p)`
  font-size: 1.15rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.74);
  margin-bottom: 1.85rem;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const MOBILE_PADDING_PX = 16;

const SliderWrapper = styled.div<{ $centerMode?: boolean }>`
  position: relative;
  margin-top: 2rem;
  overflow: ${props => props.$centerMode ? 'visible' : 'hidden'};
  padding: 0;
  width: 100%;

  @media (max-width: 768px) {
    margin-top: 1.5rem;
    margin-left: -20px;
    margin-right: -20px;
    width: calc(100% + 40px);
    padding: 0 ${MOBILE_PADDING_PX}px;
    box-sizing: border-box;
  }
`;

/** When all cards fit (e.g. Elite Bundles), wraps the slider and centers it via left: 50% + translate(-50%) */
const SliderCenterInner = styled.div`
  position: relative;
  width: 100%;
  min-height: 1px;
`;

const ProductsSlider = styled.div<{ $translateX: number; $centered: boolean; $asCenteredItem?: boolean }>`
  display: flex;
  gap: 2rem;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  ${props => props.$centered ? 'justify-content: center;' : ''}
  ${props => props.$asCenteredItem
    ? `position: relative;
       left: 50%;
       transform: translate(calc(-50% + ${props.$translateX}px), 0);`
    : `transform: translateX(${props.$translateX}px);`}

  > * {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const ProductCardWrapper = styled.div<{ $width?: number }>`
  flex: 0 0 ${props => props.$width ? `${props.$width}px` : 'auto'};
  width: ${props => props.$width ? `${props.$width}px` : 'auto'};
  min-width: ${props => props.$width ? `${props.$width}px` : 'auto'};
  max-width: ${props => props.$width ? `${props.$width}px` : 'auto'};
`;

const NavigationButton = styled.button<{ $direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.$direction === 'left' ? 'left: 15px;' : 'right: 15px;'}
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
  z-index: 10;
  backdrop-filter: blur(10px);

  svg {
    font-size: 1.2rem;
  }

  @media (max-width: 768px) {
    top: 50%;
    ${props => props.$direction === 'left' ? 'left: 6px;' : 'right: 6px;'}
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    background: rgba(0, 0, 0, 0.85);
    border-width: 1.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

    svg {
      font-size: 0.9rem;
    }
  }

  &:hover {
    background: rgba(138, 43, 226, 0.8);
    border-color: rgba(138, 43, 226, 1);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;

    &:hover {
      transform: translateY(-50%) scale(1);
      background: rgba(0, 0, 0, 0.7);
      border-color: rgba(138, 43, 226, 0.6);
      box-shadow: none;
    }
  }

  @media (max-width: 768px) {
    &:hover:not(:disabled) {
      transform: translateY(-50%) scale(1.05);
    }
    &:active:not(:disabled) {
      transform: translateY(-50%) scale(0.98);
    }
  }
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 2rem;

  @media (max-width: 768px) {
    gap: 10px;
    margin-top: 1.25rem;
    padding: 0 8px;
  }
`;

const Dot = styled.button<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$active ? '#8a2be2' : 'rgba(255, 255, 255, 0.3)'};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;

  &:hover {
    background: ${props => props.$active ? '#8a2be2' : 'rgba(255, 255, 255, 0.5)'};
    transform: scale(1.2);
  }

  @media (max-width: 768px) {
    width: 10px;
    height: 10px;
    min-width: 10px;
    min-height: 10px;
    padding: 4px;
    margin: -4px;
    border-radius: 50%;

    &:hover {
      transform: scale(1.15);
    }
  }
`;

const ShowAllButton = styled.button`
  display: block;
  margin: 3rem auto 0;
  padding: 14px 32px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(138, 43, 226, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

const SectionActions = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 2rem;
`;

const SectionActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 210px;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  color: white;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.16);
  transition: transform 0.25s ease, border-color 0.25s ease,
    background 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SectionFooterNote = styled.p`
  margin: 1rem auto 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: 720px;
`;

const SectionVisual = styled.div`
  margin: 0 auto 2rem;
  max-width: 980px;
  min-height: 220px;
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
  display: flex;
  align-items: flex-end;

  @media (max-width: 768px) {
    min-height: 190px;
  }
`;

const SectionVisualOverlay = styled.div`
  width: 100%;
  padding: 1.2rem 1.4rem;
  background: linear-gradient(
    180deg,
    rgba(7, 8, 15, 0) 0%,
    rgba(7, 8, 15, 0.68) 48%,
    rgba(7, 8, 15, 0.88) 100%
  );
`;

const SectionVisualTitle = styled.h3`
  margin: 0 0 0.35rem;
  color: var(--text);
  font-size: 1.12rem;
`;

const SectionVisualBody = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.55;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
`;

interface Product {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  short_description?: string;
  description?: string;
  category?: string;
  image: string;
  featured_image_url?: string;
  logo_url?: string;
  backgroundImage?: string;
  price: number | string;
  sale_price?: number | null;
  /** When true (e.g. elite subscription bundles), ProductCard shows "See Pricing Options" instead of price and cart */
  hasMultiplePricing?: boolean;
  /** Sum of individual product prices (e.g. bundle total value); shown as strikethrough on card */
  compareAtPrice?: number;
}

interface ProductsSectionProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  footerNote?: string;
  visualImage?: string;
  visualTitle?: string;
  visualBody?: string;
  products: Product[];
  id: string;
  fetchAllUrl?: string;
  maxCardsPerView?: number;
  cardSize?: 'normal' | 'large' | 'medium';
  browseAllHref?: string;
  browseAllLabel?: string;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({
  title,
  eyebrow,
  subtitle,
  footerNote,
  visualImage,
  visualTitle,
  visualBody,
  products,
  id,
  fetchAllUrl,
  maxCardsPerView,
  cardSize = 'normal',
  browseAllHref,
  browseAllLabel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [cardsPerView, setCardsPerView] = useState(maxCardsPerView || 4);
  const [cardWidth, setCardWidth] = useState(0);
  
  const mobileLimit = 4;
  const displayedProducts = isMobile && !showAll ? allProducts.slice(0, mobileLimit) : allProducts;
  const maxIndex = Math.max(0, displayedProducts.length - cardsPerView);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounce resize handler for better performance
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const calculateDimensions = () => {
      if (!sliderRef.current) return;
      
      // Get actual container width (ContentContainer, which has max-width: 1600px)
      const containerWidth = sliderRef.current.parentElement?.parentElement?.clientWidth || 
                             sliderRef.current.parentElement?.clientWidth || 
                             window.innerWidth;
      
      const gap = window.innerWidth <= 768 ? 12 : 32;
      const arrowSpace = 100; // Space for each arrow (desktop only)

      // On mobile: single card, full viewport width minus padding; desktop uses section setting
      let numCards = isMobile ? 1 : (maxCardsPerView || 4);
      if (isMobile && !showAll) {
        numCards = 1;
      }
      numCards = Math.min(numCards, displayedProducts.length);

      let width: number;
      if (isMobile) {
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : containerWidth;
        width = viewportWidth - MOBILE_PADDING_PX * 2;
      } else {
        const actualWidth = Math.min(containerWidth, 1600);
        const availableWidth = actualWidth - (arrowSpace * 2);
        const totalGapWidth = gap * (numCards - 1);
        width = (availableWidth - totalGapWidth) / numCards;
      }

      setCardsPerView(numCards);
      setCardWidth(width);
    };
    
    const debouncedCalculate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateDimensions, 150);
    };
    
    calculateDimensions();
    window.addEventListener('resize', debouncedCalculate);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedCalculate);
    };
  }, [displayedProducts.length, isMobile, showAll, maxCardsPerView]);

  const allCardsFit = displayedProducts.length <= cardsPerView;

  useEffect(() => {
    if (!sliderRef.current) return;
    const gap = window.innerWidth <= 768 ? 12 : 32;
    const cardWithGap = cardWidth + gap;

    if (isMobile) {
      // Mobile: card is full-width with padding; first card at 0
      const translateValue = -(currentIndex * cardWithGap);
      setTranslateX(translateValue);
      return;
    }

    // When all cards fit, center via wrapper flexbox; no transform offset
    if (allCardsFit) {
      setTranslateX(0);
      return;
    }

    const containerWidth = sliderRef.current.parentElement?.parentElement?.clientWidth ||
                           sliderRef.current.parentElement?.clientWidth ||
                           window.innerWidth;
    const actualWidth = Math.min(containerWidth, 1600);
    const arrowSpace = 100;
    const availableWidth = actualWidth - (arrowSpace * 2);
    const totalCardsWidth = (cardWidth * cardsPerView) + (gap * (cardsPerView - 1));
    const centerOffset = arrowSpace + (availableWidth - totalCardsWidth) / 2;
    const translateValue = centerOffset - (currentIndex * cardWithGap);
    setTranslateX(translateValue);
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

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleShowAll = async () => {
    if (fetchAllUrl && allProducts.length <= mobileLimit) {
      setIsLoadingAll(true);
      try {
        const response = await fetch(fetchAllUrl);
        const data = await response.json();
        if (data.success && data.products) {
          const mappedProducts = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category,
            image: p.logo_url || p.featured_image_url || '/images/nnaud-io/NNPurp1.webp',
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            backgroundImage: p.background_image_url || p.background_video_url || '',
            price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : 0),
            sale_price: p.sale_price,
          }));
          setAllProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching all products:', error);
      } finally {
        setIsLoadingAll(false);
      }
    }
    setShowAll(true);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < maxIndex) {
      setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  return (
    <SectionContainer id={id}>
      <ContentContainer>
        {eyebrow ? (
          <SectionEyebrow
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {eyebrow}
          </SectionEyebrow>
        ) : null}
        <SectionTitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </SectionTitle>

        {subtitle && (
          <SectionSubtitle
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {subtitle}
          </SectionSubtitle>
        )}

        {footerNote ? <SectionFooterNote>{footerNote}</SectionFooterNote> : null}

        {visualImage ? (
          <SectionVisual
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(7, 8, 15, 0.15), rgba(7, 8, 15, 0.76)), url("${visualImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <SectionVisualOverlay>
              {visualTitle ? <SectionVisualTitle>{visualTitle}</SectionVisualTitle> : null}
              {visualBody ? <SectionVisualBody>{visualBody}</SectionVisualBody> : null}
            </SectionVisualOverlay>
          </SectionVisual>
        ) : null}

        {isMobile && showAll ? (
        <ProductsGrid>
            {products.map((product, index) => {
              const productData = {
                id: product.id,
                name: product.name,
                slug: product.slug,
                tagline: product.tagline,
                short_description: (product as any).short_description,
                description: product.description,
                category: (product as any).category,
                price: typeof product.price === 'string'
                  ? parseFloat(product.price.replace('$', '')) || 0
                  : product.price,
                sale_price: product.sale_price,
                featured_image_url: product.featured_image_url || undefined,
                logo_url: product.logo_url || undefined,
                image: product.image || product.featured_image_url || product.logo_url || '/images/nnaud-io/NNPurp1.webp',
                hasMultiplePricing: product.hasMultiplePricing,
                compareAtPrice: product.compareAtPrice,
              };

              return (
            <ProductCard
              key={product.id}
                  product={productData}
                  index={index}
                  showCartButton={true}
                />
              );
            })}
          </ProductsGrid>
        ) : (
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
                  {displayedProducts.map((product, index) => {
                    const productData = {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      tagline: product.tagline,
                      short_description: (product as any).short_description,
                      description: product.description,
                      category: (product as any).category,
                      price: typeof product.price === 'string'
                        ? parseFloat(product.price.replace('$', '')) || 0
                        : product.price,
                      sale_price: product.sale_price,
                      featured_image_url: product.featured_image_url || undefined,
                      logo_url: product.logo_url || undefined,
                      image: product.image || product.featured_image_url || product.logo_url || '/images/nnaud-io/NNPurp1.webp',
                      hasMultiplePricing: product.hasMultiplePricing,
                      compareAtPrice: product.compareAtPrice,
                    };

                    return (
                      <ProductCardWrapper key={product.id} $width={cardWidth}>
                        <ProductCard
                          product={productData}
                          index={index}
                          showCartButton={true}
                          showPluginType={false}
                        />
                      </ProductCardWrapper>
                    );
                  })}
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
              {displayedProducts.map((product, index) => {
                const productData = {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  tagline: product.tagline,
                  short_description: (product as any).short_description,
                  description: product.description,
                  category: (product as any).category,
                  price: typeof product.price === 'string'
                    ? parseFloat(product.price.replace('$', '')) || 0
                    : product.price,
                  sale_price: product.sale_price,
                  featured_image_url: product.featured_image_url || undefined,
                  logo_url: product.logo_url || undefined,
                  image: product.image || product.featured_image_url || product.logo_url || '/images/nnaud-io/NNPurp1.webp',
                  hasMultiplePricing: product.hasMultiplePricing,
                  compareAtPrice: product.compareAtPrice,
                };

                return (
                  <ProductCardWrapper key={product.id} $width={cardWidth}>
                    <ProductCard
                      product={productData}
                      index={index}
                      showCartButton={true}
                      showPluginType={false}
                    />
                  </ProductCardWrapper>
                );
              })}
            </ProductsSlider>
            )}

            {displayedProducts.length > cardsPerView && (
              <>
                <NavigationButton
                  $direction="left"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prevSlide();
                  }}
                  disabled={currentIndex === 0}
                  aria-label="Previous products"
                >
                  <FaChevronLeft />
                </NavigationButton>
                <NavigationButton
                  $direction="right"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextSlide();
                  }}
                  disabled={currentIndex >= maxIndex || displayedProducts.length <= cardsPerView}
                  aria-label="Next products"
                >
                  <FaChevronRight />
                </NavigationButton>
              </>
            )}

            {!isMobile && maxIndex > 0 && (
              <DotsContainer>
                {Array.from({ length: Math.ceil((displayedProducts.length - cardsPerView) / cardsPerView) + 1 }).map((_, index) => {
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
        )}

        {browseAllHref ? (
          <SectionActions>
            <SectionActionLink href={browseAllHref}>
              {browseAllLabel ?? `Browse All ${title}`}
            </SectionActionLink>
          </SectionActions>
        ) : null}

        {isMobile && !showAll && (fetchAllUrl || allProducts.length > mobileLimit) && (
          <ShowAllButton
            onClick={handleShowAll}
            disabled={isLoadingAll}
          >
            {isLoadingAll ? 'Loading...' : `Show All (${allProducts.length})`}
          </ShowAllButton>
        )}
      </ContentContainer>
    </SectionContainer>
  );
};

export default ProductsSection;
