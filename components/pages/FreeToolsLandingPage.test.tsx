/**
 * @fileoverview Free page lists shipped free tools and one $199 Cymasphere door.
 * @module components/pages/FreeToolsLandingPage.test
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/products/ProductCard", () => ({
  default: ({ product }: { product: { name: string } }) => (
    <div>{product.name}</div>
  ),
}));

import FreeToolsLandingPage from "./FreeToolsLandingPage";

describe("FreeToolsLandingPage", () => {
  it("writes Free here, lists the five, and doors out to Cymasphere at $199", () => {
    const html = renderToStaticMarkup(
      <FreeToolsLandingPage
        products={[
          {
            id: "1",
            name: "FreeQ",
            slug: "freeq-free-eq-module-plugin",
            tagline: null,
            short_description: null,
            description: null,
            category: "audio-fx-plugin",
            price: 0,
            sale_price: 0,
            featured_image_url: null,
            logo_url: null,
            created_at: null,
          },
          {
            id: "2",
            name: "Game Boi",
            slug: "game-boi-retro-sounds-free-plugin",
            tagline: null,
            short_description: null,
            description: null,
            category: "instrument-plugin",
            price: 0,
            sale_price: 0,
            featured_image_url: null,
            logo_url: null,
            created_at: null,
          },
        ]}
      />
    );

    expect(html).toContain("Free tools. In the session today.");
    expect(html).toContain("FreeQ, Freelay, Freeverb, Sterfreeo, Cowboy Harp");
    expect(html).toContain("Also shipping: Game Boi");
    expect(html).toContain("Download, install, update, library");
    expect(html).toContain("Not a login wall");
    expect(html).toContain("Cymasphere · $199");
    expect(html).toContain("Get Cymasphere");
    expect(html).toContain('href="/product/cymasphere"');
    expect(html).not.toContain("$149");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("Unstick the progression");
    expect(html).not.toContain("Explore Bundles");
  });
});
