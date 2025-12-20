"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { cleanHtmlText } from "@/utils/stringUtils";
import ProductCard from "@/components/products/ProductCard";

const SectionContainer = styled.section`
  padding: 120px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  position: relative;
  overflow: visible;
  min-height: 800px;
`;

const ContentContainer = styled.div`
  max-width: 1400px;
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

// Spotlight beams positioned at the top of the section, projecting downward
const SpotlightBeam = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  ${props => props.$side === 'left' ? 'left: 10%;' : 'right: 10%;'}
  width: 1200px;
  height: 2000px;
  pointer-events: none;
  z-index: 1;
  background: ${props => props.$side === 'left' 
    ? `radial-gradient(
        ellipse 25% 40% at 30% 0%,
        rgba(138, 43, 226, 0.7) 0%,
        rgba(138, 43, 226, 0.4) 20%,
        rgba(138, 43, 226, 0.2) 35%,
        rgba(138, 43, 226, 0.1) 50%,
        rgba(138, 43, 226, 0.05) 65%,
        transparent 85%
      )`
    : `radial-gradient(
        ellipse 25% 40% at 70% 0%,
        rgba(138, 43, 226, 0.7) 0%,
        rgba(138, 43, 226, 0.4) 20%,
        rgba(138, 43, 226, 0.2) 35%,
        rgba(138, 43, 226, 0.1) 50%,
        rgba(138, 43, 226, 0.05) 65%,
        transparent 85%
      )`
  };
  transform: ${props => props.$side === 'left' ? 'rotate(45deg)' : 'rotate(-45deg)'};
  transform-origin: ${props => props.$side === 'left' ? 'top left' : 'top right'};
  animation: ${props => props.$side === 'left' ? 'spotlightLeft' : 'spotlightRight'} 4s ease-in-out infinite;
  
  @keyframes spotlightLeft {
    0%, 100% {
      opacity: 0.8;
      transform: rotate(45deg) scale(1);
    }
    50% {
      opacity: 1;
      transform: rotate(45deg) scale(1.05);
    }
  }
  
  @keyframes spotlightRight {
    0%, 100% {
      opacity: 0.8;
      transform: rotate(-45deg) scale(1);
    }
    50% {
      opacity: 1;
      transform: rotate(-45deg) scale(1.05);
    }
  }
  
  @media (max-width: 768px) {
    width: 800px;
    height: 1500px;
    ${props => props.$side === 'left' ? 'left: 5%;' : 'right: 5%;'}
  }
`;

// Premier Product Section (Centered Design)
const PremierProductContainer = styled(motion.div)`
  position: relative;
  margin-top: 4rem;
  margin-bottom: 4rem;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
`;

const PremierProductCard = styled(motion.div)`
  position: relative;
  border-radius: 24px;
  overflow: visible;
  max-width: 900px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const PremierImageContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 3px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Image wrapper to contain overflow */
  > div:first-child {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 20px;
    overflow: hidden;
    z-index: 0;
  }
  
  img {
    object-fit: cover;
    position: relative;
  }
  
  &:hover {
    transform: translateY(-10px);
    border-color: rgba(138, 43, 226, 0.6);
    box-shadow: 0 40px 80px rgba(138, 43, 226, 0.4);
  }
  
  @media (max-width: 768px) {
    max-width: 100%;
    margin-bottom: 2rem;
  }
`;

const PremierContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 90%;
  padding: 3rem 2rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 768px) {
    width: 95%;
    padding: 2rem 1.5rem;
  }
`;

const PremierTitle = styled.h3`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  
  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
`;

const PremierDescription = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  max-width: 100%;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.25rem;
  }
`;

const PremierActions = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
    flex-direction: column;
  }
`;

const PremierPrice = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #8a2be2;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const PremierButton = styled(motion.button)`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.5);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(138, 43, 226, 0.6);
  }
  
  @media (max-width: 768px) {
    padding: 12px 24px;
    font-size: 0.95rem;
    width: 100%;
    max-width: 280px;
  }
`;

// Slider Section (for remaining products)
const SliderWrapper = styled.div`
  position: relative;
  margin-top: 3rem;
  overflow: hidden;
  padding: 0;
  width: 100%;
`;

const ProductsSlider = styled.div<{ $translateX: number; $centered: boolean }>`
  display: flex;
  gap: 2rem;
  transform: translateX(${props => props.$translateX}px);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  ${props => props.$centered ? 'justify-content: center;' : ''}
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
  
  > * {
    flex-shrink: 0;
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
  
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    
    svg {
      font-size: 1rem;
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
  
  svg {
    font-size: 1.2rem;
  }
`;

interface FeaturedProduct {
  id: number;
  name: string;
  tagline?: string;
  description?: string;
  logo: string;
  thumbnail?: string;
  backgroundImage?: string;
  price: string;
  slug?: string;
  hasMultiplePricing?: boolean;
}

interface FeaturedProductsSectionProps {
  title: string;
  products: FeaturedProduct[];
  id: string;
}

const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({ title, products, id }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  
  // Split products: first is premier, rest go in slider
  const premierProduct = products.length > 0 ? products[0] : null;
  const sliderProducts = products.slice(1);
  
  // HARDCODED: Always show exactly 2 cards in featured slider
  const CARDS_PER_VIEW = 2;
  const maxIndex = Math.max(0, sliderProducts.length - CARDS_PER_VIEW);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const calculateDimensions = () => {
      if (!sliderRef.current) return;
      
      // Get actual container width (ContentContainer, which has max-width: 1400px for featured)
      const containerWidth = sliderRef.current.parentElement?.parentElement?.clientWidth || 
                             sliderRef.current.parentElement?.clientWidth || 
                             window.innerWidth;
      
      // ContentContainer for FeaturedProductsSection has max-width: 1400px
      const actualWidth = Math.min(containerWidth, 1400);
      
      const gap = 32;
      const arrowSpace = 100;
      
      // Calculate available width: container width minus arrow space on both sides
      const availableWidth = actualWidth - (arrowSpace * 2);
      
      // Calculate card width: (available width - gap) / 2
      const width = (availableWidth - gap) / CARDS_PER_VIEW;
      
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
  }, []);

  useEffect(() => {
    if (!sliderRef.current) return;
    
    // Get actual container width
    const containerWidth = sliderRef.current.parentElement?.parentElement?.clientWidth || 
                           sliderRef.current.parentElement?.clientWidth || 
                           window.innerWidth;
    const actualWidth = Math.min(containerWidth, 1400); // ContentContainer max-width for featured
    
    const gap = 32;
    const arrowSpace = 100;
    const availableWidth = actualWidth - (arrowSpace * 2);
    const cardWithGap = cardWidth + gap;
    
    // Calculate total width of 2 visible cards
    const totalCardsWidth = (cardWidth * CARDS_PER_VIEW) + gap;
    
    // Center offset: start position to center the cards
    const centerOffset = arrowSpace + (availableWidth - totalCardsWidth) / 2;
    
    // Translate: start from center, then move left by currentIndex
    const translateValue = centerOffset - (currentIndex * cardWithGap);
    setTranslateX(translateValue);
  }, [currentIndex, cardWidth]);

  const nextSlide = useCallback(() => {
    // Always advance by 2 cards (CARDS_PER_VIEW)
    const calculatedMaxIndex = Math.max(0, sliderProducts.length - CARDS_PER_VIEW);
    if (calculatedMaxIndex > 0) {
      setCurrentIndex((prev) => {
        const next = Math.min(prev + CARDS_PER_VIEW, calculatedMaxIndex);
        return next;
      });
    }
  }, [sliderProducts.length]);

  const prevSlide = useCallback(() => {
    // Always go back by 2 cards (CARDS_PER_VIEW)
    setCurrentIndex((prev) => {
      if (prev > 0) {
        const next = Math.max(prev - CARDS_PER_VIEW, 0);
        return next;
      }
      return 0;
    });
  }, []);

  return (
    <SectionContainer id={id}>
      {/* Spotlight beams */}
      <SpotlightBeam $side="left" />
      <SpotlightBeam $side="right" />
      
      <ContentContainer>
        <SectionTitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </SectionTitle>

        {/* Premier Product */}
        {premierProduct && (
          <PremierProductContainer
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Link 
              href={premierProduct.slug 
                ? (premierProduct.hasMultiplePricing ? `/bundles/${premierProduct.slug}` : `/product/${premierProduct.slug}`)
                : '#'}
              style={{ textDecoration: 'none', color: 'inherit', width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <PremierProductCard
                whileHover={{ scale: 1.02 }}
              >
                <PremierImageContainer>
                  <div>
                    <Image
                      src={premierProduct.thumbnail || premierProduct.logo || '/images/nnaud-io/NNPurp1.png'}
                      alt={premierProduct.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <PremierContent>
                    <PremierTitle>{premierProduct.name}</PremierTitle>
                    <PremierDescription>
                      {cleanHtmlText(premierProduct.tagline || premierProduct.description || '')}
                    </PremierDescription>
                    <PremierActions>
                      {!premierProduct.hasMultiplePricing && (
                        <PremierPrice>{premierProduct.price}</PremierPrice>
                      )}
                      <PremierButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.preventDefault();
                          if (premierProduct.slug) {
                            const url = premierProduct.hasMultiplePricing 
                              ? `/bundles/${premierProduct.slug}`
                              : `/product/${premierProduct.slug}`;
                            window.location.href = url;
                          }
                        }}
                      >
                        Learn More
                      </PremierButton>
                    </PremierActions>
                  </PremierContent>
                </PremierImageContainer>
              </PremierProductCard>
            </Link>
          </PremierProductContainer>
        )}

        {/* Slider for remaining products */}
        {sliderProducts.length > 0 && (
          <SliderWrapper>
            <ProductsSlider
              ref={sliderRef}
              $translateX={translateX}
              $centered={sliderProducts.length <= CARDS_PER_VIEW}
            >
              {sliderProducts.map((product) => {
                const bundleSlugs = ['ultimate-bundle', 'producers-arsenal', 'beat-lab'];
                const isBundle = bundleSlugs.includes(product.slug) || product.hasMultiplePricing;
                const productData = {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  tagline: product.tagline || product.description || '',
                  short_description: product.description,
                  description: product.description,
                  category: isBundle ? 'bundle' : 'featured',
                  price: typeof product.price === 'string' 
                    ? parseFloat(product.price.replace('$', '')) || 0 
                    : 0,
                  sale_price: null,
                  featured_image_url: product.thumbnail || product.logo || undefined,
                  logo_url: product.logo || undefined,
                  image: product.thumbnail || product.logo || '/images/nnaud-io/NNPurp1.png',
                };

                return (
                  <ProductCardWrapper key={product.id} $width={cardWidth}>
                    <ProductCard
                      product={productData}
                      index={0}
                      showCartButton={true}
                    />
                  </ProductCardWrapper>
                );
              })}
            </ProductsSlider>

            {sliderProducts.length > CARDS_PER_VIEW && (
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
                  disabled={currentIndex >= maxIndex || sliderProducts.length <= 2}
                  aria-label="Next products"
                >
                  <FaChevronRight />
                </NavigationButton>
              </>
            )}
          </SliderWrapper>
        )}
      </ContentContainer>
    </SectionContainer>
  );
};

export default FeaturedProductsSection;
