/**
 * @fileoverview Shared product chip for homepage hero tours. Lives
 * outside CircuitNetwork so the marketing hero can type nodes without
 * importing the 3D module.
 * @module components/sections/circuit-node
 */

/** A product rendered as a moon or 2D credit. */
export interface CircuitNode {
  id: string | number;
  name: string;
  slug: string;
  /** Logo or artwork URL shown on the moon. */
  image: string;
  /** Display price, e.g. "$99". */
  price?: string;
  /** One-line subtitle for the credit card. */
  tagline?: string;
  /** Short product description shown in the empty half of a hold. */
  description?: string;
  /** True when the product is a target of the active shop promotion. */
  promoted?: boolean;
}

/** Flagship synth when the catalog seed omitted CymaSynth. */
export const DEFAULT_CYMASYNTH_NODE: CircuitNode = {
  id: "cymasynth",
  name: "CymaSynth",
  slug: "cymasynth",
  image: "/images/cymasynth-sphere-hero.webp",
  tagline: "Professional Wavetable Synthesizer",
};
