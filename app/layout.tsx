/**
 * Ensure React is on global before any styled-components import (see set-global-react.ts).
 * Must be the first import so it runs before StyledComponentsRegistry and page trees.
 */
import "./set-global-react";

import { Geist } from "next/font/google";
import { Montserrat } from "next/font/google";
import { Metadata } from "next";
import StyledComponentsRegistry from "./registry";
import ClientLayout from "./ClientLayout";
import I18nProvider from "@/app/i18n/I18nProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Analytics from "@/components/analytics/Analytics";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Force dynamic rendering for all routes to prevent React undefined errors during static generation
// This is needed because client components with styled-components require React during module evaluation
export const dynamic = 'force-dynamic';

// Metadata configuration – favicon and icons use NNAud.io logo (dev and release)
export const metadata: Metadata = {
  title: "NNAud.io – Resources for Modern Music Producers",
  description: "Discover premium plugins, sample packs, and tools designed to elevate your music production workflow",
  icons: {
    icon: [
      { url: "/images/nnaud-io/logo-icon.webp", sizes: "any" },
      { url: "/images/nnaud-io/logo-icon-32x32.webp", type: "image/webp", sizes: "32x32" },
      { url: "/images/nnaud-io/logo-icon-16x16.webp", type: "image/webp", sizes: "16x16" },
    ],
    apple: [
      { url: "/images/nnaud-io/logo-icon.webp", sizes: "180x180", type: "image/webp" },
    ],
    shortcut: "/images/nnaud-io/logo-icon.webp",
  },
};

// Theme configuration
const theme = {
  colors: {
    primary: "#6c63ff",
    accent: "#4ecdc4",
    background: "#121212",
    cardBg: "#1e1e1e",
    inputBg: "#2a2a2a",
    text: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    textTertiary: "rgba(255, 255, 255, 0.4)",
    border: "rgba(255, 255, 255, 0.1)",
    success: "#00c9a7",
    error: "#ff5e62",
    warning: "#ffc107",
  },
  breakpoints: {
    mobile: "576px",
    tablet: "768px",
    desktop: "1024px",
    largeDesktop: "1200px",
  },
  shadows: {
    small: "0 2px 8px rgba(0, 0, 0, 0.15)",
    medium: "0 4px 12px rgba(0, 0, 0, 0.2)",
    large: "0 8px 20px rgba(0, 0, 0, 0.25)",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Prevents text reflow - shows fallback font while loading
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"], // Only essential weights - reduces font file size by ~60%
  display: "swap", // Prevents text reflow
});

// Define the interface for the RootLayout props
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children
}: RootLayoutProps) {
  return (
    <html lang="en" className={`${geistSans.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="dns-prefetch" href="//www.youtube.com" />
      </head>
      <body>
        <Analytics />
        <SpeedInsights />
        <StyledComponentsRegistry>
          <LanguageProvider>
          <I18nProvider>
          <ClientLayout>{children}</ClientLayout>
          </I18nProvider>
          </LanguageProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
