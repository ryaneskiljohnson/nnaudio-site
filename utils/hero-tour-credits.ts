/**
 * @fileoverview Curated homepage credit list shared by CircuitNetwork
 * (recorder) and the video overlay so hold order cannot drift.
 * @module utils/hero-tour-credits
 */

import { CURATED_FEATURED_ORDER } from "@/lib/homepage-hero-seed";
import type { CircuitNode } from "@/components/sections/circuit-node";
import {
  type CreditTarget,
  SUN_FOCUS_KEY,
  cymasynthOrbit,
  moonDiameter,
  moonPlacements,
  orderCredits,
} from "@/utils/circuit-network-layout";
import {
  heroTourMoonCap,
  heroTourStopCap,
  pickMobileTourNodes,
} from "@/utils/hero-tour";
import { hashOrbitKey } from "@/utils/orbital-physics";

/** Official Cymasphere app icon for credit thumbs. */
export const CYMASPHERE_CREDIT_ICON = "/images/cymasphere-app-icon.png";
/** Official CymaSynth mark for credit thumbs. */
export const CYMASYNTH_CREDIT_MARK = "/images/cymasynth-mark.png";

/** One credit identity (orbital pose fields are filled by the live tour). */
export type HeroCreditDraft = {
  key: string;
  name: string;
  slug: string;
  price?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  sun?: boolean;
  weight: number;
  size: number;
};

/**
 * @brief Strips tags and collapses whitespace from catalog HTML copy.
 * @param raw Product description or tagline.
 * @returns Plain text, or an empty string.
 */
export function plainProductCopy(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @brief Description shown in the empty half of a featured hold.
 * @param credit Current tour credit.
 * @param synth Whether this is the CymaSynth moon.
 * @returns Short plain-text blurb.
 */
export function featuredProductBlurb(
  credit: Pick<CreditTarget, "sun" | "description" | "subtitle">,
  synth: boolean
): string {
  const copy = plainProductCopy(credit.description || credit.subtitle);
  if (copy) return copy;
  if (credit.sun) {
    return "Cymasphere writes the harmony, voicings, and patterns at the center of the system.";
  }
  if (synth) {
    return "A professional wavetable synthesizer built for the Cymasphere ecosystem.";
  }
  return "";
}

/**
 * @brief Sun → CymaSynth → featured moons, same order as CircuitNetwork.
 * Size used for `orderCredits` matches the live tour (hash diameter).
 * @param input Catalog nodes plus compact/cap flags.
 * @returns Ordered drafts sliced to the stop cap.
 */
export function buildHeroCreditDrafts(input: {
  cymasphere?: CircuitNode | null;
  cymasynth?: CircuitNode | null;
  nodes: CircuitNode[];
  compact: boolean;
  tourCap?: number;
}): HeroCreditDraft[] {
  const moonCap = heroTourMoonCap(
    input.compact,
    input.tourCap,
    !!input.cymasynth
  );
  const tourNodes =
    moonCap == null
      ? input.nodes
      : pickMobileTourNodes(input.nodes, moonCap, CURATED_FEATURED_ORDER);
  const seats = moonPlacements(tourNodes.length, input.compact);
  const synthSeat = cymasynthOrbit(input.compact);

  const drafts: HeroCreditDraft[] = [
    {
      key: SUN_FOCUS_KEY,
      name: input.cymasphere?.name || "Cymasphere",
      slug: input.cymasphere?.slug || "cymasphere",
      price: input.cymasphere?.price,
      subtitle: (input.cymasphere?.tagline || "").trim(),
      description: (input.cymasphere?.description || "").trim(),
      image: CYMASPHERE_CREDIT_ICON,
      sun: true,
      weight: 1.5,
      size: 0,
    },
  ];

  if (input.cymasynth) {
    drafts.push({
      key: `synth-${input.cymasynth.id}`,
      name: input.cymasynth.name,
      slug: input.cymasynth.slug,
      price: input.cymasynth.price,
      subtitle: (input.cymasynth.tagline || "").trim(),
      description: (input.cymasynth.description || "").trim(),
      image: CYMASYNTH_CREDIT_MARK,
      sun: false,
      weight: 2,
      size: synthSeat.size.w * 1.45,
    });
  }

  for (const seat of seats) {
    const node = tourNodes[seat.index];
    if (!node) continue;
    const hash = hashOrbitKey(node.slug || String(node.id));
    const d = moonDiameter(hash, seat.ring, input.compact);
    drafts.push({
      key: String(node.id),
      name: node.name,
      slug: node.slug,
      price: node.price,
      subtitle: (node.tagline || "").trim(),
      description: (node.description || "").trim(),
      image: node.image,
      sun: false,
      weight: 1,
      size: d,
    });
  }

  const ordered = orderCredits(
    drafts.map((draft) => ({
      ...draft,
      startDeg: 0,
      periodSec: 1,
      radius: 0,
    }))
  );
  const stopCap = heroTourStopCap(input.compact, input.tourCap);
  const sliced = stopCap == null ? ordered : ordered.slice(0, stopCap);
  return sliced.map((credit) => ({
    key: credit.key,
    name: credit.name,
    slug: credit.slug || "",
    price: credit.price,
    subtitle: credit.subtitle,
    description: credit.description,
    image: credit.image,
    sun: credit.sun,
    weight: credit.weight ?? 1,
    size: credit.size,
  }));
}
