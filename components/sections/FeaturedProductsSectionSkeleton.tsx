"use client";

import React from "react";
import styled from "styled-components";
import ProductCardSkeleton from "@/components/common/ProductCardSkeleton";

const SectionContainer = styled.section`
  padding: 120px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  position: relative;
  overflow: visible;
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
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

const PremierSkeleton = styled.div`
  margin-top: 4rem;
  margin-bottom: 4rem;
  border-radius: 32px;
  overflow: hidden;
  min-height: 600px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border: 3px solid rgba(255, 255, 255, 0.15);
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @media (max-width: 768px) {
    min-height: 400px;
  }
`;

const SliderWrapper = styled.div`
  position: relative;
  margin-top: 3rem;
  overflow: hidden;
  padding: 0;
  width: 100%;
`;

const ProductsSlider = styled.div<{ $centered?: boolean }>`
  display: flex;
  gap: 2rem;
  ${props => props.$centered ? 'justify-content: center;' : ''}
  
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

export default function FeaturedProductsSectionSkeleton() {
  // Calculate card width (half of container minus gap)
  const cardWidth = typeof window !== 'undefined' 
    ? (Math.min(window.innerWidth, 1400) - 200 - 32) / 2 
    : 600;

  return (
    <SectionContainer>
      <ContentContainer>
        <SectionTitle>Spotlight</SectionTitle>
        
        <PremierSkeleton />
        
        <SliderWrapper>
          <ProductsSlider $centered={true}>
            {Array.from({ length: 2 }).map((_, index) => (
              <ProductCardWrapper key={index} $width={cardWidth}>
                <ProductCardSkeleton index={index} />
              </ProductCardWrapper>
            ))}
          </ProductsSlider>
        </SliderWrapper>
      </ContentContainer>
    </SectionContainer>
  );
}


