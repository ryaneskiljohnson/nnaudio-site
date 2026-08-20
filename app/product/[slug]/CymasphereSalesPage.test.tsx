/**
 * @fileoverview Ensures the Cymasphere sales page SSR HTML contains the offer,
 * formats, and press proof instead of a loading shell.
 * @module app/product/[slug]/CymasphereSalesPage.test
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

vi.mock("./CymasphereBuyButton", () => ({
  default: () => <button type="button">Add to Cart — $149</button>,
}));

import CymasphereSalesPage from "./CymasphereSalesPage";

describe("CymasphereSalesPage SSR HTML", () => {
  it("contains the sales offer, formats, and press links in the initial markup", () => {
    const html = renderToStaticMarkup(
      <CymasphereSalesPage
        product={{
          id: "cymasphere-id",
          name: "Cymasphere",
          slug: "cymasphere",
          tagline: null,
          short_description: null,
          description: null,
          category: "application",
          price: 149,
          sale_price: null,
          featured_image_url: "/images/cymasphere-logo.png",
          logo_url: "/images/cymasphere-logo.png",
          average_rating: 0,
          review_count: 0,
          reviews: [],
        }}
      />
    );

    expect(html).toContain("Cymasphere");
    expect(html).toContain("$149");
    expect(html).toContain("One-time purchase");
    expect(html).toContain("VST3");
    expect(html).toContain("AU");
    expect(html).toContain("Standalone");
    expect(html).toContain("iPad");
    expect(html).toContain("Add to Cart — $149");
    expect(html).toContain("Sound on Sound");
    expect(html).toContain("Attack Magazine");
    expect(html).toContain("https://www.soundonsound.com/reviews/cymasphere");
    expect(html).toContain(
      "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/"
    );
    expect(html).not.toContain("Loading product");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("$6");
    expect(html).not.toContain("$59");
  });
});
