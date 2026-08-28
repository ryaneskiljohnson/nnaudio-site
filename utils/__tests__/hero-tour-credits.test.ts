/**
 * @fileoverview Curated hero credit drafts used by video cues and 3D.
 * @module utils/__tests__/hero-tour-credits.test
 */

import { describe, expect, it } from "vitest";
import { SUN_FOCUS_KEY } from "@/utils/circuit-network-layout";
import {
  buildHeroCreditDrafts,
  featuredProductBlurb,
} from "@/utils/hero-tour-credits";
import { HERO_TOUR_RECORD_CAP } from "@/utils/hero-tour";
import type { CircuitNode } from "@/components/sections/circuit-node";

const synth: CircuitNode = {
  id: "sy",
  name: "CymaSynth",
  slug: "cymasynth",
  image: "/images/cymasynth-sphere-hero.webp",
  price: "$149",
  tagline: "Wavetable synth",
};

const sun: CircuitNode = {
  id: "sun",
  name: "Cymasphere",
  slug: "cymasphere",
  image: "/images/cymasphere-sun-sphere-hero.webp",
  price: "$199",
};

function node(id: string, slug: string, name: string): CircuitNode {
  return { id, name, slug, image: `/${slug}.webp` };
}

describe("buildHeroCreditDrafts", () => {
  it("leads with Cymasphere and CymaSynth, then curated moons", () => {
    const drafts = buildHeroCreditDrafts({
      cymasphere: sun,
      cymasynth: synth,
      nodes: [
        node("1", "alpha-synth", "Alpha"),
        node("2", "reiya", "Reiya"),
        node("3", "curio-texture-generator", "Curio"),
        node("4", "obscura-tortured-orchestral-box", "Obscura"),
      ],
      compact: true,
      tourCap: 5,
    });
    expect(drafts[0]).toMatchObject({
      key: SUN_FOCUS_KEY,
      slug: "cymasphere",
      weight: 1.5,
      sun: true,
    });
    expect(drafts[1]).toMatchObject({
      key: "synth-sy",
      slug: "cymasynth",
      weight: 2,
    });
    expect(drafts.map((d) => d.slug).slice(2)).toEqual(
      expect.arrayContaining(["reiya", "curio-texture-generator"])
    );
    expect(drafts).toHaveLength(5);
  });

  it("uses the recording cap so video cues stay a curated reel", () => {
    const nodes = Array.from({ length: 40 }, (_, i) =>
      node(String(i), `moon-${i}`, `Moon ${i}`)
    );
    const drafts = buildHeroCreditDrafts({
      cymasphere: sun,
      cymasynth: synth,
      nodes,
      compact: false,
      tourCap: HERO_TOUR_RECORD_CAP,
    });
    expect(drafts).toHaveLength(HERO_TOUR_RECORD_CAP);
    expect(drafts[0]?.slug).toBe("cymasphere");
    expect(drafts[1]?.slug).toBe("cymasynth");
  });
});

describe("featuredProductBlurb", () => {
  it("falls back to flagship copy when the catalog has no text", () => {
    expect(featuredProductBlurb({ sun: true }, false)).toMatch(/Cymasphere/);
    expect(featuredProductBlurb({}, true)).toMatch(/wavetable/i);
    expect(featuredProductBlurb({ subtitle: "A <b>line</b>" }, false)).toBe(
      "A line"
    );
  });
});
