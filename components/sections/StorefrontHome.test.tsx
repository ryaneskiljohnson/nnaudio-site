/**
 * @fileoverview Homepage is a product-tile storefront, not door cards or a lander.
 * @module components/sections/StorefrontHome.test
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

import { StorefrontHome } from "./StorefrontHome";

describe("StorefrontHome", () => {
  it("opens as product tiles, not door cards or a lander", () => {
    const html = renderToStaticMarkup(<StorefrontHome />);

    expect(html).toContain(">Cymasphere<");
    expect(html).toContain(
      "MIDI harmony engine · $199 one-time · Progressions, voicings, voice leading."
    );
    expect(html).toContain("Get Cymasphere");
    expect(html).toContain('href="/product/cymasphere"');
    expect(html).toContain('src="/images/cymasphere-logo.png"');
    expect(html).toContain("FreeQ EQ");
    expect(html).toContain("Freelay Delay");
    expect(html).toContain("Freeverb Reverb");
    expect(html).toContain("Sterfreeo Stereo");
    expect(html).toContain("Cowboy Harp Harp");
    expect(html).toContain('href="/product/freeq-free-eq-module-plugin"');
    expect(html).toContain('href="/plugins"');
    expect(html).toContain('href="/packs"');
    expect(html).toContain('href="/bundles"');
    expect(html).toContain('href="/products"');

    expect(html).not.toContain("Start here");
    expect(html).not.toContain("Unstick the progression.");
    expect(html).not.toContain("Free tools worth keeping");
    expect(html).not.toContain("Own what you buy");
    expect(html).not.toContain("Built for real production workflows");
    expect(html).not.toContain("Range without the clutter");
    expect(html).not.toContain("Get the free tools");
    expect(html).not.toContain("The rest of the shop");
    expect(html).not.toContain("Loading pricing");
    expect(html).not.toContain("Sound On Sound");
    expect(html).not.toContain("Attack");
    expect(html).not.toContain("Serum 2");
    expect(html).not.toContain("CymaSynth");
    expect(html).not.toContain("nnaudio-access");
    expect(html).not.toContain("download, install, update, library");
    expect(html).not.toContain("$149");
    expect(html).not.toContain("$499");
  });

  it("uses live product art and keeps CymaSynth as a catalog card only", () => {
    const html = renderToStaticMarkup(
      <StorefrontHome
        cymasphereImageUrl="https://cdn.example.com/cymasphere.webp"
        freeProducts={[
          {
            name: "FreeQ",
            slug: "freeq-free-eq-module-plugin",
            featured_image_url: "https://cdn.example.com/freeq.webp",
          },
        ]}
        catalogProducts={[
          {
            name: "CymaSynth",
            href: "/product/cymasynth",
            imageUrl: "https://cdn.example.com/cymasynth.webp",
            priceLabel: "$149",
          },
        ]}
      />
    );

    expect(html).toContain('src="https://cdn.example.com/cymasphere.webp"');
    expect(html).toContain('src="https://cdn.example.com/freeq.webp"');
    expect(html).toContain("CymaSynth");
    expect(html).toContain('href="/product/cymasynth"');
    expect(html).toContain("$149");
    expect(html).not.toContain("Serum 2");
    expect(html).not.toContain("nnaudio-access");
  });
});
