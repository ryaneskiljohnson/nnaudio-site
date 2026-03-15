/**
 * @fileoverview Related Products Slider component with horizontal scrolling
 * @module components/RelatedProductsSlider
 * 
 * @brief Displays a horizontal slider of related products with smooth scrolling
 * 
 * Features:
 * - Horizontal scroll with navigation buttons
 * - Responsive grid that adapts to screen size
 * - Hover effects and animations
 * - Links to product pages
 * - Displays product image, name, and price
 */

'use client';

import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa';

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  featured_image_url: string | null;
  logo_url: string | null;
  tagline: string | null;
  category: string;
  average_rating: number | null;
  review_count: number | null;
}

interface RelatedProductsSliderProps {
  products: RelatedProduct[];
}

const SliderContainer = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
  padding: 20px 0;
`;

const SliderWrapper = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const SliderTrack = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  padding: 0 10px;
  min-width: min-content;
`;

const ProductCard = styled(motion.div)`
  min-width: 280px;
  max-width: 280px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: translateY(-5px);
    border-color: rgba(138, 43, 226, 0.5);
    box-shadow: 0 8px 24px rgba(138, 43, 226, 0.3);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

const ProductInfo = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ProductName = styled.h3`
  color: white;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3;
  min-height: 2.6rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ProductTagline = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.4rem;
`;

const ProductRating = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
`;

const Stars = styled.div`
  display: flex;
  gap: 2px;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const Price = styled.div`
  color: #4ecdc4;
  font-size: 1.5rem;
  font-weight: 700;
`;

const OriginalPrice = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 1rem;
  text-decoration: line-through;
`;

const FreeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, #4ecdc4 0%, #44a5a0 100%);
  color: white;
  border-radius: 20px;
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NavButton = styled(motion.button)<{ $direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.$direction === 'left' ? 'left: -20px' : 'right: -20px'};
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(138, 43, 226, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: ${props => props.disabled ? 0.3 : 1};
  pointer-events: ${props => props.disabled ? 'none' : 'all'};
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: rgba(138, 43, 226, 1);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 20px rgba(138, 43, 226, 0.6);
  }
  
  @media (max-width: 768px) {
    ${props => props.$direction === 'left' ? 'left: 0' : 'right: 0'};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.1rem;
`;

/**
 * @brief RelatedProductsSlider component
 * 
 * @param products - Array of related products to display
 * 
 * @example
 * <RelatedProductsSlider products={relatedProducts} />
 */
export default function RelatedProductsSlider({ products }: RelatedProductsSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [products]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    
    scrollElement.addEventListener('scroll', updateScrollButtons);
    return () => scrollElement.removeEventListener('scroll', updateScrollButtons);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 320; // Card width + gap
    const newPosition = direction === 'left' 
      ? scrollRef.current.scrollLeft - scrollAmount 
      : scrollRef.current.scrollLeft + scrollAmount;
    
    scrollRef.current.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
  };

  if (!products || products.length === 0) {
    return (
      <EmptyState>
        No related products found
      </EmptyState>
    );
  }

  return (
    <SliderContainer>
      {products.length > 3 && (
        <>
          <NavButton
            $direction="left"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Scroll left"
          >
            <FaChevronLeft size={20} />
          </NavButton>
          <NavButton
            $direction="right"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Scroll right"
          >
            <FaChevronRight size={20} />
          </NavButton>
        </>
      )}
      
      <SliderWrapper ref={scrollRef}>
        <SliderTrack>
          {products.map((product, index) => {
            const displayPrice = product.sale_price !== null ? product.sale_price : product.price;
            const hasDiscount = product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price;
            const isFree = product.sale_price === 0 || (product.price === 0 && product.sale_price === null);

            return (
              <Link key={product.id} href={`/product/${product.slug}`} style={{ textDecoration: 'none' }}>
                <ProductCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                >
                  <ImageContainer>
                    {(product.featured_image_url || product.logo_url) ? (
                      <Image
                        src={product.featured_image_url || product.logo_url || ''}
                        alt={product.name}
                        fill
                        sizes="280px"
                        style={{ objectFit: 'contain', padding: '20px' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        color: 'rgba(255, 255, 255, 0.3)',
                        fontWeight: 700
                      }}>
                        {product.name[0]}
                      </div>
                    )}
                  </ImageContainer>
                  
                  <ProductInfo>
                    <ProductName>{product.name}</ProductName>
                    
                    {product.tagline && (
                      <ProductTagline>{product.tagline}</ProductTagline>
                    )}
                    
                    {product.average_rating && product.average_rating > 0 && product.review_count && product.review_count > 0 && (
                      <ProductRating>
                        <Stars>
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              size={12}
                              style={{
                                color: i < Math.round(product.average_rating || 0) ? '#ffd700' : 'rgba(255, 255, 255, 0.2)'
                              }}
                            />
                          ))}
                        </Stars>
                        <span>{product.average_rating.toFixed(1)}</span>
                      </ProductRating>
                    )}
                    
                    <PriceContainer>
                      {isFree ? (
                        <FreeBadge>FREE</FreeBadge>
                      ) : (
                        <>
                          <Price>${displayPrice}</Price>
                          {hasDiscount && (
                            <OriginalPrice>${product.price}</OriginalPrice>
                          )}
                        </>
                      )}
                    </PriceContainer>
                  </ProductInfo>
                </ProductCard>
              </Link>
            );
          })}
        </SliderTrack>
      </SliderWrapper>
    </SliderContainer>
  );
}
