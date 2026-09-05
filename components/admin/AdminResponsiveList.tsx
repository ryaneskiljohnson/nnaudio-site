/**
 * @fileoverview Desktop/mobile switch for admin list views. Keeps the existing
 * table on large screens and shows a stacked card list at 768px and below.
 * @module components/admin/AdminResponsiveList
 */

"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";

const MOBILE_QUERY = "(max-width: 768px)";

const Wrapper = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

const MediaDesktop = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MediaMobile = styled.div`
  display: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  @media (max-width: 768px) {
    display: block;
  }
`;

const OnlySlot = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

/**
 * @brief Props for the desktop/mobile list switch.
 */
export interface AdminResponsiveListProps {
  /**
   * Existing table (or grid table) shown at 769px and above.
   */
  desktop: React.ReactNode;
  /**
   * Card stack shown at 768px and below.
   */
  mobile: React.ReactNode;
  /**
   * Optional className forwarded to the wrapper.
   */
  className?: string;
}

/**
 * @brief Renders a desktop table or a mobile card list, one at a time.
 * @param props.desktop Table markup used on desktop.
 * @param props.mobile Card list markup used on mobile.
 * @param props.className Optional wrapper class.
 * @returns A wrapper that shows the viewport-appropriate list.
 * @note Both slots render until `matchMedia` is known so SSR and the first
 * client paint stay aligned. After that, only the active slot stays mounted.
 * @example
 * <AdminResponsiveList desktop={<Table />} mobile={<AdminMobileCardList />} />
 */
export default function AdminResponsiveList({
  desktop,
  mobile,
  className,
}: AdminResponsiveListProps): React.ReactElement {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(MOBILE_QUERY);
    const sync = (): void => {
      setIsMobile(media.matches);
    };

    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  if (isMobile === null) {
    return (
      <Wrapper className={className}>
        <MediaDesktop>{desktop}</MediaDesktop>
        <MediaMobile>{mobile}</MediaMobile>
      </Wrapper>
    );
  }

  return (
    <Wrapper className={className}>
      <OnlySlot>{isMobile ? mobile : desktop}</OnlySlot>
    </Wrapper>
  );
}
