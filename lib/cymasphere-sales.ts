/**
 * @fileoverview Locked public offer and sales copy for /product/cymasphere.
 * Sourced from this repo's product docs plus the Sound on Sound and Attack
 * Magazine pieces. Do not add testimonials, prices, or formats that are not
 * already in those sources.
 * @module lib/cymasphere-sales
 */

export const CYMASPHERE_SLUG = "cymasphere";

/** Locked storefront price. Do not advertise $499, $6, or $59 on this page. */
export const CYMASPHERE_PRICE_USD = 149;
export const CYMASPHERE_PRICE_LABEL = "$149";
export const CYMASPHERE_PRICE_NOTE = "One-time purchase";

export const CYMASPHERE_FORMATS = ["VST3", "AU", "Standalone", "iPad"] as const;

export const CYMASPHERE_META = {
  title: "Cymasphere — MIDI Chord & Harmony Tool",
  description:
    "Harmony-centric MIDI chord and composition tool. Play cymatic voicings as block chords, strums, or arpeggios. VST3, AU, standalone, and iPad. $149 one-time.",
} as const;

export const CYMASPHERE_SALES = {
  eyebrow: "MIDI chord & composition tool",
  name: "Cymasphere",
  lede:
    "A harmony-centric MIDI tool that turns cymatics into voicings you can play as block chords, strums, or arpeggios.",
  whatItIsTitle: "What it is",
  whatItIs: [
    "Cymasphere is a chord-focused MIDI generator for producers, composers, educators, and anyone who writes with harmony. Tap a cymatic — a visual chord shape — and it outputs a voicing to the instruments in your session.",
    "It sits in the same space as Scaler, Captain Chords, and ChordJam. Attack Magazine put it there and said Cymasphere goes further on theory.",
  ],
  howTitle: "How you use it",
  howItems: [
    {
      title: "Cymatics, then voicings",
      body: "Harmony palettes hold cymatic buttons. Each one is a chord you can trigger, edit, and drop into a progression.",
    },
    {
      title: "Block, strum, or arp",
      body: "Play the voicing as a block chord, add a strum, or run it through the arpeggiator / sequencer. Sound on Sound described those three playing styles directly.",
    },
    {
      title: "Shape the chord",
      body: "Set voice count (1–12), spacing, inversion, octave, sustain, and voice leading. The pattern editor follows the progression when the chord changes.",
    },
    {
      title: "Into the DAW or on its own",
      body: "Run it standalone or as VST3 / AU. MIDI can stay on one channel or split voices across channels so a string, wind, or brass template can take the voicing at once.",
    },
  ],
  formatsTitle: "Formats",
  formatsNote:
    "VST3, AU, standalone, and iPad. Windows 10+, macOS 10.14+, iPadOS 13+. Works with major DAWs except Pro Tools.",
  ctaLabel: "Add to Cart",
  ctaPrice: CYMASPHERE_PRICE_LABEL,
} as const;

export const CYMASPHERE_PRESS = [
  {
    source: "Sound on Sound",
    href: "https://www.soundonsound.com/reviews/cymasphere",
    label: "Sound on Sound review",
    quote:
      "If chord formation is your thing, it could prove to be a brilliant harmonic playground.",
    context:
      "SOS reviewed Cymasphere as chord-generation software: a MIDI note generator whose cymatics play conventionally, strummed, or arpeggiated.",
  },
  {
    source: "Attack Magazine",
    href: "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/",
    label: "Attack Magazine",
    quote:
      "An incredible harmony engine that intelligently generates chord voicings and melodic sequences using scales as its source.",
    context:
      "Attack compared it with Scaler, Captain Chords, and ChordJam, and said it goes far deeper on the theory.",
  },
] as const;

/**
 * @brief True when a string is the Cymasphere product slug.
 */
export function isCymasphereSlug(slug: string | undefined | null): boolean {
  return (slug ?? "").trim().toLowerCase() === CYMASPHERE_SLUG;
}
