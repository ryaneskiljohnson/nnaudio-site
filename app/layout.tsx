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

// Metadata configuration
export const metadata: Metadata = {
  title: "NNAud.io – Resources for Modern Music Producers",
  description: "Discover premium plugins, sample packs, and tools designed to elevate your music production workflow",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/images/nnaud-io/logo-icon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/images/nnaud-io/logo-icon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
    apple: [
      {
        url: "/images/nnaud-io/logo-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
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
