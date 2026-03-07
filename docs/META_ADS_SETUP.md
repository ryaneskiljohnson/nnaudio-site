# Meta Ads Setup Guide

This site is already wired for Meta (Facebook/Instagram) ads: **Meta Pixel** (browser) and **Conversions API** (server-side) are integrated. Use this guide to finish configuration and verify everything works.

---

## NNAudio pixel – configuration status

| Item | Status |
|------|--------|
| **Pixel ID** | Configured: `1072073301239581` (in `.env.local`) |
| **Pixel on site** | Loads on every page; fires PageView; ViewContent, AddToCart, InitiateCheckout, Purchase, CompleteRegistration wired |
| **CAPI token** | Configured in `.env.local` (generated from Events Manager → Conversions API → Generate access token). Server-side events enabled. |
| **Production** | Add `NEXT_PUBLIC_META_PIXEL_ID=1072073301239581` and `META_CONVERSIONS_API_TOKEN` in Vercel (or host) env. |

---

## Testing (configured setup)

1. **Pixel on site** – With dev server running (`npm run dev`), open the site and run:
   ```bash
   curl -s http://localhost:3000 | grep -o "1072073301239581"
   ```
   You should see the pixel ID (script loads on every page).

2. **Conversions API** – Send a test event (use a real `testEventCode` from Events Manager → Test events to see it in Meta):
   ```bash
   curl -s -X POST http://localhost:3000/api/meta/events \
     -H "Content-Type: application/json" \
     -d '{"eventName":"PageView","userData":{"clientUserAgent":"Test"},"testEventCode":"YOUR_TEST_CODE"}'
   ```
   Expected: `{"success":true,"message":"Event logged (test mode)",...}` with HTTP 200.

3. **Events Manager** – In [NNAudio pixel → Test events](https://eventsmanager.facebook.com/events_manager2/list/dataset/1072073301239581/test_events?business_id=1210690866895415), get a test event code, send the request above with that code, then confirm the event appears in Test events.

4. **Build** – Run `npm run build` to ensure the app compiles with the current analytics and CAPI code.

---

## NNAudio: Finish CAPI (one step)

1. **Generate CAPI token (one-time)**  
   Open: [NNAudio pixel Settings → Conversions API](https://eventsmanager.facebook.com/events_manager2/list/dataset/1072073301239581/settings?business_id=1210690866895415)  
   Scroll to **Set up direct integration** → **Generate access token** → in the modal, click **Generate access token** again → copy the token (Meta shows it only once).

2. **Set the token** (local):
   ```bash
   ./scripts/set-meta-token.sh 'YOUR_TOKEN_HERE'
   ```
   For production (e.g. Vercel), add `META_CONVERSIONS_API_TOKEN` in the project env.

3. **Optional:** In [Brand Safety → Domains](https://business.facebook.com/settings/owned-domains), add and verify `nnaud.io`.

4. **Verify:** Restart dev server; load the site and check Network for `fbevents.js`; in Events Manager use **Test Events** and send a test event to `/api/meta/events` with `testEventCode`.

---

## What’s Already Implemented

- **Meta Pixel** – Loaded on every page when `NEXT_PUBLIC_META_PIXEL_ID` is set (via `components/analytics/Analytics.tsx`). Tracks PageView and supports Purchase, AddToCart, Lead, etc.
- **Conversions API** – `POST /api/meta/events` sends server-side events to Meta (better attribution, works with ad blockers). Uses `META_CONVERSIONS_API_TOKEN`.
- **Checkout** – Purchase events fire on checkout success (browser pixel + optional CAPI) with value and currency.
- **Analytics helpers** – `utils/analytics.ts` exposes `trackPurchase`, `trackAddToCart`, `trackLead`, `trackMetaConversion`, etc.
- **Event logging** – Events are logged to Supabase `meta_conversion_events` for debugging (migration: `20250115000001_create_meta_conversion_events.sql`).

### Tracking coverage (where each event fires)

| Event | Where it fires | Notes |
|-------|----------------|--------|
| **PageView** | Every page | Pixel loads in root layout and fires once; `trackPageView()` available for SPA navigations. |
| **ViewContent** | Product page (`/product/[slug]`), Bundle page (`/bundles/[slug]`) | Fired once when product/bundle data is loaded. |
| **AddToCart** | Any add-to-cart action | Fired from `CartContext.addItem()` (product page, bundle page, ProductCard, FeaturedProductsSection, etc.). |
| **InitiateCheckout** | Cart page (click "Proceed to checkout"), Checkout page load (`/checkout`), Bundle checkout page load (`/checkout/bundle`) | One event per checkout attempt; bundle lifetime redirects to `/checkout` so that page fires there. |
| **Purchase** | Checkout success page (`/checkout-success`) | Browser pixel + CAPI (value, currency, content_ids, transactionId for deduplication). |
| **CompleteRegistration** | Signup success page (`/signup-success`) | Pixel + Conversions API when user lands after signup. |
| **Lead** | Not auto-fired | Use `trackLead()` or `trackMetaConversion('Lead', {...})` on form submissions (e.g. newsletter, contact). |
| **Search** | Not auto-fired | Use `trackSearch(term)` if you add site search. |

---

## 1. Get Your Meta Credentials

### Pixel ID

1. Open [Meta Events Manager](https://business.facebook.com/events_manager2).
2. Select your Pixel (or create one).
3. Copy the **Pixel ID** (numeric, e.g. `915245002872239`).

### Conversions API access token

1. In [Meta Business Suite](https://business.facebook.com) go to **Settings → Data Sources → Datasets**.
2. Select the same Pixel.
3. Open **Settings → Generate access token** (or use an existing token with the right permissions).
4. Copy the token and store it securely (do not commit to git).

---

## 2. Environment Variables

Add to `.env.local` (and to your production env, e.g. Vercel):

```bash
# Meta Ads – required for pixel + Conversions API
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
META_CONVERSIONS_API_TOKEN=your_access_token_here
```

- **`NEXT_PUBLIC_META_PIXEL_ID`** – Required for the pixel to load. Must be set for Meta ads.
- **`META_CONVERSIONS_API_TOKEN`** – Required for server-side events via `/api/meta/events`. Omit only if you use pixel-only tracking.

Restart the dev server after changing env vars:

```bash
bun run dev
```

---

## 3. Domain Verification (recommended for ads)

For some ad features and to avoid delivery issues, verify your domain in Meta:

1. [Meta Business Suite](https://business.facebook.com) → **Settings → Brand Safety → Domains**.
2. Add your domain (e.g. `nnaud.io`).
3. Choose **DNS verification**: add the TXT record Meta shows to your DNS.
4. Wait for verification (often a few minutes).

Alternatively you can use the **HTML file** or **meta tag** method from the same Domains screen.

---

## 4. Database (for event logging)

If you want events logged to Supabase:

- Ensure the migration is applied, e.g. run:
  - `bun run supabase-migrate`, or  
  - Apply `supabase/migrations/20250115000001_create_meta_conversion_events.sql` (or the equivalent in your migrations).

---

## 5. Verify the setup

### Check env vars (CLI)

Before testing, confirm variables are set (values are redacted):

```bash
# From project root – .env.local is not committed
grep -E '^NEXT_PUBLIC_META_PIXEL_ID=|^META_CONVERSIONS_API_TOKEN=' .env.local 2>/dev/null | sed 's/=.*/=***/' || echo "No Meta vars in .env.local"
```

If you see both lines with `=***`, you’re set. Restart the dev server after any change.

### Pixel loading

1. Open your site in a browser (with `NEXT_PUBLIC_META_PIXEL_ID` set).
2. DevTools → **Network** → filter by `fbevents.js`. You should see a request to `https://connect.facebook.net/.../fbevents.js`.
3. In the console, type `fbq` – it should be a function if the pixel loaded.

### Test Events in Meta

1. In Events Manager, open **Test Events**.
2. Use the **Test event code** shown there (e.g. `TEST12345`).
3. Call the API with that code, e.g.:

```bash
curl -X POST http://localhost:3000/api/meta/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "PageView",
    "userData": { "clientUserAgent": "test" },
    "testEventCode": "TEST12345"
  }'
```

Replace `TEST12345` with your real test event code. The event should appear in Test Events within a few seconds.

### Purchase / checkout

- Complete a test purchase and confirm in **Events Manager** that a **Purchase** event appears with the expected value and currency.
- Optionally check `meta_conversion_events` in Supabase for the same event.

---

## 6. Optional: Test event code in development

To send all test traffic to Meta’s Test Events, you can use a test event code in dev only (e.g. via an env var or feature flag) when calling the Conversions API or when triggering the pixel. Do not use the test code in production.

---

## 7. Checklist

- [ ] Pixel ID and (if using CAPI) access token set in `.env.local` and production.
- [ ] Dev server restarted after env changes.
- [ ] Domain verified in Meta (Brand Safety → Domains).
- [ ] Migration applied if you use Supabase event logging.
- [ ] Pixel loads (Network: `fbevents.js`, console: `fbq`).
- [ ] Test event appears in Events Manager → Test Events when calling `/api/meta/events` with `testEventCode`.
- [ ] After a test purchase, Purchase event shows in Events Manager with value/currency.

---

## More detail

- **Conversions API usage and events** – See [META_CAPI_QUICK_START.md](./META_CAPI_QUICK_START.md).
- **Facebook Ad Manager (campaigns in-app)** – See [AD_MANAGER_README.md](./AD_MANAGER_README.md).
