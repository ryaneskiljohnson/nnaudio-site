# Meta ad creative pack (NNAudio assets only)

**Primary goal: Purchase.** All **image URLs** are `https://nnaud.io/...` (NNAudio-hosted). Copy follows `/.cursor/skills/marketing-director/ad-creative.md`. Prices and URLs follow `/.cursor/skills/marketing-director/products-reference.md` (regenerate with `bun run build:products-for-ads` after catalog changes).

---

## Purchase campaigns: Meta setup (short)

1. **Campaign:** Objective **Sales** (or equivalent “Purchases” outcome in your Ad Manager version).  
2. **Conversion:** Optimize for **Purchase** (or **Complete payment** if that is what your pixel fires on successful checkout). Pixel + CAPI must match the event you optimize for; see `docs/META_ADS_SETUP.md`.  
3. **Landing:** Product or bundle URL with **working checkout** (same domain builds trust with the pixel).  
4. **Audience:** Purchase ads usually need **signal**. Start **warm** (site visitors, engaged video, ATC/initiate checkout if you have volume) unless daily spend is high enough to learn on broad cold.  
5. **Creative:** Use the **Purchase pack** tables below; CTAs are purchase-oriented (**Shop now**, **Buy now**, **Get offer**).

**Upload note:** Prefer **1:1** and **4:5** from the same source image; keep UI screenshots legible when small.

### Push these ads into Meta automatically

From the repo (requires `.env.local`: `FACEBOOK_SYSTEM_USER_TOKEN`, `FACEBOOK_AD_ACCOUNT_ID`, `META_PAGE_ID`, plus target ad set id):

```bash
bun run ads:create-purchase -- --ad-set-id=YOUR_AD_SET_NUMERIC_ID
# optional: --limit=3   or   META_PURCHASE_AD_SET_ID=... in .env.local
# dry list: --dry-run
```

Creates **paused** link ads (uploads each `nnaud.io` image to the ad account, then creative + ad). Turn them on in Ads Manager after review.

---

## Purchase pack A: Cymasphere (high AOV)

| # | Internal name | Headline | Primary text | CTA | Destination | Image |
|---|----------------|----------|----------------|-----|-------------|-------|
| PA1 | Cymasphere – price anchor | $149. Full harmony suite. (Was $499.) | Song Builder, harmony palettes, voicing engine, patterns—standalone or AU/VST3.\nOne checkout. Yours after payment. No subscription for the lifetime license path on the product page. | Shop now | https://nnaud.io/product/cymasphere | https://nnaud.io/images/cymasphere-features/Song%20View.webp |
| PA2 | Cymasphere – decision fatigue | Stop “studying” progressions. Start finishing them. | Cymasphere uses theory in the engine so you can write in the lane.\n**$149** for a limited-time sale price—see product page for current tiers. | Buy now | https://nnaud.io/product/cymasphere | https://nnaud.io/images/cymasphere-features/Voicing%20View.webp |
| PA3 | Cymasphere – proof in UI | What you see is what you write. | Palette + voicing + pattern tools in one workflow. Built for producers who can hear the idea but stall on changes.\nAdd to cart on nnaud.io. | Shop now | https://nnaud.io/product/cymasphere | https://nnaud.io/images/cymasphere-features/Palette%20View.webp |
| PA4 | Cymasphere – logo direct | Intelligent composition. One purchase. | If your sessions die at the same four chords, this is the bypass.\n**$149** sale vs **$499** list—confirm on site at checkout. | Get offer | https://nnaud.io/product/cymasphere | https://nnaud.io/images/cymasphere-logo.png |

**Carousel (optional):** Song → Voicing → Palette (same URLs as in earlier rows).

---

## Purchase pack B: Tetrad line (mid price, clear SKU)

| # | Internal name | Headline | Primary text | CTA | Destination | Image |
|---|----------------|----------|----------------|-----|-------------|-------|
| PB1 | Tetrad Keys – buy | $44.95. Keys that aren’t another EP patch. | Four blendable key engines. Buy once, use in the DAW.\nCheckout on the product page. | Buy now | https://nnaud.io/product/tetrad-keys | https://nnaud.io/images/tetrad-framed/tetrad-keys-featured.webp |
| PB2 | Tetrad Guitars – buy | Guitars built for dense mixes. $44.95. | Analog + digital + live layers you can balance in one instrument.\nPurchase on nnaud.io. | Shop now | https://nnaud.io/product/tetrad-guitars | https://nnaud.io/images/tetrad-framed/tetrad-guitars-featured.webp |
| PB3 | Tetrad Winds – buy | Wind tones with character. $44.95. | Four wind engines to blend. One payment, no rental.\nLink goes straight to buy flow. | Buy now | https://nnaud.io/product/tetrad-winds | https://nnaud.io/images/tetrad-framed/tetrad-winds-featured.webp |

---

## Purchase pack C: Ultimate Bundle (highest cart value)

| # | Internal name | Headline | Primary text | CTA | Destination | Image |
|---|----------------|----------|----------------|-----|-------------|-------|
| PC1 | Ultimate – everything | Everything NNAudio makes. One cart. | Lifetime access: plugins, MIDI, samples—full catalog.\n**$679.99** sale (list **$799.99**) per product page; tiers may include monthly/annual—checkout reflects current options. | Shop now | https://nnaud.io/product/ultimate-bundle | https://nnaud.io/images/landing/elite-bundles-visual.webp |
| PC2 | Ultimate – stop à la carte | Stop buying plugins one by one. | One bundle. One checkout. Built for producers who know they’ll use more than one NNAudio title.\nSee **Ultimate Bundle** for tiers and price. | Buy now | https://nnaud.io/bundles/ultimate-bundle | https://nnaud.io/images/landing/elite-bundles-visual.webp |

---

## Purchase pack D: Catalog / premium (browse-to-buy)

| # | Internal name | Headline | Primary text | CTA | Destination | Image |
|---|----------------|----------|----------------|-----|-------------|-------|
| PD1 | Premium line – buy path | Sound design that survives the mix. | Pick a premium instrument or FX; cart and checkout on nnaud.io.\nNo vague “solutions”—specific tools. | Shop now | https://nnaud.io/plugins | https://nnaud.io/images/landing/premium-spotlight-visual.webp |

---

## Extra nnaud.io-only images (swap or carousel)

- https://nnaud.io/images/landing/pathways-visual.webp  
- https://nnaud.io/images/landing/best-of-visual.webp  
- https://nnaud.io/images/landing/free-collection-visual.webp  
- https://nnaud.io/images/nnaud-io/NNAudio_Logo_Avatar.png  
- https://nnaud.io/images/cymasphere-features/Pattern%20View.webp  
- https://nnaud.io/images/cymasphere-features/Groove%20View.webp  

(Encode spaces as `%20` in Meta’s URL field.)

---

## Suggested test order (purchase)

1. **PA1** or **PA2** on **warm** (visitors / engagers) until you have steady **Purchase** events.  
2. **PB1–PB3** as a **carousel or three single-image ads** in one ad set only if budget supports learning (same audience, different SKU).  
3. **PC1** when you have retargeting pools large enough to justify **high AOV** creative.

---

## Appendix: Trial-first variants (split-test only)

If you run a **parallel** ad set optimized for **trial start** or **lead**, use these instead of Purchase pack A. Do not mix trial and purchase in the same **ad set** optimization goal.

| # | Headline | Primary text | CTA | Destination | Image |
|---|----------|----------------|-----|-------------|-------|
| TA1 | Your DAW doesn’t get harmony. This does. | …\n7-day free trial. | Start free trial | https://nnaud.io/product/cymasphere | https://nnaud.io/images/cymasphere-features/Song%20View.webp |
| TA2 | The one thing that fixed my progressions | …\nTrial is free for 7 days. | Try Cymasphere free | https://nnaud.io/product/cymasphere | https://nnaud.io/images/cymasphere-features/Palette%20View.webp |

---

## Free tools / Access (not purchase-primary)

`/free-tools` and **NNAudio Access** are still valid for **upper-funnel** or **retargeting** campaigns; they are a poor fit as the **primary** creative in a **Purchase**-optimized cold ad set. Use them in separate campaigns if you want volume at the top of the funnel.
