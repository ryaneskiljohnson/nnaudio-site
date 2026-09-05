/**
 * @fileoverview Mobile-only loading skeletons and empty state for admin lists.
 * @module components/admin/AdminMobileLoading
 */

"use client";

import React from "react";
import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.9;
  }
  100% {
    opacity: 0.45;
  }
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const SkeletonCard = styled.div`
  background-color: var(--card-bg);
  border-radius: 14px;
  padding: 1.1rem 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

const Bar = styled.div<{ $width: string; $height?: string }>`
  width: ${(props) => props.$width};
  height: ${(props) => props.$height ?? "12px"};
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  margin-bottom: 0.65rem;
`;

const ChipRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-top: 0.4rem;
`;

const Chip = styled.div`
  height: 48px;
  border-radius: 10px;
  background: rgba(108, 99, 255, 0.12);
`;

const Empty = styled.div`
  background-color: var(--card-bg);
  border-radius: 14px;
  padding: 2rem 1.25rem;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.95rem;
  line-height: 1.45;
`;

/**
 * @brief Props for mobile list loading skeletons.
 */
export interface AdminMobileLoadingProps {
  /**
   * Number of placeholder cards.
   */
  count?: number;
}

/**
 * @brief Card-shaped loading placeholders for mobile admin lists.
 * @param props.count How many skeleton cards to render. Defaults to 3.
 * @returns Animated skeleton stack.
 * @example
 * <AdminMobileLoading count={4} />
 */
export function AdminMobileLoading({
  count = 3,
}: AdminMobileLoadingProps): React.ReactElement {
  return (
    <Stack>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} aria-hidden="true">
          <Bar $width="62%" $height="16px" />
          <Bar $width="40%" />
          <ChipRow>
            <Chip />
            <Chip />
          </ChipRow>
        </SkeletonCard>
      ))}
    </Stack>
  );
}

/**
 * @brief Empty-state card used when a mobile list has no rows.
 * @param props.message User-facing empty copy.
 * @returns Centered empty card.
 * @example
 * <AdminMobileEmpty message="No users match this search." />
 */
export function AdminMobileEmpty({
  message,
}: {
  message: string;
}): React.ReactElement {
  return <Empty>{message}</Empty>;
}
