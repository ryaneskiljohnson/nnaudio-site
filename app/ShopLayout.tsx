"use client";

/**
 * @fileoverview Full commerce chrome for every public route except `/`.
 * Loaded as a separate client chunk so the marketing homepage does not
 * download Auth, Cart, header, footer, or chat.
 * @module app/ShopLayout
 */

import React, { useEffect, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import NextHeader from "@/components/layout/NextHeader";
import Footer from "@/components/layout/Footer";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import PromotionBanner from "@/components/banners/PromotionBanner";
import NNAudioAccessBanner from "@/components/banners/NNAudioAccessBanner";
import { shopTheme } from "@/lib/shop-theme";

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), {
  ssr: false,
  loading: () => null,
});

const SitePresenceTracker = dynamic(
  () => import("@/components/analytics/SitePresenceTracker"),
  { ssr: false, loading: () => null }
);

const LayoutWrapper = styled.div.attrs({ suppressHydrationWarning: true })`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--background);
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
`;

const Main = styled.main.attrs({ suppressHydrationWarning: true })`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;

  > * {
    margin: 0 auto;
    width: 100%;
    max-width: 100%;
  }
`;

/**
 * @brief Auth, cart, header, banners, and chat around shop routes.
 * @param children Route content.
 * @returns Shop app shell.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [hasActivePromotion, setHasActivePromotion] = useState(false);
  /** When false, top-banner choice is deferred so access/promotion do not swap as async data arrives. */
  const [promotionLoaded, setPromotionLoaded] = useState(false);

  useEffect(() => {
    const checkPromotion = async () => {
      try {
        const response = await fetch("/api/promotions/active");
        const data = await response.json();
        setHasActivePromotion(data.success && !!data.promotion);
      } catch {
        setHasActivePromotion(false);
      } finally {
        setPromotionLoaded(true);
      }
    };

    checkPromotion();
  }, []);

  useEffect(() => {
    const needsYoutube =
      pathname?.includes("/admin") ||
      pathname?.includes("/dashboard") ||
      pathname?.includes("/tutorials");

    if (!needsYoutube) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && !window.YT) {
          console.log("Loading YouTube Iframe API...");
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          script.async = true;
          script.onload = () => {
            console.log("YouTube Iframe API script loaded");
          };
          script.onerror = () => {
            console.error("Failed to load YouTube Iframe API script");
          };
          document.head.appendChild(script);

          window.onYouTubeIframeAPIReady = () => {
            console.log("YouTube Iframe API ready callback triggered");
          };
        }
      }, 3000);

      return () => clearTimeout(timer);
    }

    if (typeof window !== "undefined" && !window.YT) {
      console.log("Loading YouTube Iframe API...");
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onload = () => {
        console.log("YouTube Iframe API script loaded");
      };
      script.onerror = () => {
        console.error("Failed to load YouTube Iframe API script");
      };
      document.head.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube Iframe API ready callback triggered");
      };
    } else if (window.YT) {
      console.log("YouTube API already loaded");
    }
  }, [pathname]);

  const isAuthRoute =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/create-password") ||
    pathname?.startsWith("/checkout-success") ||
    pathname?.startsWith("/checkout-canceled");

  const isDashboardRoute =
    pathname?.includes("/dashboard") ||
    pathname?.includes("/profile") ||
    pathname?.includes("/billing") ||
    pathname?.includes("/downloads") ||
    pathname?.includes("/settings") ||
    pathname?.includes("/support") ||
    pathname?.includes("/my-orders") ||
    pathname?.includes("/my-products");

  const isAdminRoute = pathname?.includes("/admin");
  const shouldHideHeaderFooter =
    isAuthRoute || isDashboardRoute || isAdminRoute;
  const shouldHideChat = isAuthRoute;

  return (
    <ThemeProvider theme={shopTheme}>
      <ToastProvider>
        <CartProvider>
          <AuthProvider>
            <LayoutContent
              shouldHideHeaderFooter={shouldHideHeaderFooter}
              shouldHideChat={shouldHideChat}
              hasActivePromotion={hasActivePromotion}
              promotionLoaded={promotionLoaded}
              pathname={pathname}
            >
              {children}
            </LayoutContent>
          </AuthProvider>
        </CartProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

/**
 * @brief Inner shop chrome that reads auth for banner choice.
 * @param children Route content.
 * @param shouldHideHeaderFooter Auth, dashboard, and admin routes.
 * @param shouldHideChat Auth routes hide the chat widget.
 * @param hasActivePromotion Promotion API reported an active sale.
 * @param promotionLoaded Promotion fetch has settled.
 * @param pathname Current path, or null during the first client paint.
 * @returns Header, banners, main, footer, and optional chat.
 */
function LayoutContent({
  children,
  shouldHideHeaderFooter,
  shouldHideChat,
  hasActivePromotion,
  promotionLoaded,
  pathname,
}: {
  children: React.ReactNode;
  shouldHideHeaderFooter: boolean;
  shouldHideChat: boolean;
  hasActivePromotion: boolean;
  promotionLoaded: boolean;
  pathname: string | null;
}) {
  const { user, loading: authLoading } = useAuth();

  /**
   * Single decision point: do not mount access or promotion until promotion API and auth
   * have settled. Otherwise the strip flickers (e.g. access → promotion when the fetch
   * completes, or promotion → access when subscription resolves to lifetime).
   */
  const bannersReady = promotionLoaded && !authLoading;
  const isLandingPage = pathname === "/";
  const shouldShowPromotion =
    bannersReady &&
    hasActivePromotion &&
    user?.profile?.subscription !== "lifetime";
  const showAccessBanner =
    bannersReady && !isLandingPage && !shouldShowPromotion;
  const hasAnyBanner = showAccessBanner || shouldShowPromotion;

  useEffect(() => {
    const root = document.documentElement;
    const stripHeight =
      shouldShowPromotion && isLandingPage ? "50px" : "0px";
    root.style.setProperty("--site-promo-strip-height", stripHeight);
    return () => {
      root.style.removeProperty("--site-promo-strip-height");
    };
  }, [shouldShowPromotion, isLandingPage]);

  return (
    <LayoutWrapper>
      {!shouldHideHeaderFooter && (
        <NextHeader hasActiveBanner={hasAnyBanner} />
      )}
      {!shouldHideHeaderFooter && showAccessBanner && <NNAudioAccessBanner />}
      {!shouldHideHeaderFooter && shouldShowPromotion && (
        <PromotionBanner
          showCountdown={true}
          overlay={isLandingPage}
        />
      )}
      <Main>{children}</Main>
      {!shouldHideHeaderFooter && <Footer />}
      {!shouldHideChat && <ChatWidget />}
      <SitePresenceTracker />
    </LayoutWrapper>
  );
}
