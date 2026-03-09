import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';

/** Optimization goals that require bid constraints (e.g. roas_average_floor) or bid_amount. Meta returns error 2490487 if sent without them. We do not support these in the UI. */
const OPTIMIZATION_GOALS_REQUIRING_BID_CONSTRAINTS = ['VALUE', 'LOWEST_COST_WITH_MIN_ROAS'] as const;

/** Normalize a raw Meta ad set for list/UI: id, name, campaignId, budget, optimization_goal, targeting summary. */
function normalizeAdSet(raw: {
  id: string;
  name?: string;
  campaign_id?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  status?: string;
  campaignId?: string;
  optimization_goal?: string;
  targeting?: { geo_locations?: { countries?: string[] } };
}): {
  id: string;
  name: string;
  campaignId: string;
  budget: number;
  status?: string;
  optimization_goal?: string;
  countries?: string[];
} {
  const budgetCents = raw.daily_budget != null ? parseInt(String(raw.daily_budget), 10) : raw.lifetime_budget != null ? parseInt(String(raw.lifetime_budget), 10) : 0;
  const budget = Number.isFinite(budgetCents) ? budgetCents / 100 : 0;
  const campaignId = (raw.campaign_id != null ? String(raw.campaign_id) : raw.campaignId != null ? String(raw.campaignId) : '');
  const countries = raw.targeting?.geo_locations?.countries;
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    campaignId,
    budget,
    status: raw.status,
    optimization_goal: raw.optimization_goal,
    countries: Array.isArray(countries) ? countries : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    
    // Development mode: return mock ad sets
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const mockAdSets = [
        {
          id: "adset_1",
          name: "Desktop Users 25-45",
          campaignId: campaignId || "1",
          status: "active",
          budget: 500,
          spent: 123.45,
          impressions: 6225,
          clicks: 156,
          conversions: 12,
          ctr: 2.51,
          cpc: 0.79,
          cpm: 19.85,
          targeting: {
            ageMin: 25,
            ageMax: 45,
            genders: ["male", "female"],
            locations: ["United States"],
            interests: ["Technology", "Music Production"]
          },
          placements: ["facebook_feeds", "instagram_feeds"],
          createdAt: "2024-01-20"
        },
        {
          id: "adset_2",
          name: "Mobile Users 18-35",
          campaignId: campaignId || "1",
          status: "active",
          budget: 300,
          spent: 67.89,
          impressions: 3420,
          clicks: 89,
          conversions: 7,
          ctr: 2.60,
          cpc: 0.76,
          cpm: 19.85,
          targeting: {
            ageMin: 18,
            ageMax: 35,
            genders: ["male", "female"],
            locations: ["United States", "Canada"],
            interests: ["Music", "Electronic Music", "Audio Equipment"]
          },
          placements: ["instagram_feeds", "instagram_stories"],
          createdAt: "2024-01-20"
        }
      ];

      const filteredAdSets = campaignId 
        ? mockAdSets.filter(adSet => adSet.campaignId === campaignId)
        : mockAdSets;

      return NextResponse.json({
        success: true,
        adSets: filteredAdSets,
        isDevelopmentMode: true
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const token = getToken();
    if (!token?.trim() || !adAccountId?.trim() || adAccountId === '123456789') {
      if (isDevelopment && !token) {
        const mockAdSets = [
          { id: 'adset_1', name: 'Desktop Users 25-45', campaignId: campaignId || '1', status: 'active', budget: 500, spent: 123.45, impressions: 6225, clicks: 156, conversions: 12, ctr: 2.51, cpc: 0.79, cpm: 19.85, targeting: {}, placements: [], createdAt: '2024-01-20' },
          { id: 'adset_2', name: 'Mobile Users 18-35', campaignId: campaignId || '1', status: 'active', budget: 300, spent: 67.89, impressions: 3420, clicks: 89, conversions: 7, ctr: 2.60, cpc: 0.76, cpm: 19.85, targeting: {}, placements: [], createdAt: '2024-01-20' },
        ];
        const filtered = campaignId ? mockAdSets.filter((a: { campaignId: string }) => a.campaignId === campaignId) : mockAdSets;
        return NextResponse.json({ success: true, adSets: filtered, isDevelopmentMode: true });
      }
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads. Connect in Ad Manager → Settings.' }, { status: 401 });
    }
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    let rawAdSets: Array<{ id: string; name?: string; campaign_id?: string; daily_budget?: string; lifetime_budget?: string; status?: string }>;
    try {
      const data = await facebookAPI.getAdSets(campaignId || undefined);
      rawAdSets = Array.isArray(data) ? data : [];
    } catch (apiError) {
      console.error('Facebook API getAdSets failed:', apiError);
      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'Failed to fetch ad sets'
      }, { status: 502 });
    }

    const adSets = Array.isArray(rawAdSets) ? rawAdSets.map(normalizeAdSet) : [];
    return NextResponse.json({
      success: true,
      adSets
    });
  } catch (error) {
    console.error('Error fetching ad sets:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ad sets'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Development mode: simulate ad set creation
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const body = await request.json();
      
      // Simulate ad set creation delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockAdSet = {
        id: `adset_mock_${Date.now()}`,
        name: body.name,
        campaignId: body.campaignId,
        status: body.status?.toLowerCase() || 'paused',
        budget: body.dailyBudget || 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        targeting: body.targeting || {},
        placements: body.placements || [],
        createdAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        adSet: mockAdSet,
        message: 'Ad set created successfully (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const body = await request.json();
    const {
      name,
      campaignId,
      status,
      dailyBudget: rawDailyBudget,
      lifetimeBudget: rawLifetimeBudget,
      targeting,
      optimizationGoal,
      billingEvent,
      startTime,
      endTime
    } = body;

    // Validate required fields
    if (!name || !campaignId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, campaignId, status'
      }, { status: 400 });
    }

    const goal = (optimizationGoal ?? 'LINK_CLICKS').toString().trim().toUpperCase();
    if (OPTIMIZATION_GOALS_REQUIRING_BID_CONSTRAINTS.includes(goal as any)) {
      return NextResponse.json({
        success: false,
        error: 'Bid amount or bid constraints required: The optimization goal you selected (VALUE/ROAS) requires a minimum ROAS or bid cap, which is not configurable here. Use "Link clicks", "Conversions", or another goal from the list, or set ROAS in Meta Ads Manager.'
      }, { status: 400 });
    }

    const dailyBudgetNum = typeof rawDailyBudget === 'number' && rawDailyBudget > 0
      ? rawDailyBudget
      : typeof rawDailyBudget === 'string' ? parseFloat(rawDailyBudget) : NaN;
    const dailyBudget = Number.isFinite(dailyBudgetNum) && dailyBudgetNum > 0 ? dailyBudgetNum : 10;
    const lifetimeBudgetNum = typeof rawLifetimeBudget === 'number' && rawLifetimeBudget > 0
      ? rawLifetimeBudget
      : typeof rawLifetimeBudget === 'string' ? parseFloat(rawLifetimeBudget) : NaN;
    const useLifetimeBudget = Number.isFinite(lifetimeBudgetNum) && lifetimeBudgetNum > 0;

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const token = getToken();
    if (!token?.trim()) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads. Connect your account in Ad Manager → Settings.' }, { status: 401 });
    }
    if (!adAccountId?.trim() || adAccountId === '123456789') {
      return NextResponse.json({ success: false, error: 'No ad account selected. Connect Facebook in Ad Manager → Settings and ensure an ad account is available.' }, { status: 401 });
    }
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads. Connect your account in Ad Manager → Settings.' }, { status: 401 });
    }

    const targetingPayload = targeting && typeof targeting === 'object' ? targeting : { geo_locations: { countries: ['US'] } };
    // Ad set must use the same special_ad_categories as the campaign (Meta requirement). Also detect campaign-level budget (CBO).
    let specialAdCategories: string[] = [];
    let campaignHasBudget = false;
    let campaignDailyBudgetDollars: number | undefined;
    try {
      const campaign = await facebookAPI.getCampaign(campaignId);
      if (campaign?.special_ad_categories != null) {
        specialAdCategories = Array.isArray(campaign.special_ad_categories)
          ? campaign.special_ad_categories
          : [String(campaign.special_ad_categories)];
      }
      const db = campaign?.daily_budget != null ? String(campaign.daily_budget).trim() : '';
      const lb = campaign?.lifetime_budget != null ? String(campaign.lifetime_budget).trim() : '';
      campaignHasBudget = db !== '' || lb !== '';
      if (campaignHasBudget && db) {
        const cents = parseInt(db, 10);
        if (Number.isFinite(cents)) campaignDailyBudgetDollars = cents / 100;
      }
      /* Campaign-level budget (CBO) forces constraints Meta can't fulfil for new accounts at low budgets.
         Meta does not allow removing CBO via the API once set. The only fix is to delete this campaign and
         create a new one without a campaign-level budget, then set budget per ad set (e.g. $15/day). */
      if (campaignHasBudget) {
        return NextResponse.json({
          success: false,
          error: `This campaign has a campaign-level budget (Campaign Budget Optimization / CBO) of $${campaignDailyBudgetDollars ?? 0}/day. Meta requires CBO campaigns to have at least ~$200 total budget and enforces bid strategy rules that new ad accounts cannot use. Meta does not allow removing CBO via API.\n\nTo fix: delete this campaign and create a new one — leave the Campaign Budget field empty when creating it. Then create your ad sets each with their own $15/day budget. No CBO = no restrictions.`,
        }, { status: 400 });
      }
      /* Campaign bid strategies that require each ad set to send bid_amount. We don't support that here, so block and explain. */
      const campaignBidStrategy = (campaign as { bid_strategy?: string })?.bid_strategy?.toUpperCase?.();
      const BID_STRATEGIES_REQUIRING_BID_AMOUNT = ['LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'TARGET_COST'];
      if (campaignBidStrategy && BID_STRATEGIES_REQUIRING_BID_AMOUNT.includes(campaignBidStrategy)) {
        return NextResponse.json({
          success: false,
          error: 'Bid amount or bid constraints required: This campaign uses a bid strategy (bid cap or target cost) that requires every ad set to set a bid amount. That isn\'t configurable in this flow.\n\nUse a campaign that uses "Lowest cost" without a cap, or create and set the bid in Meta Ads Manager.',
        }, { status: 400 });
      }
    } catch (_) {
      specialAdCategories = ['NONE'];
    }
    if (specialAdCategories.length === 0) {
      specialAdCategories = ['NONE'];
    }

    let adSet;
    try {
      adSet = await facebookAPI.createAdSet({
        name,
        campaign_id: campaignId,
        status: String(status).toUpperCase(),
        targeting: targetingPayload,
        optimization_goal: optimizationGoal || 'LINK_CLICKS',
        billing_event: billingEvent || 'LINK_CLICKS',
        special_ad_categories: specialAdCategories,
        campaign_has_budget: campaignHasBudget,
        campaign_daily_budget_dollars: campaignDailyBudgetDollars,
        ...(campaignHasBudget
          ? {
              start_time: startTime && String(startTime).trim() ? String(startTime).trim() : undefined,
              end_time: endTime && String(endTime).trim() ? String(endTime).trim() : undefined,
            }
          : useLifetimeBudget
            ? {
                lifetime_budget: lifetimeBudgetNum!,
                start_time: startTime && String(startTime).trim() ? String(startTime).trim() : undefined,
                end_time: endTime && String(endTime).trim() ? String(endTime).trim() : undefined,
              }
            : {
                daily_budget: dailyBudget,
                start_time: startTime && String(startTime).trim() ? String(startTime).trim() : undefined,
                end_time: endTime && String(endTime).trim() ? String(endTime).trim() : undefined,
              }
        ),
      });
    } catch (apiError) {
      const err = apiError as Error & { metaCode?: number; metaData?: { error_subcode?: number } };
      let message = err?.message ?? 'Create ad set failed';
      const subcode = err?.metaData?.error_subcode ?? (err?.metaData as any)?.error_subcode;
      if (subcode === 2490487) {
        message = 'Bid amount or bid constraints required: Meta expects a bid cap or ROAS settings for this campaign, which aren\'t supported here.\n\nTry: (1) Use a campaign created here with "Ad set level" budget and no bid cap, or (2) Set optimization goal to "Link clicks" instead of "Conversions", or (3) Create the ad set in Meta Ads Manager and set the bid there.';
      } else if (subcode === 2446404) {
        message = 'Billing option not available: Your ad account is new to Facebook Products. Some billing and bid options are only available after your account has followed Meta\'s policies for several weeks.\n\nCreate this ad set in Meta Ads Manager (ads.facebook.com) for now, or try again later once your account is eligible.';
      }
      console.error('Facebook API createAdSet failed:', apiError);
      const body: { success: false; error: string; metaCode?: number; metaData?: unknown } = {
        success: false,
        error: message,
      };
      if (err.metaCode != null) body.metaCode = err.metaCode;
      if (err.metaData != null) body.metaData = err.metaData;
      return NextResponse.json(body, { status: 400 });
    }

    const statusStr = (adSet as { status?: string }).status ?? status ?? 'PAUSED';
    return NextResponse.json({
      success: true,
      adSet: {
        id: adSet.id,
        name: adSet.name,
        campaignId: adSet.campaign_id,
        status: String(statusStr).toLowerCase(),
        createdAt: adSet.created_time
      }
    });
  } catch (error) {
    console.error('Error creating ad set:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create ad set'
    }, { status: 500 });
  }
} 