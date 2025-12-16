"use client";

import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProductCard from "@/components/products/ProductCard";

const SectionContainer = styled.section`
  padding: 100px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  position: relative;
  overflow: visible;
  
  &:nth-child(even) {
    background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 50%, #1a1a2e 100%);
  }
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin-bottom: 4rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const SliderWrapper = styled.div`
  position: relative;
  margin-top: 3rem;
  overflow: hidden;
  padding: 0 20px;
  
  @media (max-width: 1200px) {
    padding: 0 60px;
  }
  
  @media (max-width: 768px) {
    padding: 0 50px;
  }
`;

const ProductsSlider = styled.div<{ $translateX: number; $centered: boolean }>`
  display: flex;
  gap: 2rem;
  transform: translateX(${props => props.$translateX}px);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  ${props => props.$centered ? 'justify-content: center;' : ''}
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
`;

const ProductCardWrapper = styled.div`
  flex: 0 0 300px;
  min-width: 0;
  
  @media (max-width: 768px) {
    flex: 0 0 280px;
  }
  
  @media (max-width: 480px) {
    flex: 0 0 260px;
  }
`;

const NavigationButton = styled.button<{ $direction: 'left' | 'right' }>`
    position: absolute;
  top: 50%;
  ${props => props.$direction === 'left' ? 'left: 10px;' : 'right: 10px;'}
  transform: translateY(-50%);
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

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${props => props.$active ? '24px' : '12px'};
  height: 12px;
  border-radius: 6px;
  background: ${props => props.$active ? 'rgba(138, 43, 226, 0.8)' : 'rgba(255, 255, 255, 0.3)'};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$active ? 'rgba(138, 43, 226, 1)' : 'rgba(255, 255, 255, 0.5)'};
  }
`;

const ShowAllButton = styled(motion.button)`
  display: block;
  margin: 2rem auto 0;
  padding: 14px 32px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(138, 43, 226, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ProductsGrid = styled.div`
  display: none;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    display: grid;
  }
`;

interface Product {
  id: number | string;
  name: string;
  description?: string;
  tagline?: string;
  image?: string;
  featured_image_url?: string;
  logo_url?: string;
  backgroundImage?: string;
  price: number | string;
  sale_price?: number | null;
  slug?: string;
}

interface ProductsSectionProps {
  title: string;
  subtitle: string;
  products: Product[];
  id: string;
  fetchAllUrl?: string; // API URL to fetch all products when "Show All" is clicked
}

const ProductsSection: React.FC<ProductsSectionProps> = ({ title, subtitle, products, id, fetchAllUrl }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [cardsPerView, setCardsPerView] = useState(4);
  
  // Responsive card widths
  const getCardWidth = () => {
    if (typeof window === 'undefined') return 300;
    if (window.innerWidth <= 480) return 260;
    if (window.innerWidth <= 768) return 280;
    return 300;
  };
  
  const gap = typeof window !== 'undefined' && window.innerWidth <= 768 ? 24 : 32; // 1.5rem or 2rem
  const mobileLimit = 4;
  const displayedProducts = isMobile && !showAll ? allProducts.slice(0, mobileLimit) : allProducts;
  const maxIndex = Math.max(0, displayedProducts.length - cardsPerView);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const calculateCardsPerView = () => {
      if (isMobile && !showAll) {
        setCardsPerView(mobileLimit);
        return;
      }
      
      // Use a timeout to ensure DOM is ready
      const calculate = () => {
        if (!sliderRef.current) {
          // Fallback if ref not ready yet
          const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1400;
          const padding = fallbackWidth <= 768 ? 100 : (fallbackWidth <= 1200 ? 120 : 40);
          const availableWidth = fallbackWidth - padding;
          const currentCardWidth = getCardWidth();
          const currentGap = fallbackWidth <= 768 ? 24 : 32;
          const cardWithGap = currentCardWidth + currentGap;
          const calculated = Math.floor(availableWidth / cardWithGap);
          // Don't cap by displayedProducts.length - we want to show arrows if there are more products
          const maxCards = Math.max(1, calculated);
          setCardsPerView(maxCards);
          return;
        }
        
        const containerWidth = sliderRef.current.parentElement?.clientWidth || window.innerWidth;
        const padding = window.innerWidth <= 768 ? 100 : (window.innerWidth <= 1200 ? 120 : 40);
        const availableWidth = containerWidth - padding;
        
        // Get responsive card width
        const currentCardWidth = getCardWidth();
        const currentGap = window.innerWidth <= 768 ? 24 : 32;
        const cardWithGap = currentCardWidth + currentGap;
        
        // Calculate how many full cards can fit
        const calculated = Math.floor(availableWidth / cardWithGap);
        // Don't cap by displayedProducts.length - we want to show arrows if there are more products
        const maxCards = Math.max(1, calculated);
        
        setCardsPerView(maxCards);
      };
      
      // Try immediately, then retry after a short delay if needed
      calculate();
      if (!sliderRef.current) {
        setTimeout(calculate, 100);
      }
    };

    // Initial calculation with delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      calculateCardsPerView();
    }, 50);
    
    // Recalculate on resize
    window.addEventListener('resize', calculateCardsPerView);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateCardsPerView);
    };
  }, [displayedProducts.length, isMobile, showAll]);

  useEffect(() => {
    const newMaxIndex = Math.max(0, displayedProducts.length - cardsPerView);
    if (currentIndex > newMaxIndex) {
      setCurrentIndex(newMaxIndex);
    }
  }, [cardsPerView, displayedProducts.length, currentIndex]);

  useEffect(() => {
    if (!sliderRef.current) return;
    
    const containerWidth = sliderRef.current.parentElement?.clientWidth || window.innerWidth;
    const padding = window.innerWidth <= 768 ? 100 : (window.innerWidth <= 1200 ? 120 : 40);
    const availableWidth = containerWidth - padding;
    
    const currentCardWidth = getCardWidth();
    const currentGap = window.innerWidth <= 768 ? 24 : 32;
    const cardWithGap = currentCardWidth + currentGap;
    const totalCardsWidth = displayedProducts.length * cardWithGap - currentGap;
    
    // Center the cards if they don't fill the entire width
    if (totalCardsWidth < availableWidth && displayedProducts.length <= cardsPerView) {
      // Center the cards
      const offset = (availableWidth - totalCardsWidth) / 2;
      setTranslateX(offset);
    } else if (displayedProducts.length > cardsPerView) {
      // Normal sliding behavior - show maximum cards that fit
      setTranslateX(-currentIndex * cardWithGap);
    } else {
      // All cards fit, center them
      const offset = (availableWidth - totalCardsWidth) / 2;
      setTranslateX(offset);
    }
  }, [currentIndex, displayedProducts.length, cardsPerView]);

  const nextSlide = () => {
    const calculatedMaxIndex = Math.max(0, displayedProducts.length - cardsPerView);
    if (calculatedMaxIndex > 0) {
      setCurrentIndex((prev) => {
        const next = Math.min(prev + 1, calculatedMaxIndex);
        return next;
      });
    }
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return 0;
    });
  };

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
          // Map the fetched products to match the expected format
          const mappedProducts = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            tagline: p.tagline || p.short_description || '',
            short_description: p.short_description,
            description: p.description,
            category: p.category,
            image: p.logo_url || p.featured_image_url || '',
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

  // Touch/swipe support
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

    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }
  };

  return (
    <SectionContainer id={id}>
      <ContentContainer>
        <SectionTitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </SectionTitle>
        
        <SectionSubtitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {subtitle}
        </SectionSubtitle>

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
                image: product.image || product.featured_image_url || product.logo_url || undefined,
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
          <SliderWrapper>
            <ProductsSlider
              ref={sliderRef}
              $translateX={translateX}
              $centered={displayedProducts.length <= cardsPerView}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {displayedProducts.map((product, index) => {
              // Convert landing page product format to ProductCard format
              // Card views should ONLY use tagline/short_description, never full description
              const productData = {
                id: product.id,
                name: product.name,
                slug: product.slug,
                tagline: product.tagline, // Only tagline for cards
                short_description: (product as any).short_description, // Fallback if tagline missing
                description: product.description, // Full description kept for product pages only
                category: (product as any).category, // For fallback subtitle generation
                price: typeof product.price === 'string' 
                  ? parseFloat(product.price.replace('$', '')) || 0 
                  : product.price,
                sale_price: product.sale_price,
                featured_image_url: product.featured_image_url || undefined,
                logo_url: product.logo_url || undefined,
                image: product.image || product.featured_image_url || product.logo_url || undefined,
              };

              return (
                <ProductCardWrapper key={product.id}>
                  <ProductCard
                    product={productData}
                    index={index}
                    showCartButton={true}
                  />
                </ProductCardWrapper>
              );
            })}
          </ProductsSlider>

            {/* Always show navigation arrows when there are more products than can fit */}
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
                  disabled={currentIndex >= maxIndex}
                  aria-label="Next products"
                >
                  <FaChevronRight />
                </NavigationButton>
              </>
            )}

            {!isMobile && maxIndex > 0 && (
              <DotsContainer>
                {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                  <Dot
                    key={index}
                    $active={currentIndex === index}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </DotsContainer>
            )}
          </SliderWrapper>
        )}

        {isMobile && !showAll && (fetchAllUrl || allProducts.length > mobileLimit) && (
          <ShowAllButton
            onClick={handleShowAll}
            disabled={isLoadingAll}
            whileHover={{ scale: isLoadingAll ? 1 : 1.05 }}
            whileTap={{ scale: isLoadingAll ? 1 : 0.95 }}
            style={{ opacity: isLoadingAll ? 0.7 : 1 }}
          >
            {isLoadingAll ? 'Loading...' : `Show All${fetchAllUrl ? '' : ` (${allProducts.length} Products)`}`}
          </ShowAllButton>
        )}
      </ContentContainer>
    </SectionContainer>
  );
};

export default ProductsSection;

