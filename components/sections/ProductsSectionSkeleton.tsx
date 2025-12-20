"use client";

import React from "react";
import styled from "styled-components";
import ProductCardSkeleton from "@/components/common/ProductCardSkeleton";

const SectionContainer = styled.section`
  padding: 60px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  position: relative;
  overflow: visible;
`;

const ContentContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
`;

const SectionTitle = styled.div`
  font-size: 3.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  height: 3.5rem;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  max-width: 400px;
  margin: 0 auto 1rem;
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
    height: 2.5rem;
  }
`;

const SectionSubtitle = styled.div`
  font-size: 1.3rem;
  text-align: center;
  height: 1.3rem;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  max-width: 600px;
  margin: 0 auto 1.5rem;
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    height: 1.1rem;
    margin-bottom: 2rem;
  }
`;

const SliderWrapper = styled.div`
  position: relative;
  margin-top: 2rem;
  overflow: hidden;
  padding: 0;
`;

const ProductsSlider = styled.div<{ $centered?: boolean }>`
  display: flex;
  gap: 2rem;
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

interface ProductsSectionSkeletonProps {
  title?: string;
  subtitle?: string;
  cardCount?: number;
  cardWidth?: number;
}

export default function ProductsSectionSkeleton({ 
  title, 
  subtitle, 
  cardCount = 4,
  cardWidth = 300 
}: ProductsSectionSkeletonProps) {
  return (
    <SectionContainer>
      <ContentContainer>
        {title && <SectionTitle>{title}</SectionTitle>}
        {subtitle && <SectionSubtitle>{subtitle}</SectionSubtitle>}
        
        <SliderWrapper>
          <ProductsSlider $centered={cardCount <= 4}>
            {Array.from({ length: cardCount }).map((_, index) => (
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


