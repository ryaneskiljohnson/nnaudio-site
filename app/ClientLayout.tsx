"use client";

/**
 * @fileoverview Root client chrome. `/` is a ThemeProvider pass-through so
 * the marketing homepage does not download the shop shell. Every other
 * public route loads ShopLayout as a separate chunk.
 * @module app/ClientLayout
 */

import { ThemeProvider } from "styled-components";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { shopTheme } from "@/lib/shop-theme";

const ShopLayout = dynamic(() => import("./ShopLayout"), {
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        background: "#121212",
        color: "rgba(255,255,255,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.95rem",
      }}
    >
      Loading…
    </div>
  ),
});

/**
 * @brief Chooses marketing pass-through vs shop chrome from the path.
 * @param children Route content.
 * @returns Theme-only tree on `/`, otherwise the shop shell.
 */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/") {
    return <ThemeProvider theme={shopTheme}>{children}</ThemeProvider>;
  }
  return <ShopLayout>{children}</ShopLayout>;
}
