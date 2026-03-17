# Scaling NNAud.io with Ads — Research & Playbook

**Purpose:** Deep research on taking the NNAud.io business and scaling it with paid advertising. Use this alongside the in-app Ad Manager (Admin → Ad Manager), `products-reference.md`, and `docs/AD_MANAGER_README.md`.

**Last updated:** From live site review (nnaud.io) and codebase review.

---

## 1. Product catalog overview (from nnaud.io)

### 1.1 Applications

| Product        | Tagline / positioning              | Price (sale) | URL |
|----------------|-------------------------------------|--------------|-----|
| **Cymasphere** | Intelligent Music Creation          | $499 → $149  | `/product/cymasphere` |
| **NNAudio Access** | Free hub: download, update, manage all NNAudio products | **Free** | `/product/nnaudio-access` |

### 1.2 Bundles (Elite)

- **Ultimate Bundle** — Everything we make, forever. (Subscription + lifetime options.)
- **Beat Lab** — Unlimited MIDI & loops. (Subscription + lifetime.)
- **Producer's Arsenal** — Every plugin, every update. (Subscription + lifetime.)
- **20 For 20 MIDI Bundle** — 20 premium MIDI packs for $20 (one-time).

### 1.3 Instrument plugins (paid, from /plugins)

Albanju, Apache Flute, Blaque, Curio, Digital Dreamscape, Evanescent, Mandolele, Mesosphere, Natura, Noker, Numb, Obscura, Perc Gadget, Prodigious, Quoir, Reiya, Rompl Workstation, SubFlux, Tactures, Tetrad Guitars, Tetrad Keys, Tetrad Winds — price range ~$14.95–$69.95 (sale).

### 1.4 Audio FX plugins (paid + free)

**Paid:** Crystal Ball, Curves EQ, Digital Echoes Delay — ~$14.95–$49.95.  
**Free:** Freelay, FreeQ, Freeverb, Sterfreeo, Strange Tingz.

### 1.4 Free products (complete list)

Use these as **lead magnets** and **top-of-funnel** in ads (see Section 3).

| Product          | Type        | Tagline / use case                    | URL |
|------------------|------------|--------------------------------------|-----|
| **NNAudio Access** | Application | Free hub for all NNAudio products   | `/product/nnaudio-access` |
| **Cowboy Harp**  | Instrument  | Western-inspired harp (jaw harp)     | `/product/cowboy-harp-free-jaw-harp-plugin` |
| **Game Boi**     | Instrument  | Retro gaming synth (Game Boy / N64)  | `/product/game-boi-retro-sounds-free-plugin` |
| **Strange Tingz** | Audio FX   | Vintage effects processor            | `/product/strange-tingz-free-80s-plugin` |
| **Freelay**      | Audio FX    | Simple delay processor               | `/product/freelay-free-delay-module-plugin` |
| **FreeQ**        | Audio FX    | Advanced EQ / frequency tool         | `/product/freeq-free-eq-module-plugin` |
| **Freeverb**     | Audio FX    | Professional reverb                  | `/product/freeverb-free-reverb-module-plugin` |
| **Sterfreeo**    | Audio FX    | Stereo width enhancement            | `/product/sterfreeo-free-stereo-module-plugin` |
| **Apache MIDI**  | Pack        | MIDI chord progressions & melodies  | `/product/apache-free-midi` |
| **MIDI Nerds**   | Pack        | Drum & percussion MIDI pack          | `/product/midi-nerds-free-midi` |
| **Rabbit Hole MIDI** | Pack   | MIDI chord progressions pack         | `/product/rabbit-hole-free-midi` |
| **Swiper MIDI**  | Pack        | MIDI chord progressions pack         | `/product/swiper-midi-free` |

**Total: 12 free products** (1 app + 2 instruments + 5 FX + 4 MIDI packs). All require account/sign-up to “add to cart” and download via NNAudio Access, which naturally builds your list and retargeting pool.

### 1.5 Sample packs (paid)

From homepage and /packs: UMC6 MIDI, MIDI Library 3, Ultimate Drums & Percs 1 & 2, plus many more in the full catalog (see `.cursor/skills/marketing-director/products-reference.md` for the full list). Price range typically $14.95–$24.95+.

---

## 2. What you already have (technical foundation)

- **In-app Facebook/Meta Ad Manager** — Create campaigns, ad sets, and ads from Admin → Ad Manager. OAuth connect, campaign CRUD, analytics. See `docs/IN_APP_AD_MANAGER_SETUP.md` and `docs/AD_MANAGER_README.md`.
- **Products reference for ad copy** — `npm run build:products-for-ads` writes `.cursor/skills/marketing-director/products-reference.md` (names, taglines, one-line pitches, URLs). Use this for headlines and primary text.
- **Meta Pixel + CAPI** — For conversion tracking (ViewContent, AddToCart, Purchase). Independent of the Ad Manager; configure per `docs/META_ADS_SETUP.md` / `docs/MARKETING_ANALYTICS_SETUP.md`.
- **Dedicated landing pages** — Product pages (`/product/[slug]`), `/plugins`, `/packs`, `/bundles`, `/downloads` (NNAudio Access). Use these as destination URLs in ads instead of only the homepage.

---

## 3. Scaling strategy: funnel and role of free products

### 3.1 Funnel stages (Meta-aligned)

1. **Awareness** — Reach, brand awareness, video views.  
2. **Consideration** — Traffic, engagement, leads (e.g. free plugin/pack signup).  
3. **Conversion** — Purchases, trials (e.g. Cymasphere), bundle signups.

Free products sit at **consideration**: they capture emails/accounts and create a custom audience for retargeting. They also prove product quality before paid purchase.

### 3.2 Free products as lead magnets (industry pattern)

- **Beautiful Beats, Nodscape, WavGrind** and others use free sample packs (or free plugins) in exchange for email signup.  
- Best practice: high-quality, immediately useful, royalty-free; one clear CTA (e.g. “Get free plugin” or “Download free MIDI pack”).  
- NNAud.io already has 12 free products; no extra “lead magnet” asset is required — you can advertise the existing free plugins and MIDI packs directly.

**Suggested use in ads:**

- **Cold traffic:** “Free delay / reverb / EQ / stereo plugin — no credit card.” → Land on `/product/freelay-free-delay-module-plugin` (or Freeverb, FreeQ, Sterfreeo, Game Boi, etc.).  
- **Free MIDI:** “Free MIDI chord progressions & loops.” → Land on `/product/apache-free-midi` or `/product/rabbit-hole-free-midi`.  
- **NNAudio Access:** “One app to manage all your NNAudio plugins and packs.” → Land on `/product/nnaudio-access` or `/downloads`.

After signup/add-to-cart, use **custom audiences** (website visitors, add-to-cart, purchasers) for retargeting with paid product and bundle ads.

### 3.3 Budget and scaling (digital products)

- **Start small:** e.g. $10–20/day per campaign; evaluate after 48–72 hours.  
- **Scale gradually:** ~20% budget increase every 2–3 days when CPA/ROAS/CTR are on target and the ad set is out of learning.  
- **Campaign Budget Optimization (CBO)** is often recommended for stability at scale.  
- **Test many creatives:** different hooks (free plugin vs. paid bundle), visuals (plugin UI, waveforms, producer shots), and copy lengths.  
- **Dedicated landing pages** for each campaign (e.g. one product or “free tools” page) tend to outperform sending everything to the homepage.

---

## 4. Recommended first campaigns (using your Ad Manager)

Copy and creative should pull from `products-reference.md` (regenerate with `npm run build:products-for-ads` when the catalog changes).

### Campaign A: Cymasphere — Sales

- **Objective:** Sales (Conversions).  
- **Ad set (cold):** Interests = music production, DAW (Ableton, FL Studio, Logic Pro), beat making, composition. Geo = US, UK, CA (or priority markets). Optimization = **Conversions** (Purchase or Lead via Pixel/CAPI). Billing = IMPRESSIONS or LINK_CLICKS per Meta guidance. Daily budget e.g. $10–20.  
- **Ad set (retargeting):** Website visitors or 1% lookalike of purchasers/trial signups; same optimization.  
- **Ads:** Headline and primary text from products-reference (Cymasphere one-line pitch, differentiators). CTA: “Start free trial” or “Learn more.” Destination: `https://nnaud.io/product/cymasphere`.

### Campaign B: NNAudio — Traffic (top of funnel)

- **Objective:** Traffic.  
- **Ad set:** Broad music production / plugin / sample pack interests; optimization **Link clicks**; daily budget.  
- **Ads:** “Plugins, MIDI packs, and intelligent music tools — one place.” CTA: “Browse plugins” or “Try free.” Destination: `https://nnaud.io` or `https://nnaud.io/plugins` or `https://nnaud.io/product/cymasphere`.

### Campaign C: Free tools — Leads / consideration

- **Objective:** Traffic or Lead generation (depending on whether you gate “free” behind a form or just account signup).  
- **Ad set:** Same or slightly broader targeting than Campaign B; optimization Link clicks (or Leads if using a lead form).  
- **Ads:** One ad per free product or a “Free plugins & MIDI” ad:  
  - “Free delay, reverb, EQ, stereo width — professional plugins. No card.” → `https://nnaud.io/product/freelay-free-delay-module-plugin` or a “free tools” landing page if you build one.  
  - “Free MIDI chord progressions and drum loops.” → `https://nnaud.io/product/apache-free-midi`.  
- **Goal:** Grow signups and custom audiences for retargeting with Cymasphere and bundles.

### Campaign D: Bundles (Ultimate, Beat Lab, Producer's Arsenal)

- **Objective:** Sales (Conversions).  
- **Ad set:** Can start with same interest targeting as Cymasphere; add retargeting and lookalikes as data accumulates.  
- **Ads:** Use bundle taglines and “See pricing options” CTA; destination = bundle page, e.g. `https://nnaud.io/bundles/ultimate-bundle` (or correct slug from your routes).

---

## 5. Targeting (ad set level)

- **Audience size:** For conversion campaigns, Meta often recommends ~100K–1M+ (market-dependent) so the delivery system can learn.  
- **Interests:** Stack music production, DAW names (Ableton, FL Studio, Logic Pro, etc.), beat making, composition, specific genres or artists if relevant.  
- **Custom audiences:** Website visitors (all or by page), add-to-cart, purchasers, email list (hashed). Use for retargeting and as seeds for 1–2% lookalikes.  
- **Placements:** Auto placements are often best; restrict only when creative or goal requires it.

(Your in-app Ad Manager configures targeting at the ad set level; see `docs/AD_MANAGER_README.md` and Marketing Director `reference.md` for optimization playbooks.)

---

## 6. Creative and copy tips (digital/software)

- **Social proof:** Testimonials, “X producers use…”, ratings.  
- **Clear value:** “Free professional reverb” / “Intelligent music creation — no theory required.”  
- **Single CTA per ad:** “Get free plugin” vs “Shop bundles” vs “Start trial.”  
- **Creative tests:** Multiple images or short videos (plugin UI, producer in studio, waveform); test UGC-style vs. product-focused.  
- **Landing page match:** Ad message should match the destination page (e.g. free plugin ad → free plugin page, not homepage).

---

## 7. Metrics to watch

- **CTR, CPC, CPM** — Engagement and cost efficiency.  
- **Conversions (Purchase, Lead, AddToCart)** — From Pixel/CAPI.  
- **CPA, ROAS** — Per campaign/ad set; pause or scale based on target.  
- **Learning phase** — Avoid big, frequent budget or targeting changes until ad sets exit learning.  
- Use the Ad Manager analytics (and Meta Ads Manager) for date ranges (e.g. Last 7, 30, 90 days) and platform breakdown (Facebook vs Instagram).

---

## 8. Next steps (action list)

1. **Confirm tracking:** Pixel + CAPI firing for ViewContent, AddToCart, Purchase (and Lead if you use lead ads).  
2. **Connect Ad Manager:** Complete Facebook app + env vars + OAuth per `docs/IN_APP_AD_MANAGER_SETUP.md`.  
3. **Regenerate products reference:** Run `npm run build:products-for-ads`; use `products-reference.md` for all ad copy.  
4. **Launch Campaign B (Traffic):** Low risk; validates creative and targeting. Then add Campaign C (free tools) and Campaign A (Cymasphere sales).  
5. **Build custom audiences:** Website visitors, add-to-cart, purchasers; create 1% lookalikes when you have enough data.  
6. **Optional:** Add a “Free tools” or “Free plugins & MIDI” landing page that lists all 12 free products for a single URL in free-tool ads.  
7. **Iterate:** Pause underperformers; scale winners by ~20% every 2–3 days; keep testing new creatives and audiences.

---

## 9. References (in repo)

- **Ad Manager:** `docs/AD_MANAGER_README.md`, `docs/IN_APP_AD_MANAGER_SETUP.md`, `docs/E2E_AD_MANAGER_CHECKLIST.md`  
- **Marketing Director:** `.cursor/skills/marketing-director/reference.md` (funnel, targeting, optimization), `.cursor/skills/marketing-director/products-reference.md` (regenerate with `npm run build:products-for-ads`)  
- **Analytics / Pixel:** `docs/META_ADS_SETUP.md`, `docs/MARKETING_ANALYTICS_SETUP.md`

This document is the single place for “product catalog + free products + how to scale with ads” and can be updated as you add products or new campaigns.
