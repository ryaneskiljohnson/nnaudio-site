"use client";

/**
 * @fileoverview Lightweight homepage header: logo, static nav, cart and
 * login links. No SideCart, auth session, or framer-motion.
 * @module components/layout/MarketingHeader
 */

import { useState } from "react";
import Link from "next/link";

const NAV = [
  { href: "/free-tools", label: "Free Tools" },
  { href: "/plugins", label: "Plugins" },
  { href: "/packs", label: "Packs" },
  { href: "/bundles", label: "Bundles" },
  { href: "/products", label: "All Products" },
];

/**
 * @brief Sticky marketing header for `/`.
 * @returns Logo, desktop links, and a CSS hamburger on phones.
 */
export default function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="marketing-header-wrap">
      <div className="marketing-header">
        <Link href="/" className="marketing-header-logo">
          <img
            src="/images/nnaud-io/NNAudio-logo-white.webp"
            alt="NNAud.io"
            width={445}
            height={283}
          />
        </Link>
        <nav className="marketing-header-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="marketing-header-actions">
          <Link href="/cart">Cart</Link>
          <Link href="/login">Login</Link>
          <button
            type="button"
            className="marketing-header-toggle"
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>
      <nav
        id="marketing-mobile-menu"
        className={open ? "marketing-header-menu is-open" : "marketing-header-menu"}
        aria-label="Mobile"
        hidden={!open}
      >
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link href="/cart" onClick={() => setOpen(false)}>
          Cart
        </Link>
        <Link href="/login" onClick={() => setOpen(false)}>
          Login
        </Link>
      </nav>
    </header>
  );
}
