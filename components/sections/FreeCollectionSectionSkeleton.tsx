"use client";

/**
 * @fileoverview Placeholder for the free collection row while the client
 * catalog fetch is in flight. Matches FreeCollectionSection layout height.
 * @module components/sections/FreeCollectionSectionSkeleton
 */

import React from "react";
import styled from "styled-components";
import ProductCardSkeleton from "@/components/common/ProductCardSkeleton";

const Section = styled.section`
  padding: 72px 20px 84px;
  min-height: 720px;
  background:
    radial-gradient(circle at top left, rgba(108, 99, 255, 0.12), transparent 24%),
    linear-gradient(180deg, #07080f 0%, #0d1120 100%);

  @media (max-width: 768px) {
    min-height: 640px;
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  margin: 0 0 0.9rem;
  text-align: center;
  color: var(--text);
  font-size: clamp(2.1rem, 3.8vw, 3.3rem);
`;

const CardRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  overflow: hidden;
`;

/**
 * @brief Skeleton for the homepage free-tools row.
 * @returns Section placeholder matching FreeCollectionSection dimensions.
 */
export default function FreeCollectionSectionSkeleton() {
  return (
    <Section aria-hidden>
      <Inner>
        <Title>Free Tools</Title>
        <CardRow>
          {Array.from({ length: 3 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </CardRow>
      </Inner>
    </Section>
  );
}
