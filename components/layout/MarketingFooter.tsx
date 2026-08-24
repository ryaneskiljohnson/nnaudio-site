/**
 * @fileoverview Static homepage footer. Links only — no legal modals,
 * framer-motion, or icon packs. Shop links skip prefetch so `/` does
 * not compile the storefront in the background.
 * @module components/layout/MarketingFooter
 */

import Link from "next/link";

/**
 * @brief Marketing footer for `/`.
 * @returns Column links and copyright.
 */
export default function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-inner">
        <div>
          <p>NNAud.io</p>
          <p>Plugins, packs, and tools for producers.</p>
        </div>
        <div>
          <p>Shop</p>
          <p>
            <Link href="/free-tools" prefetch={false}>
              Free Tools
            </Link>
          </p>
          <p>
            <Link href="/plugins" prefetch={false}>
              Plugins
            </Link>
          </p>
          <p>
            <Link href="/packs" prefetch={false}>
              Packs
            </Link>
          </p>
          <p>
            <Link href="/products" prefetch={false}>
              All Products
            </Link>
          </p>
        </div>
        <div>
          <p>Company</p>
          <p>
            <Link href="/about">About</Link>
          </p>
          <p>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </p>
          <p>
            <Link href="/terms-of-service">Terms</Link>
          </p>
          <p>
            <Link href="/refund-policy">Refund Policy</Link>
          </p>
        </div>
      </div>
      <p className="marketing-footer-copy">
        © {new Date().getFullYear()} NNAud.io. All rights reserved.
      </p>
    </footer>
  );
}
