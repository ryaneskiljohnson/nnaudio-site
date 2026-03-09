# Meta Ad Manager — Gaps vs. Facebook Ads Manager

This doc lists settings and features that the **real Facebook/Meta Ads Manager** has that **our in-app Ad Manager** does not yet expose or support. Use it to prioritize what to integrate next.

---

## Campaign level

| Meta has | We have | Notes |
|----------|---------|--------|
| Name, objective, status | ✅ | |
| Daily / lifetime budget, start/end date | ✅ | |
| Special ad categories | ✅ (API sends `[]`) | No UI to set Housing, Employment, Credit, etc. Required for certain verticals. |
| All campaign objectives | Partial | We support Traffic, Leads, Sales, Engagement, Awareness, App promotion. Meta has more (e.g. Messages, Catalog sales). |
| A/B test (campaign level) | ❌ | |
| Campaign budget optimization (CBO) | ❌ | Meta can optimize budget across ad sets; we set budget at campaign or ad set. |

---

## Ad set level

| Meta has | We have | Notes |
|----------|---------|--------|
| Name, status, budget (daily/lifetime) | ✅ | |
| Start/end time | API only | `CreateAdSetParams` has `startTime`, `endTime`; **no form fields** in create/edit. |
| Optimization goal | Partial | UI had only LINK_CLICKS, IMPRESSIONS, REACH. **API supports** CONVERSIONS, LEADS, LANDING_PAGE_VIEWS, VIDEO_VIEWS, POST_ENGAGEMENT, BRAND_AWARENESS — now added to form. |
| Billing event | Partial | UI had IMPRESSIONS, LINK_CLICKS. **API supports** CONVERSIONS, VIDEO_VIEWS, CLICKS — now added to form. |
| **Targeting** | **Hardcoded** | **Largest gap.** We send `{ geo_locations: { countries: ["US"] } }` only. No UI for: |
| → Location (countries, regions, cities) | ❌ | |
| → Age min/max | ❌ | |
| → Gender | ❌ | |
| → Detailed targeting (interests, behaviors, custom audiences) | ❌ | |
| → Excluded audiences | ❌ | |
| Placements | ❌ | Meta: Automatic vs. Edit placements (Feed, Stories, Reels, etc.). We don’t send placement; Meta defaults. |
| Pixel / conversion event (for CONVERSIONS) | ❌ | When optimization = CONVERSIONS, Meta needs conversion event (e.g. Purchase, Lead). We don’t let user pick event or pixel. |
| Audience size estimate | ❌ | Meta shows “Potential reach” in UI. We don’t fetch or show it. |

---

## Ad level

| Meta has | We have | Notes |
|----------|---------|--------|
| Name, status, creative (title, body, image/video, CTA, link) | ✅ | |
| Multiple creatives per ad (carousel, etc.) | ❌ | Single image or video only. |
| Placement-specific creative (e.g. different copy for Stories) | ❌ | |
| Dynamic creative (Meta mixes assets) | ❌ | |
| UTM / URL parameters | ❌ | No structured way to add utm_source, etc. (could be in link URL manually). |
| Conversion event override | ❌ | For conversion campaigns, ad-level event override not exposed. |

---

## Analytics / insights

| Meta has | We have | Notes |
|----------|---------|--------|
| Account/campaign/ad set/ad level metrics | ✅ (via insights API) | |
| Date range, breakdowns (by placement, device, etc.) | Partial | We have date presets; breakdowns may be limited. |
| Custom reports, saved reports | ❌ | |
| Attribution windows | ❌ | Not exposed in our UI. |

---

## Recommended integration order

1. **Ad set targeting UI** — At least: countries (multi), age min/max, gender. Then interests/behaviors or “detailed targeting” so we’re not stuck with US-only.
2. **Ad set start/end time** — API already supports it; add fields to create/edit ad set form.
3. **Placements** — Optional but useful: let user choose Automatic vs. Manual and pick placements.
4. **Conversion event / pixel** — When optimization goal = CONVERSIONS, allow selecting pixel and conversion event (e.g. Purchase, Lead).
5. **Special ad categories** — UI to set when running Housing, Employment, Credit, etc.
6. **Campaign redirect after create** — After creating a campaign, redirect to that campaign’s edit or to ad set create (using returned `campaign.id`) so the flow is one continuous path.

---

*Last updated from in-app Ad Manager and `utils/facebook/api.ts` contract.*
