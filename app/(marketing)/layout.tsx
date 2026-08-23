/**
 * @fileoverview Marketing chrome for `/`: slim header and footer, no
 * auth/cart/chat runtime.
 * @module app/(marketing)/layout
 */

import type { ReactNode } from "react";
import MarketingFooter from "@/components/layout/MarketingFooter";
import MarketingHeader from "@/components/layout/MarketingHeader";
import "./marketing.css";

/**
 * @brief Wraps the homepage in the lightweight marketing shell.
 * @param children Homepage RSC tree.
 * @returns Header, main, footer.
 */
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="marketing-shell">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
