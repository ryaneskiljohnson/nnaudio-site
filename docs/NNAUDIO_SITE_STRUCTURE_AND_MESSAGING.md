# NNAud.io — Site Structure, Landing Pages, and Messaging

**Purpose:** Single reference for site structure, product catalog, landing-page roles, and on-site messaging. Use for growth campaigns, ad destinations, email CTAs, and content consistency.

**Source:** Live site (nnaud.io), `app/` routes, `components/sections/`, `components/pages/`, `utils/catalog-taxonomy.ts`.

---

## 1. Public route structure

### 1.1 Storefront families (nav order)

Defined in `utils/catalog-taxonomy.ts` as **PRODUCT_FAMILIES**. One canonical “home” per family:

| Path | Label | Role |
|------|--------|------|
| `/free-tools` | Free Tools | Acquisition; free plugins + MIDI + NNAudio Access |
| `/plugins` | Plugins | Full plugin catalog (FX, instruments, creative tools) |
| `/packs` | Packs | MIDI and sample packs |
| `/bundles` | Bundles | Elite bundles listing (Beat Lab, Producer's Arsenal, Ultimate) |
| `/products?category=application` | Apps | Application products (e.g. NNAudio Access) |
| `/products` | All Products | Full catalog, all categories |

### 1.2 Key public URLs (ad/email destinations)

| URL | Use case |
|-----|----------|
| `https://nnaud.io` | Homepage; broad brand / “choose your path” |
| `https://nnaud.io/free-tools` | **Primary acquisition** — cold traffic, free-offer ads, email “Get free tools” |
| `https://nnaud.io/plugins` | Plugin browse; “Browse plugins” CTA |
| `https://nnaud.io/packs` | Packs browse; MIDI/sample-focused campaigns |
| `https://nnaud.io/bundles` | Bundle value; “Explore bundles” / “Go for value” |
| `https://nnaud.io/bundles/{slug}` | Single bundle landing (e.g. `beat-lab`, `producers-arsenal`, `ultimate-bundle`) |
| `https://nnaud.io/product/{slug}` | Single product (e.g. `cymasphere`, `nnaudio-access`, `freelay-free-delay-module-plugin`) |
| `https://nnaud.io/downloads` | NNAudio Access download (auth-required; post-signup) |
| `https://nnaud.io/products` | Full catalog browse |
| `https://nnaud.io/cart` | Cart |
| `https://nnaud.io/checkout` | Checkout |

### 1.3 Homepage anchors (in-page)

- `#free-products` — Free collection section on homepage
- `#bundles` — Elite bundles section on homepage

Used by StartHereSection and ProofPointsSection for “Start with Free Collection” / “Elite Bundles” links when already on `/`.

---

## 2. Landing pages and messaging

### 2.1 Homepage (`/`)

**Components:** NNAudHeroSection, StartHereSection, ProofPointsSection, ConversionCtaSection, PremiumSpotlightSection, FreeCollectionSection, ProductsSection, FeaturedProductsSection, NNAudioAccessHighlightSection, FAQSection, PricingSection.

**Hero (NNAudHeroSection):**
- Eyebrow: (accent)
- Title: “NNAud.io – Plugins, Packs, And Creative Tools For Producers” / “Made For Real Sessions”

**Proof points (ProofPointsSection):**
- Eyebrow: “Made For Real Sessions”
- Title: “A creative catalog with less friction built in”
- Subtitle: “A catalog that starts easy and scales into deeper tools, packs, bundles, and workflows without the usual mess of scattered installs and disconnected one-off purchases.”
- Four cards: **Free tools worth keeping** | **Own what you buy** | **Built for real production workflows** | **Range without the clutter**
- Footer: “New here? Start with the Free Collection or jump straight into Elite Bundles.”

**Choose your path (StartHereSection):**
- Eyebrow: “Choose Your Path”
- Title: “Choose the way you want to start”
- Subtitle: “Start with the part of the catalog that matches what you want right now: useful tools, bigger value, or a deeper writing workflow.”
- Visual: “Three ways in, one cleaner ecosystem” — “Start free, build a bigger toolkit, or go straight into the flagship workflow depending on what kind of creator you are.”
- Three cards:
  1. **Try The Free Collection** — “Hear the sound, test the workflow…” → CTA “Start here” (→ #free-products)
  2. **Go Straight To Bundle Value** — “Move into the highest-value offers fast…” → CTA “Go for value” (→ #bundles)
  3. **Go Deep With Cymasphere** — “Explore the flagship workflow for stronger progressions…” → CTA “Explore the flagship” (→ `/product/cymasphere`)

**Premium / top-shelf (PremiumSpotlightSection):**
- Positions “Top Shelf” NNAudio: elite bundles + Cymasphere.
- Cymasphere: “Intelligent Music Creation” — “A flagship composition workflow built to move you from rough idea to stronger musical direction with less friction.” ($499 → $149)
- Elite Bundles: Beat Lab (Unlimited MIDI & Loops), Producer's Arsenal (Every Plugin. Every Update.), Ultimate Bundle (Everything We Make. Forever.)

**NNAudio Access highlight:**
- “Your NNAudio library, downloads, and updates in one place”
- “Free desktop app for Mac & Windows. Install faster, stay current, and keep every NNAudio product you own organized in one cleaner workspace.”
- CTAs: “See how it works” → `/product/nnaudio-access`, “Download free” → `/downloads`

---

### 2.2 Free tools (`/free-tools`)

**Role:** Primary acquisition landing page. Used by growth plan as main cold-traffic destination.

**Metadata (app/free-tools/page.tsx):**
- Title: “Free Tools | NNAud.io”
- Description: “Claim free plugins, free MIDI packs, and NNAudio Access from NNAud.io. Start with free tools, then grow into bundles and premium products.”

**Hero (FreeToolsLandingPage):**
- Eyebrow: “Free Collection”
- Title: “Get useful tools first. Decide what earns a permanent place later.”
- Subtitle: “Start with free plugins, free MIDI packs, and NNAudio Access in one clean place. No fluff, no filler, just tools you can actually put to work in real sessions.”
- Bullets: Free plugins (width, delay, EQ, reverb); Free MIDI packs (faster ideas, stronger starting points); NNAudio Access (install, update, manage everything you own).
- Primary CTA: “Explore The Free Collection” (→ #free-collection). Secondary: “See Bundle Pricing” (→ `/bundles`).
- Microcopy: “Start free now. Upgrade when you know what fits your workflow.”

**Why this page exists (feature card):**
1. Get the free collection into your workflow first.
2. Use NNAudio Access to keep everything cleaner.
3. Upgrade when you want more range, not more clutter.

**Section “Free Collection”:**
- Eyebrow: “Free Collection”
- Title: “The free side of the catalog, organized properly”
- Body: “NNAudio Access plus free plugins and free MIDI packs—pick what you need and add it in one place.”
- Groups: “Free Plugins & NNAudio Access” (hub + creative FX and instruments); “Free MIDI Packs” (idea starters, progressions, drum movement, melodic direction).

**Next step card:**
- Title: “When you’re ready to go deeper”
- Body: “Start with the free side of the catalog, then move into bundles when you want more range…”
- CTAs: “Explore Bundles” (→ `/bundles`), “Browse All Plugins” (→ `/plugins`).

---

### 2.3 Plugins (`/plugins`)

**Role:** Plugin catalog; “Browse plugins” / plugin-focused campaigns.

**Metadata:**
- Title: “Plugins | NNAud.io”
- Description: “Browse NNAud.io plugins, from free utilities to flagship instruments and effects for modern producers.”

**Catalog copy (CatalogPageClient):**
- Eyebrow: “Plugin Catalog”
- Title: “Plugins that earn a place in your sessions”
- Subtitle: “From quick creative utilities to deeper instruments and effects, this is the heart of the NNAudio plugin catalog.”
- Helper: “Browse free and premium plugins built for sound design, inspiration, workflow, and musical momentum.”

**Categories (from taxonomy):** Audio FX, Instruments, MIDI FX, Creative Tools (plugin). Sort: Name, Price, Rating, Newest.

---

### 2.4 Packs (`/packs`)

**Role:** MIDI and sample packs; “free MIDI” and pack-focused campaigns.

**Metadata:**
- Title: “Packs | NNAud.io”
- Description: “Browse MIDI packs and sample packs from NNAud.io, including free entry offers and bundle-ready production assets.”

**Catalog copy:**
- Eyebrow: “Packs Catalog”
- Title: “MIDI and sample packs built for faster ideas”
- Subtitle: “Explore melodic inspiration, rhythmic building blocks, and session-ready packs designed to keep the workflow moving.”
- Helper: “Start with free MIDI or go deeper into premium packs and bundles when you want more range, more speed, and more options.”

---

### 2.5 Bundles (`/bundles`)

**Role:** Bundle value; “Explore bundles” / “Go for value” from homepage and free-tools.

**Structure:** Client-rendered; fetches bundles from API. Grid of bundle cards; each card links to `/bundles/{slug}`.

**Elite bundles (from homepage and growth plan):**
- **Beat Lab** — Unlimited MIDI & Loops. Infinite Inspiration.
- **Producer's Arsenal** — Every Plugin. Every Update. Every Time.
- **Ultimate Bundle** — Everything We Make. Forever.

Bundle slugs come from DB (`bundles.slug`); common examples: `beat-lab`, `producers-arsenal`, `ultimate-bundle`, and any 20-for-20 style bundle slug if present.

---

### 2.6 Bundle detail (`/bundles/[slug]`)

**Role:** Single-bundle landing; retargeting and “Explore bundles” deep links.

**Structure:** Fetches `/api/bundles/[slug]`; shows bundle name, description, tiers, products, pricing, CTA to checkout. Breadcrumb: Home → Bundles → [Bundle name].

---

### 2.7 Product detail (`/product/[slug]`)

**Role:** Single-product landing; ads and email can link to specific products.

**Notable product slugs (from live catalog):**
- **Flagship:** `cymasphere`
- **App:** `nnaudio-access`
- **Free FX:** `freelay-free-delay-module-plugin`, `freeq-free-eq-module-plugin`, `freeverb-free-reverb-module-plugin`, `sterfreeo-free-stereo-module-plugin`, `strange-tingz-free-80s-plugin`
- **Free instruments:** `cowboy-harp-free-jaw-harp-plugin`, `game-boi-retro-sounds-free-plugin`
- **Free MIDI:** `apache-free-midi`, `midi-nerds-free-midi`, `rabbit-hole-free-midi`, `swiper-midi-free`

---

### 2.8 Downloads (`/downloads`)

**Role:** NNAudio Access download; requires auth. Post-signup and “Download free” from `/product/nnaudio-access` and homepage.

---

## 3. Product catalog structure

### 3.1 Categories (DB / taxonomy)

- **audio-fx-plugin** → Audio FX  
- **instrument-plugin** → Instruments  
- **midi-fx-plugin** → MIDI FX  
- **plugin** → Creative Tools  
- **pack** → Packs  
- **bundle** → Bundles (bundle products; bundle listings from `bundles` table)  
- **application** → Apps  

**Plugins family:** `audio-fx-plugin`, `instrument-plugin`, `midi-fx-plugin`, `plugin`.  
**Packs family:** `pack`.

### 3.2 Free products (acquisition layer)

Free = `price === 0` or `sale_price === 0` (from catalog). Shown on `/free-tools` and mixed into `/plugins` and `/packs`.

**Typical free set (from live site):**
- **Application:** NNAudio Access  
- **Instruments:** Cowboy Harp, Game Boi  
- **Audio FX:** Freelay, FreeQ, Freeverb, Sterfreeo, Strange Tingz  
- **Packs:** Apache MIDI, MIDI Nerds, Rabbit Hole MIDI, Swiper MIDI  

### 3.3 Bundles (elite + others)

Bundles are from `bundles` table; detail at `/bundles/[slug]`. Products with `category === 'bundle'` link to `/bundles/{slug}` (not `/product/{slug}`). Elite three: Beat Lab, Producer's Arsenal, Ultimate Bundle.

---

## 4. Messaging summary (for ads/email)

- **Brand:** “Plugins, Packs, And Creative Tools For Producers” / “Made For Real Sessions.”
- **Value:** “A creative catalog with less friction” — free tools, own what you buy, real workflows, range without clutter.
- **Three paths:** Free collection | Bundle value | Cymasphere (flagship).
- **Free tools page:** “Get useful tools first. Decide what earns a permanent place later.” — free plugins, free MIDI, NNAudio Access; upgrade when it fits.
- **Plugins:** “Plugins that earn a place in your sessions” — sound design, inspiration, workflow, momentum.
- **Packs:** “MIDI and sample packs built for faster ideas” — free MIDI or go deeper.
- **NNAudio Access:** “Your NNAudio library, downloads, and updates in one place” — free hub, one-click install/update.
- **Cymasphere:** “Intelligent Music Creation” — flagship composition workflow, rough idea → stronger musical direction.

---

## 5. References

- **Growth strategy (in-app):** Admin → Growth Strategy (`/admin/growth-strategy`).
- **Taxonomy:** `utils/catalog-taxonomy.ts`.
- **Free products data:** `utils/catalog.ts` (`getFreeProducts`).
- **Scaling playbook:** `docs/SCALING_WITH_ADS_RESEARCH.md`.
- **Ad destinations:** Use this doc’s “Key public URLs” and “Landing pages” for UTM and creative destination consistency.
