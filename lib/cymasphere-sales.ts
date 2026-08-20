/**
 * @fileoverview Locked $149 one-time Cymasphere sales copy for /product/cymasphere.
 * Press quotes are from the SOS and Attack pieces named here. CymaSynth is a
 * separate catalog SKU — do not claim it ships with this purchase.
 * @module lib/cymasphere-sales
 */

export const CYMASPHERE_SLUG = "cymasphere";

/** Locked storefront price. Do not advertise $499, $6, or $59. */
export const CYMASPHERE_PRICE_USD = 149;
export const CYMASPHERE_PRICE_LABEL = "$149";
export const CYMASPHERE_PRICE_NOTE = "one-time. No subscription.";

/**
 * CymaSynth is its own product (`cymasynth`, separate price). Live related
 * products for Cymasphere are empty. Do not render a suite / “ships with” block.
 */
export const CYMASPHERE_INCLUDES_CYMASYNTH = false;

export const CYMASPHERE_FORMATS = [
  "Standalone",
  "VST3",
  "AU",
  "iPad",
] as const;

export const CYMASPHERE_META = {
  title: "Cymasphere — MIDI harmony engine · $149 one-time | NN Audio",
  description:
    "Unstick the progression. Cymasphere is a MIDI harmony engine for voicings, progressions, and voice leading. $149 one-time. No subscription.",
} as const;

export const CYMASPHERE_SALES = {
  eyebrow: "MIDI harmony engine · $149 one-time",
  headline: "Unstick the progression.",
  lede:
    "Stuck rewriting the same four bars? Cymasphere is a MIDI harmony engine — progressions, voicings, voice leading — so the next chord isn’t a guess.",
  priceLine: "$149 one-time. No subscription.",
  ctaLabel: "Get Cymasphere",
  hearItLabel: "Hear it",
  valueLead: "Cymasphere writes harmony as MIDI.",
  valueBullets: [
    "Build a progression.",
    "Revoice it. Change the leading.",
    "Send it to your instruments.",
  ],
  valueCloser: "Not a DAW. Not another wavetable to babysit.",
  aisleTitle: "Deeper than a chord plugin.",
  aisleBody: [
    "If you already know Scaler, Captain Chords, or ChordJam: Attack Magazine put Cymasphere in that lane, then said it goes deeper on the theory.",
    "The GUI looks dense. The voicings are why.",
  ],
  howTitle: "How it works",
  howSteps: [
    {
      title: "Progression",
      body: "Lay it down, reharmonize when it stalls.",
    },
    {
      title: "Voicing",
      body: "Count, spacing, inversions, leading. Theory on the surface on purpose.",
    },
    {
      title: "Out",
      body: "MIDI to the DAW.",
    },
  ],
  formatsNote:
    "Standalone, VST3, and AU. macOS, Windows, iPad. Major DAWs except Pro Tools.",
  limitsTitle: "Honest limits",
  limitsBody: [
    "Attack said it looks confusing. Not a three-knob chord picker.",
    "SOS reviewed the 2023–24 standalone (Jan 2024) — best independent write-up we have, not a review of today’s AU/VST3 page.",
    "If you want a chord stamp, wrong tool. If you want control of the harmony, it isn’t.",
  ],
  accessTitle: "NNAudio Access",
  accessBody:
    "Download, install, update, library. Mac and Windows. Not a login wall.",
  buyLine: "$149 one-time.",
  faqTitle: "FAQ",
} as const;

export const CYMASPHERE_ATTACK = {
  source: "Attack Magazine",
  date: "11 Jan 2024",
  href: "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/",
  quotes: [
    "If you’re thinking “What about ChordJam” or “Captain Chords” or “Scaler” then yes – this is sitting in a similar space. However, Cymasphere goes far deeper, especially on the theory.",
    "Without a doubt, Cymasphere looks confusing! … it’s an incredible harmony engine that intelligently generates chord voicings and melodic sequences using scales as its source.",
  ],
} as const;

export const CYMASPHERE_SOS = {
  source: "Sound on Sound",
  author: "Robin Bigwood",
  date: "Jan 2024",
  href: "https://www.soundonsound.com/reviews/cymasphere",
  quotes: [
    "Cymasphere aims to make more complex chord construction available to all.",
    "…a chord-focused MIDI note generator.",
    "If chord formation is your thing, it could prove to be a brilliant harmonic playground.",
    "Cymasphere has few counterparts… [none] get anywhere close to Cymasphere’s harmonic sophistication…",
    "I also can’t fault Cymasphere’s execution.",
  ],
  limitQuotes: [
    "it’s not entirely clear who Cymasphere is really for.",
    "the number of playing styles is limited: only block chords, strums, or monophonic arpeggiation.",
  ],
} as const;

export const CYMASPHERE_FAQ = [
  {
    q: "What is it?",
    a: "A MIDI harmony engine.",
  },
  {
    q: "Scaler / Captain Chords / ChordJam?",
    a: "Same aisle. Attack said deeper on theory, and that the GUI looks dense.",
  },
  {
    q: "Is CymaSynth the product?",
    a: "No.",
  },
  {
    q: "Subscription?",
    a: "No.",
  },
  {
    q: "Formats?",
    a: "Standalone, VST3, AU, iPad.",
  },
  {
    q: "Install?",
    a: "NNAudio Access. Download, install, update, library.",
  },
] as const;

/**
 * @brief True when a string is the Cymasphere product slug.
 */
export function isCymasphereSlug(slug: string | undefined | null): boolean {
  return (slug ?? "").trim().toLowerCase() === CYMASPHERE_SLUG;
}
