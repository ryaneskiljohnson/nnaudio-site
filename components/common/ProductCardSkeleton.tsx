"use client";

import React from "react";
import styled from "styled-components";

const SkeletonContainer = styled.div`
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 420px;
  background: rgba(26, 26, 26, 0.5);
`;

const SkeletonImage = styled.div`
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

const SkeletonInfo = styled.div`
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
`;

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  height: ${props => props.$height || '1rem'};
  width: ${props => props.$width || '100%'};
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

interface ProductCardSkeletonProps {
  index?: number;
}

export default function ProductCardSkeleton({ index = 0 }: ProductCardSkeletonProps) {
  return (
    <SkeletonContainer
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <SkeletonImage />
      <SkeletonInfo>
        <div>
          <SkeletonLine $height="1.3rem" $width="80%" style={{ marginBottom: '0.5rem' }} />
          <SkeletonLine $height="0.85rem" $width="60%" style={{ marginBottom: '0.25rem' }} />
          <SkeletonLine $height="0.85rem" $width="90%" />
        </div>
        <SkeletonLine $height="1.3rem" $width="40%" />
      </SkeletonInfo>
    </SkeletonContainer>
  );
}


