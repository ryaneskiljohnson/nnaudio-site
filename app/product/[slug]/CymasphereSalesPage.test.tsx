/**
 * @fileoverview Ensures the Cymasphere sales page SSR HTML contains the locked
 * $199 offer and supplied copy, without a loading shell or $499 strikethrough.
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
  MultiVideoPlayer: ({ videos }: { videos: Array<{ url: string }> }) => (
    <div>
      Demo video
      {videos.map((video) => (
        <span key={video.url}>{video.url}</span>
      ))}
    </div>
  ),
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
    expect(html).toContain("$199 one-time. No subscription.");
    expect(html).toContain("Get Cymasphere");
    expect(html).toContain("Standalone");
    expect(html).toContain("VST3");
    expect(html).toContain("AU");
    expect(html).toContain("iPad");
    expect(html).toContain("Deeper than a chord plugin.");
    expect(html).toContain("goes far deeper, especially on the theory");
    expect(html).toContain("video tutorial, not a scored review");
    expect(html).toContain("This is not a three-knob chord picker.");
    expect(html).toContain("chord-focused MIDI note generator");
    expect(html).toContain("brilliant harmonic playground");
    expect(html).toContain("well worth a stab");
    expect(html).toContain("print Jan 2024 / online 21 Dec 2023");
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
    expect(html).not.toContain("$149");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("ships with");
    expect(html).not.toContain("Hear it");
    expect(html).not.toContain("Start trial");
    expect(html).not.toContain("4ggHir150p8");
    expect(html).not.toContain("Serum 2");
    expect(html).not.toContain("feature parity");
    expect(html).not.toContain("915245002872239");
    expect(html).not.toContain("GTM-MJSV92T9");
    expect(html).not.toContain("looks confusing");
    expect(html).not.toContain("incredible harmony engine");
    expect(html).not.toContain("playing styles");
    expect(html).not.toContain("not entirely clear");
    expect(html).not.toContain("who Cymasphere is really for");
    expect(html).not.toContain("tutorial series");
    expect(html).not.toContain("download free");
  });

  it("embeds the Stall Short and ignores the unaudited catalog clip", () => {
    const html = renderToStaticMarkup(
      <CymasphereSalesPage
        product={{
          ...product,
          demo_videos: [
            { url: "https://youtu.be/4ggHir150p8", order: 1 },
            { url: "https://www.youtube.com/shorts/lZZwMcxmWEQ", order: 2 },
          ],
          demo_video_url: "https://youtu.be/4ggHir150p8",
        }}
      />
    );
    expect(html).toContain("Hear it");
    expect(html).toContain("lZZwMcxmWEQ");
    expect(html).not.toContain("4ggHir150p8");
  });

  it("does not embed the unaudited demo_video_url or invent audio samples", () => {
    const html = renderToStaticMarkup(
      <CymasphereSalesPage
        product={{
          ...product,
          audio_samples: [{ url: "https://example.com/invented.mp3", name: "Demo" }],
          demo_videos: [{ url: "https://www.youtube.com/watch?v=4ggHir150p8" }],
          demo_video_url: "https://youtu.be/4ggHir150p8",
        }}
      />
    );
    expect(html).not.toContain("4ggHir150p8");
    expect(html).not.toContain("Hear it");
    expect(html).not.toContain("invented.mp3");
    expect(html).not.toContain("Demo video");
  });
});
