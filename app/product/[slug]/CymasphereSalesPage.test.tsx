/**
 * @fileoverview Ensures the Cymasphere sales page SSR HTML contains the locked
 * offer and supplied copy, without a loading shell or $499 strikethrough.
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

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("./CymasphereBuyButton", () => ({
  default: () => <button type="button">Get Cymasphere</button>,
}));

vi.mock("@/app/components/MultiVideoPlayer", () => ({
  MultiVideoPlayer: () => <div>Demo video</div>,
}));

import CymasphereSalesPage from "./CymasphereSalesPage";

const product = {
  id: "cymasphere-id",
  name: "Cymasphere",
  slug: "cymasphere",
  tagline: null,
  short_description: null,
  description: null,
  category: "application",
  price: 499,
  sale_price: 149,
  featured_image_url: "/images/cymasphere-logo.png",
  logo_url: "/images/cymasphere-logo.png",
  average_rating: 0,
  review_count: 0,
  reviews: [],
};

describe("CymasphereSalesPage SSR HTML", () => {
  it("renders the locked offer and press copy in the initial markup", () => {
    const html = renderToStaticMarkup(
      <CymasphereSalesPage product={product} />
    );

    expect(html).toContain("Unstick the progression.");
    expect(html).toContain("$149 one-time. No subscription.");
    expect(html).toContain("Get Cymasphere");
    expect(html).toContain("Standalone");
    expect(html).toContain("VST3");
    expect(html).toContain("AU");
    expect(html).toContain("iPad");
    expect(html).toContain("Deeper than a chord plugin.");
    expect(html).toContain("Sound on Sound");
    expect(html).toContain("Robin Bigwood");
    expect(html).toContain("Attack Magazine");
    expect(html).toContain("https://www.soundonsound.com/reviews/cymasphere");
    expect(html).toContain(
      "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/"
    );
    expect(html).toContain("NNAudio Access");
    expect(html).toContain("What is it?");
    expect(html).not.toContain("Loading product");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("ships with");
    expect(html).not.toContain("Hear it");
    expect(html).not.toContain("Start trial");
  });

  it("shows Hear it only when a real demo video exists", () => {
    const html = renderToStaticMarkup(
      <CymasphereSalesPage
        product={{
          ...product,
          demo_videos: [
            { url: "https://www.youtube.com/shorts/lZZwMcxmWEQ", order: 1 },
          ],
        }}
      />
    );
    expect(html).toContain("Hear it");
    expect(html).toContain("Demo video");
  });
});
