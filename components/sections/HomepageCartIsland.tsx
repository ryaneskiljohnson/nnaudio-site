"use client";

/**
 * @fileoverview Cart + toast island for homepage featured/free cards.
 * Writes the same `nnaudio_cart` localStorage key as the shop shell so
 * add-to-cart on `/` is visible after navigating to `/cart`.
 * @module components/sections/HomepageCartIsland
 */

import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/contexts/ToastContext";

/**
 * @brief Shared cart store for featured and free ProductCards.
 * @param children Featured and/or free sections.
 * @returns Children inside toast and cart providers.
 */
export default function HomepageCartIsland({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}
