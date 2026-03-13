# Marketing Director — Reference

Deep reference for Meta (Facebook/Instagram) ad strategy, targeting, optimization, and analytics. Use when the agent needs detailed playbooks or definitions.

---

## Meta funnel and objectives

**Funnel stages:**

1. **Awareness** — Reach and brand awareness. Objectives: Reach, Brand Awareness, Video Views.
2. **Consideration** — Engagement and interest. Objectives: Traffic, Engagement, App Installs, Video Views, Lead Generation, Messages.
3. **Conversion** — Actions and sales. Objectives: Conversions, Catalog Sales, Store Traffic.

**Objective → optimization alignment:**

- **Conversions:** Set optimization_goal to the conversion event you care about (e.g. Purchase, Lead). Use Meta Pixel + CAPI; choose billing_event (e.g. IMPRESSIONS or LINK_CLICKS per Meta docs).
- **Traffic:** Optimize for link clicks; billing_event typically LINK_CLICKS.
- **Lead gen:** Optimize for leads; use Lead Ad or form + pixel.
- **Reach / brand:** Optimize for reach or impressions.

Campaign objective in the app must match the chosen optimization goal at the ad set level.

---

## Targeting best practices

- **Audience size:** For conversion campaigns Meta often recommends audiences in the 100K–1M+ range (depending on market) to allow the delivery system to learn. Too narrow can cause high CPA and learning phase issues.
- **Interest stacking:** Combine relevant interests (e.g. music production, DAW, specific artists/genres) to narrow intent while keeping size adequate.
- **Lookalike audiences:** Built from custom audiences (e.g. purchasers, trial signups). 1–2% lookalike often performs well for conversions; broader for awareness.
- **Custom audiences:** Website visitors, purchasers, email lists (hashed), engagement (video view, page engagement). Use for retargeting or as seed for lookalikes.
- **Placements:** Facebook Feed, Instagram Feed/Stories, Audience Network, etc. Auto placements often perform well; restrict only when creative or goal requires it.

Targeting is configured at the **ad set** level in Meta and in this app’s ad set create/edit flows.

---

## Optimization playbooks

**When to scale:**

- Ad set is out of learning phase (Meta typically shows “Learning” or “Learning limited”).
- CPA/ROAS/CTR meet or beat target for several days.
- Scale gradually (e.g. 20% budget increase every 2–3 days) to avoid resetting learning.

**When to pause:**

- Consistently poor metrics (e.g. CTR below benchmark, CPA above target, zero conversions after sufficient spend).
- Exhausted audience or creative fatigue (declining CTR over time).
- Budget better reallocated to a stronger campaign or ad set.

**A/B testing:**

- Test one variable per experiment where possible: creative, audience, placement, or copy.
- Run long enough for statistical significance (Meta recommends at least 50 conversions per ad set for conversion tests).
- Use the same campaign with multiple ad sets, or dedicated test campaigns, depending on structure.

**Using Ad Manager analytics:**

- Review date ranges: Last 7 Days for recent performance, Last 30/90 for trends.
- Compare platform breakdown (Facebook vs Instagram) to shift budget if one clearly outperforms.
- Use campaign-level and ad set–level data to identify winners and underperformers; pause or scale accordingly.

---

## Metric definitions

- **Impressions:** Number of times ads were shown.
- **Reach:** Unique users who saw the ad (may be in insights).
- **Clicks:** Link clicks (or other click types depending on configuration).
- **CTR (click-through rate):** Clicks / Impressions (often expressed as %).
- **Spend:** Total amount spent in the date range.
- **CPC (cost per click):** Spend / Clicks.
- **CPM (cost per mille):** Spend / (Impressions / 1000).
- **Conversions:** Number of conversion events (e.g. Purchase, Lead) attributed to the campaign/ad set.
- **Cost per conversion (CPA):** Spend / Conversions.
- **ROAS (return on ad spend):** Revenue from conversions / Spend (when revenue is tracked). Sometimes reported as ratio (e.g. 4.0 = 4x) or as percentage.

Conversion events are defined by the Meta Pixel and/or Conversions API (e.g. ViewContent, AddToCart, Purchase). The app’s insights API and analytics page expose the metrics that the backend fetches from Meta.

---

## Cymasphere context (for ad copy and targeting)

- **Product:** Intelligent music composition suite; chord progressions, melody patterns, AI pattern/groove generators; standalone app + AU/VST3 plugin; works with major DAWs.
- **Value props:** Music theory made accessible; no theory required to start; professional voice leading and harmony; visual, gestural workflow.
- **Pricing:** Monthly ($6/mo), Yearly ($59/yr), Lifetime ($149); free trial (7-day no card, 14-day with card).
- **Audience:** Music producers, composers, songwriters, educators, students, performing musicians—any skill level.

Use this when recommending messaging, audiences, or landing pages for Cymasphere campaigns.

---

## Project documentation links

- [docs/AD_MANAGER_README.md](../../../docs/AD_MANAGER_README.md) — Ad Manager integration, setup, API endpoints, file structure.
- [docs/META_ADS_SETUP.md](../../../docs/META_ADS_SETUP.md) — Meta Pixel, Conversions API, event setup, campaign creation in Meta.
- [docs/MARKETING_ANALYTICS_SETUP.md](../../../docs/MARKETING_ANALYTICS_SETUP.md) — GTM, GA, Meta Pixel, environment variables.
- [docs/E2E_AD_MANAGER_CHECKLIST.md](../../../docs/E2E_AD_MANAGER_CHECKLIST.md) — End-to-end testing and verification of Ad Manager and analytics.
