/**
 * @fileoverview Homepage/catalog cards must show Cymasphere as $199, never $499.
 * @module components/products/ProductCard.test
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addItem: () => undefined }),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ success: () => undefined }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

import ProductCard from "./ProductCard";

describe("ProductCard Cymasphere offer", () => {
  it("renders $199 with no $499 strikethrough when CMS still has 499/149", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        product={{
          id: "cymasphere-id",
          name: "Cymasphere",
          slug: "cymasphere",
          price: 499,
          sale_price: 149,
          compareAtPrice: 499,
          featured_image_url: "/images/cymasphere-logo.png",
        }}
        showCartButton={false}
        showPluginType={false}
      />
    );

    expect(html).toContain("$199");
    expect(html).not.toContain("$149");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("line-through");
  });
});
