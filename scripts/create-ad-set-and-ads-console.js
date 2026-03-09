/**
 * @fileoverview Browser console script: create one NNAudio ad set and multiple ads via Ad Manager API.
 * Run from the browser console while on the same origin as the app (e.g. http://localhost:3000).
 * Requires being logged in so API requests send cookies.
 *
 * Usage:
 * 1. Open your app (e.g. http://localhost:3000) and log in as admin.
 * 2. Open DevTools → Console.
 * 3. Paste this entire script and press Enter.
 *
 * With FACEBOOK_MOCK_CONNECTION=true (dev), ad set and ads are created in mock mode.
 * With real Meta connection, campaign must have no CBO; ad creation needs image_hash, link, message, META_PAGE_ID.
 */

(async function createNNAudioAdSetAndAds() {
  const base = window.location.origin;

  async function getCampaigns() {
    const r = await fetch(`${base}/api/facebook-ads/campaigns`, { credentials: "include" });
    const data = await r.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch campaigns");
    return data.campaigns || [];
  }

  async function createAdSet(payload) {
    const r = await fetch(`${base}/api/facebook-ads/adsets`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.success) throw new Error(data.error || "Failed to create ad set");
    return data.adSet;
  }

  async function createAd(payload) {
    const r = await fetch(`${base}/api/facebook-ads/ads`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.success) throw new Error(data.error || "Failed to create ad");
    return data.ad;
  }

  try {
    console.log("[NNAudio] Fetching campaigns...");
    const campaigns = await getCampaigns();
    if (!campaigns.length) {
      console.error("[NNAudio] No campaigns found. Create a campaign first (Ad Manager → Campaigns → Create).");
      return;
    }
    const campaign = campaigns[0];
    const campaignId = campaign.id;
    console.log("[NNAudio] Using campaign:", campaign.name, "(" + campaignId + ")");

    // ——— Ad set ———
    const adSetPayload = {
      name: "NNAudio Cymasphere – US Link Clicks",
      campaignId,
      status: "PAUSED",
      dailyBudget: 15,
      targeting: {
        geo_locations: { countries: ["US"] },
        facebook_positions: ["feed"],
        publisher_platforms: ["facebook", "audience_network"],
      },
      optimizationGoal: "LINK_CLICKS",
      billingEvent: "LINK_CLICKS",
    };
    console.log("[NNAudio] Creating ad set...");
    const adSet = await createAdSet(adSetPayload);
    const adSetId = adSet.id;
    console.log("[NNAudio] Ad set created:", adSet.name, "(" + adSetId + ")");

    // ——— Ads (copy from ad-creative.md + products-reference.md) ———
    const adsToCreate = [
      {
        name: "Cymasphere – Your DAW doesn't get harmony",
        headline: "Your DAW doesn't get harmony. This does.",
        primaryText:
          "Chords that actually connect. Progressions that move. No theory degree required.\nCymasphere handles the voice leading—you just write. Standalone or plugin.\n7-day free trial.",
        cta: "Start free trial",
        link: "https://nnaud.io/product/cymasphere",
      },
      {
        name: "Cymasphere – The one thing that fixed my progressions",
        headline: "The one thing that fixed my progressions",
        primaryText:
          "Not more theory. Not another course. A tool that uses theory for you—so you can write without overthinking.\nIntelligent chord voicing. Patterns that adapt to your changes. Free trial.",
        cta: "Try Cymasphere free",
        link: "https://nnaud.io/product/cymasphere",
      },
      {
        name: "Cymasphere – You don't need more music theory",
        headline: "You don't need more music theory.",
        primaryText:
          "You need something that already knows it. Cymasphere: harmony and patterns that work while you focus on the idea.\n30+ scales. Voice leading built in. Standalone or in your DAW. Free trial.",
        cta: "Get the trial",
        link: "https://nnaud.io/product/cymasphere",
      },
    ];

    for (const ad of adsToCreate) {
      const payload = {
        name: ad.name,
        adSetId,
        campaignId,
        status: "PAUSED",
        creative: { title: ad.headline, body: ad.primaryText, callToAction: ad.cta },
        link: ad.link,
        message: ad.primaryText,
        headline: ad.headline,
        // Set image_hash if you have one (e.g. from Meta Ads Manager image upload); else mock or dev fallback may apply.
        // image_hash: "YOUR_IMAGE_HASH",
      };
      console.log("[NNAudio] Creating ad:", ad.name);
      const created = await createAd(payload);
      console.log("[NNAudio] Ad created:", created.name, "(" + created.id + ")");
    }

    console.log("[NNAudio] Done. Ad set +", adsToCreate.length, "ads created. Open Ad Manager to view or activate.");
  } catch (err) {
    console.error("[NNAudio] Error:", err.message);
  }
})();
