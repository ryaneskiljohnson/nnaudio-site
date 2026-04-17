/**
 * @fileoverview Creates paused Meta link ads for NNAudio purchase creatives: downloads each
 * image from nnaud.io, uploads to the ad account, builds ad creatives + ads in the given ad set.
 * @module scripts/create-purchase-meta-ads
 * @note Requires `FACEBOOK_SYSTEM_USER_TOKEN`, `FACEBOOK_AD_ACCOUNT_ID`, `META_PAGE_ID`, and
 *   `--ad-set-id` (or `META_PURCHASE_AD_SET_ID`). Ads are created **PAUSED**; activate in Ads Manager.
 * @example bun run scripts/create-purchase-meta-ads.ts -- --ad-set-id=1200000000
 * @example bun run scripts/create-purchase-meta-ads.ts -- --dry-run --ad-set-id=1200000000
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { FacebookAdsAPI } from "../utils/facebook/api";

type PurchaseAdRow = {
  key: string;
  name: string;
  headline: string;
  message: string;
  link: string;
  imageUrl: string;
};

const PURCHASE_ADS: PurchaseAdRow[] = [
  {
    key: "PA1",
    name: "NNAudio Purchase — Cymasphere (Song view)",
    headline: "$149. Full harmony suite. (Was $499.)",
    message:
      "Song Builder, harmony palettes, voicing engine, patterns—standalone or AU/VST3.\nOne checkout. Yours after payment. Check product page for license tiers.",
    link: "https://nnaud.io/product/cymasphere",
    imageUrl: "https://nnaud.io/images/cymasphere-features/Song%20View.webp",
  },
  {
    key: "PA2",
    name: "NNAudio Purchase — Cymasphere (Voicing)",
    headline: "Stop “studying” progressions. Start finishing them.",
    message:
      "Cymasphere uses theory in the engine so you can write in the lane.\n$149 sale price—see nnaud.io for current checkout options.",
    link: "https://nnaud.io/product/cymasphere",
    imageUrl: "https://nnaud.io/images/cymasphere-features/Voicing%20View.webp",
  },
  {
    key: "PA3",
    name: "NNAudio Purchase — Cymasphere (Palette)",
    headline: "What you see is what you write.",
    message:
      "Palette + voicing + pattern tools in one workflow. Built for producers who hear the idea but stall on changes.\nBuy on nnaud.io.",
    link: "https://nnaud.io/product/cymasphere",
    imageUrl: "https://nnaud.io/images/cymasphere-features/Palette%20View.webp",
  },
  {
    key: "PA4",
    name: "NNAudio Purchase — Cymasphere (Logo)",
    headline: "Intelligent composition. One purchase.",
    message:
      "If your sessions die at the same four chords, this is the bypass.\n$149 sale vs $499 list—confirm at checkout on nnaud.io.",
    link: "https://nnaud.io/product/cymasphere",
    imageUrl: "https://nnaud.io/images/cymasphere-logo.png",
  },
  {
    key: "PB1",
    name: "NNAudio Purchase — Tetrad Keys",
    headline: "$44.95. Keys that aren’t another EP patch.",
    message:
      "Four blendable key engines. Buy once, use in the DAW.\nCheckout on the product page.",
    link: "https://nnaud.io/product/tetrad-keys",
    imageUrl: "https://nnaud.io/images/tetrad-framed/tetrad-keys-featured.webp",
  },
  {
    key: "PB2",
    name: "NNAudio Purchase — Tetrad Guitars",
    headline: "Guitars built for dense mixes. $44.95.",
    message:
      "Analog + digital + live layers you can balance in one instrument.\nPurchase on nnaud.io.",
    link: "https://nnaud.io/product/tetrad-guitars",
    imageUrl: "https://nnaud.io/images/tetrad-framed/tetrad-guitars-featured.webp",
  },
  {
    key: "PB3",
    name: "NNAudio Purchase — Tetrad Winds",
    headline: "Wind tones with character. $44.95.",
    message:
      "Four wind engines to blend. One payment, no rental.\nBuy on nnaud.io.",
    link: "https://nnaud.io/product/tetrad-winds",
    imageUrl: "https://nnaud.io/images/tetrad-framed/tetrad-winds-featured.webp",
  },
  {
    key: "PC1",
    name: "NNAudio Purchase — Ultimate Bundle",
    headline: "Everything NNAudio makes. One cart.",
    message:
      "Lifetime access: plugins, MIDI, samples—full catalog.\n$679.99 sale (list $799.99)—tiers and checkout on the product page.",
    link: "https://nnaud.io/product/ultimate-bundle",
    imageUrl: "https://nnaud.io/images/landing/elite-bundles-visual.webp",
  },
];

/**
 * @brief Parses CLI args for ad set id, dry run, and optional limit.
 * @returns Parsed flags.
 */
function parseArgs(): { adSetId: string | null; dryRun: boolean; limit: number | null } {
  let adSetId: string | null = process.env.META_PURCHASE_AD_SET_ID?.trim() || null;
  let dryRun = false;
  let limit: number | null = null;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--ad-set-id="))
      adSetId = a.split("=", 2)[1]?.trim() || adSetId;
    else if (a === "--ad-set-id" && argv[i + 1]) {
      adSetId = argv[++i].trim();
    } else if (a.startsWith("--limit=")) {
      const n = Number(a.split("=", 2)[1]);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a === "--limit" && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { adSetId, dryRun, limit };
}

/**
 * @brief Downloads an image from an absolute URL into a Buffer.
 * @param url - HTTPS image URL (e.g. nnaud.io).
 * @returns Buffer and file extension for upload filename.
 */
async function downloadImage(url: string): Promise<{ buffer: Buffer; ext: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image ${res.status}: ${url}`);
  }
  const pathname = new URL(url).pathname.toLowerCase();
  const ext = pathname.endsWith(".png")
    ? "png"
    : pathname.endsWith(".webp")
      ? "webp"
      : pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")
        ? "jpg"
        : "webp";
  return { buffer: Buffer.from(await res.arrayBuffer()), ext };
}

/**
 * @brief Builds a Meta API client from environment variables.
 * @returns Configured `FacebookAdsAPI` instance.
 */
function createApiFromEnv(): FacebookAdsAPI {
  const token = process.env.FACEBOOK_SYSTEM_USER_TOKEN?.trim();
  const act = process.env.FACEBOOK_AD_ACCOUNT_ID?.trim();
  if (!token) {
    throw new Error("Missing FACEBOOK_SYSTEM_USER_TOKEN in .env.local");
  }
  if (!act) {
    throw new Error("Missing FACEBOOK_AD_ACCOUNT_ID in .env.local");
  }
  return new FacebookAdsAPI(token, act);
}

/**
 * @brief Creates one paused link ad (upload image → creative → ad).
 * @param api - Ad account API client.
 * @param pageId - Facebook Page ID for `object_story_spec`.
 * @param adSetId - Target ad set id.
 * @param row - Creative copy and asset URL.
 * @returns New ad id and creative id.
 */
async function createOnePurchaseAd(
  api: FacebookAdsAPI,
  pageId: string,
  adSetId: string,
  row: PurchaseAdRow
): Promise<{ adId: string; creativeId: string }> {
  const { buffer, ext } = await downloadImage(row.imageUrl);
  const filename = `nnaudio-${row.key}.${ext}`;
  const { hash } = await api.uploadAdImage(buffer, filename);

  const { id: creativeId } = await api.createAdCreative({
    name: `${row.name} Creative`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_hash: hash,
        link: row.link,
        message: row.message,
        name: row.headline,
        call_to_action: {
          type: "SHOP_NOW",
          value: { link: row.link },
        },
      },
    },
  });

  const ad = await api.createAd({
    name: row.name,
    adset_id: adSetId,
    status: "PAUSED",
    creative: { creative_id: creativeId },
  });

  return { adId: ad.id, creativeId };
}

/**
 * @brief CLI entry: creates purchase ads or dry-run listing.
 * @returns void
 */
async function main(): Promise<void> {
  const { adSetId, dryRun, limit } = parseArgs();
  const pageId = process.env.META_PAGE_ID?.trim();
  if (!adSetId) {
    console.error(
      "Missing ad set id. Pass --ad-set-id=<ID> or set META_PURCHASE_AD_SET_ID in .env.local\n" +
        "Find the id in Meta Ads Manager (ad set level) or via GET /api/facebook-ads/adsets."
    );
    process.exit(1);
  }
  const rows = limit ? PURCHASE_ADS.slice(0, limit) : PURCHASE_ADS;

  if (dryRun) {
    console.log("Dry run — would create", rows.length, "paused ads in ad set", adSetId);
    if (!pageId) {
      console.log("(Set META_PAGE_ID in .env.local before a real run.)");
    }
    for (const r of rows) {
      console.log("-", r.key, r.name, "\n  ", r.imageUrl);
    }
    process.exit(0);
  }

  if (!pageId) {
    console.error(
      "Missing META_PAGE_ID in .env.local (Facebook Page id for sponsored posts / link ads)."
    );
    process.exit(1);
  }

  const api = createApiFromEnv();
  const results: Array<{ key: string; adId: string; creativeId: string } | { key: string; error: string }> = [];

  for (const row of rows) {
    try {
      const { adId, creativeId } = await createOnePurchaseAd(api, pageId, adSetId, row);
      results.push({ key: row.key, adId, creativeId });
      console.log("Created", row.key, "ad", adId, "creative", creativeId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ key: row.key, error: msg });
      console.error("Failed", row.key, msg);
    }
  }

  const failed = results.filter((r) => "error" in r);
  console.log(
    "\nSummary:",
    results.length - failed.length,
    "ok,",
    failed.length,
    "failed. Ads are PAUSED — review and turn on in Ads Manager."
  );
  if (failed.length) process.exit(1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
