/**
 * @fileoverview "New" badge for products with `is_new` enabled in admin.
 * @module components/products/ProductNewBadge
 */

"use client";

import React from "react";
import styled, { css } from "styled-components";

const Badge = styled.span<{ $variant: "card" | "inline" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: #0a0a0a;
  background: linear-gradient(135deg, #4ecdc4 0%, #2dd4bf 100%);
  box-shadow: 0 4px 14px rgba(78, 205, 196, 0.45);

  ${({ $variant }) =>
    $variant === "card"
      ? css`
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.72rem;
        `
      : css`
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          margin-left: 8px;
        `}
`;

export interface ProductNewBadgeProps {
  /** @brief When false, nothing is rendered. */
  show?: boolean;
  /** @brief `card` overlays product art; `inline` sits beside titles in admin tables. */
  variant?: "card" | "inline";
}

/**
 * @brief Renders a teal "New" badge when `show` is true.
 * @param show - Whether the product is marked as new.
 * @param variant - Layout variant for card overlay vs inline admin label.
 * @returns Badge element or null.
 */
export default function ProductNewBadge({
  show = false,
  variant = "card",
}: ProductNewBadgeProps) {
  if (!show) return null;
  return <Badge $variant={variant}>New</Badge>;
}
