/**
 * @fileoverview Locked $199 one-time Cymasphere sales copy for /product/cymasphere.
 * Press quotes are the locked SOS and Attack lines named here only.
 * CymaSynth is a separate catalog SKU — do not claim it ships with this purchase.
 * @module lib/cymasphere-sales
 */

export const CYMASPHERE_SLUG = "cymasphere";

/** Locked storefront display price. Do not advertise $149, $499, $6, or $59. */
export const CYMASPHERE_PRICE_USD = 199;
export const CYMASPHERE_PRICE_LABEL = "$199";
export const CYMASPHERE_PRICE_NOTE = "one-time. No subscription.";

/**
 * CymaSynth is its own product (`cymasynth`, separate price). Live related
 * products for Cymasphere are empty. Do not render a suite / “ships with” block.
 */
export const CYMASPHERE_INCLUDES_CYMASYNTH = false;

/**
 * Only owned, audited demo clip for this page.
 * Catalog `demo_video_url` is 4ggHir150p8 — unaudited, do not embed.
 * `audio_samples` is empty; do not invent a player or clips.
 */
export const CYMASPHERE_ALLOWED_DEMO_VIDEO_ID = "lZZwMcxmWEQ";
export const CYMASPHERE_UNAUDITED_DEMO_VIDEO_ID = "4ggHir150p8";

export function isAllowedCymasphereDemoVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!trimmed.includes(CYMASPHERE_ALLOWED_DEMO_VIDEO_ID)) return false;
  if (trimmed.includes(CYMASPHERE_UNAUDITED_DEMO_VIDEO_ID)) return false;
  return true;
}

export function filterCymasphereDemoVideos(urls: string[]): string[] {
  const seen = new Set<string>();
  const allowed: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!isAllowedCymasphereDemoVideoUrl(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    allowed.push(trimmed);
  }
  return allowed;
}

export function collectCymasphereDemoVideos(product: {
  demo_videos?: unknown;
  demo_video_url?: string | null;
}): Array<{ url: string; order: number }> {
  const candidates: string[] = [];
  if (Array.isArray(product.demo_videos)) {
    for (const item of product.demo_videos) {
      if (typeof item === "string") {
        candidates.push(item);
      } else if (
        item &&
        typeof item === "object" &&
        typeof (item as { url?: unknown }).url === "string"
      ) {
        candidates.push((item as { url: string }).url);
      }
    }
  }
  if (typeof product.demo_video_url === "string") {
    candidates.push(product.demo_video_url);
  }
  return filterCymasphereDemoVideos(candidates).map((url, index) => ({
    url,
    order: index + 1,
  }));
}

export const CYMASPHERE_FORMATS = [
  "Standalone",
  "VST3",
  "AU",
  "iPad",
] as const;

export const CYMASPHERE_META = {
  title: "Cymasphere — MIDI harmony engine · $199 one-time | NN Audio",
  description:
    "Unstick the progression. Cymasphere is a MIDI harmony engine for voicings, progressions, and voice leading. $199 one-time. No subscription.",
} as const;

export const CYMASPHERE_SALES = {
  eyebrow: "MIDI harmony engine · $199 one-time",
  headline: "Unstick the progression.",
  lede:
    "Stuck rewriting the same four bars? Cymasphere is a MIDI harmony engine — progressions, voicings, voice leading — so the next chord isn’t a guess.",
  priceLine: "$199 one-time. No subscription.",
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
  limitsLead:
    "This is not a three-knob chord picker. The GUI is dense because the theory is on the surface.",
  accessTitle: "NNAudio Access",
  accessBody:
    "Download, install, update, library. Mac and Windows. Not a login wall.",
  buyLine: "$199 one-time harmony engine",
  faqTitle: "FAQ",
} as const;

/** Only render when `CYMASPHERE_INCLUDES_CYMASYNTH` is true. */
export const CYMASPHERE_SUITE_LINE =
  "One $199 purchase. Not a monthly plan.";

export const CYMASPHERE_ATTACK = {
  source: "Attack Magazine",
  date: "11 Jan 2024",
  kind: "video tutorial, not a scored review",
  href: "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/",
  quote:
    "If you’re thinking “What about ChordJam” or “Captain Chords” or “Scaler” then yes – this is sitting in a similar space. However, Cymasphere goes far deeper, especially on the theory.",
} as const;

export const CYMASPHERE_SOS = {
  source: "Sound on Sound",
  author: "Robin Bigwood",
  printDate: "Jan 2024",
  onlineDate: "21 Dec 2023",
  date: "print Jan 2024 / online 21 Dec 2023",
  href: "https://www.soundonsound.com/reviews/cymasphere",
  quotes: [
    "chord-focused MIDI note generator",
    "brilliant harmonic playground",
    "well worth a stab",
  ],
  /**
   * Review-era caveat only. Do not claim CymaSynth ships with this SKU.
   * SOS did not review today’s AU/VST3, and they did not review CymaSynth.
   */
  eraCaveat:
    "They reviewed the 2023–24 standalone, not today’s AU/VST3 — and not CymaSynth, which is a separate product.",
} as const;

export const CYMASPHERE_FAQ = [
  {
    q: "What is it?",
    a: "A MIDI harmony engine.",
  },
  {
    q: "Scaler / Captain Chords / ChordJam?",
    a: "Same aisle. Attack said it goes far deeper on the theory.",
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
    q: "Price?",
    a: "$199 one-time on nnaud.io.",
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
