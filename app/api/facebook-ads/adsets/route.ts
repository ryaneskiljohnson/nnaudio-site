/**
 * @fileoverview Facebook Ads ad-sets API route. Supports listing and creating ad sets with auth checks, guardrails, and Meta-specific compatibility handling.
 * @module app/api/facebook-ads/adsets/route
 */
import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';
import { applyDailyBudgetGuardrails, getGrowthGuardrailsFromEnv } from '@/utils/growth/guardrails';
import { createClient } from '@/utils/supabase/server';

/** Optimization goals that require bid constraints (e.g. roas_average_floor) or bid_amount. Meta returns error 2490487 if sent without them. We do not support these in the UI. */
const OPTIMIZATION_GOALS_REQUIRING_BID_CONSTRAINTS = ['VALUE', 'LOWEST_COST_WITH_MIN_ROAS'] as const;

/**
 * When `isFacebookAdsMockEnabled()`, GET/POST return demo ad sets (local/tests only; never in production).
 */
const devFallbackAdSets: Array<{ id: string; name: string; campaignId: string; status: string; budget: number }> = [];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { data: adminCheck } = await supabase
    .from('admins')
    .select('id')
    .eq('user', user.id)
    .single();
  if (!adminCheck) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

function resolveFacebookContext(request: NextRequest) {
  const cookieToken = request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value?.trim() ?? null;
  const envToken = process.env.FACEBOOK_SYSTEM_USER_TOKEN?.trim() ?? null;
  const token = cookieToken || envToken;
  const adAccountId =
    request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value?.trim() ??
    process.env.FACEBOOK_AD_ACCOUNT_ID?.trim() ??
    null;
  return { token, adAccountId };
}

/**
 * @brief Normalizes a Meta identifier for resilient comparisons.
 * @param id Raw Meta identifier (e.g., "act_123", "123", or undefined).
 * @returns A trimmed ID with `act_` prefix removed when present.
 * @note Some API surfaces return account/campaign IDs with prefixes while others return plain numeric strings.
 */
function normalizeMetaId(id?: string | null): string {
  return String(id ?? '').trim().replace(/^act_/i, '');
}

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
    const authError = await requireAdmin();
    if (authError) {
      return authError;
    }

    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    
    if (isFacebookAdsMockEnabled()) {
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

    const { token, adAccountId } = resolveFacebookContext(request);
    if (!token?.trim() || !adAccountId?.trim()) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads. Connect in Ad Manager → Settings.' }, { status: 401 });
    }
    const facebookAPI = createFacebookAPI(adAccountId, () => token);
    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    let rawAdSets: Array<{ id: string; name?: string; campaign_id?: string; daily_budget?: string; lifetime_budget?: string; status?: string }>;
    try {
      // Always fetch from account scope and filter locally. Meta's campaign edge can
      // intermittently omit paused/new ad sets, which breaks create-ad selection.
      const data = await facebookAPI.getAdSets();
      rawAdSets = Array.isArray(data) ? data : [];
    } catch (apiError) {
      console.error('Facebook API getAdSets failed:', apiError);
      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'Failed to fetch ad sets'
      }, { status: 502 });
    }

    let adSets = Array.isArray(rawAdSets) ? rawAdSets.map(normalizeAdSet) : [];
    if (campaignId) {
      const campaignIdNorm = normalizeMetaId(campaignId);
      adSets = adSets.filter((adSet) => normalizeMetaId(adSet.campaignId) === campaignIdNorm);
    }
    if (process.env.NODE_ENV === 'development' && devFallbackAdSets.length > 0) {
      const forCampaign = campaignId
        ? devFallbackAdSets.filter((a) => a.campaignId === campaignId)
        : devFallbackAdSets;
      const fallbackNormalized = forCampaign.map((a) => ({
        id: a.id,
        name: a.name,
        campaignId: a.campaignId,
        budget: a.budget,
        status: a.status,
      }));
      adSets = [...adSets, ...fallbackNormalized];
    }
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
    const authError = await requireAdmin();
    if (authError) {
      return authError;
    }

    if (isFacebookAdsMockEnabled()) {
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
    const guardrails = getGrowthGuardrailsFromEnv();
    const dailyBudgetGuardrail = applyDailyBudgetGuardrails(
      Number.isFinite(dailyBudgetNum) && dailyBudgetNum > 0
        ? dailyBudgetNum
        : guardrails.launchDailyBudgetUsd,
      guardrails,
      { mode: 'launch' }
    );
    const dailyBudget = dailyBudgetGuardrail.appliedUsd;
    const lifetimeBudgetNum = typeof rawLifetimeBudget === 'number' && rawLifetimeBudget > 0
      ? rawLifetimeBudget
      : typeof rawLifetimeBudget === 'string' ? parseFloat(rawLifetimeBudget) : NaN;
    const useLifetimeBudget = Number.isFinite(lifetimeBudgetNum) && lifetimeBudgetNum > 0;

    const { token, adAccountId } = resolveFacebookContext(request);
    if (!token?.trim()) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads. Connect your account in Ad Manager → Settings.' }, { status: 401 });
    }
    if (!adAccountId?.trim()) {
      return NextResponse.json({ success: false, error: 'No ad account selected. Connect Facebook in Ad Manager → Settings and ensure an ad account is available.' }, { status: 401 });
    }
    const facebookAPI = createFacebookAPI(adAccountId, () => token);
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
    } catch (_) {
      specialAdCategories = ['NONE'];
    }
    if (specialAdCategories.length === 0) {
      specialAdCategories = ['NONE'];
    }

    const baseAdSetPayload = {
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
    };

    let adSet;
    let createdWithBidFallback = false;
    try {
      adSet = await facebookAPI.createAdSet(baseAdSetPayload);
    } catch (apiError) {
      const firstErr = apiError as Error & { metaCode?: number; metaData?: { error_subcode?: number } };
      const firstSubcode = firstErr?.metaData?.error_subcode ?? (firstErr?.metaData as any)?.error_subcode;

      if (firstSubcode === 2490487) {
        try {
          // Some Meta campaigns demand explicit bid constraints; retry once with a conservative bid cap.
          adSet = await facebookAPI.createAdSet({
            ...baseAdSetPayload,
            bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
            bid_amount: 100,
          });
          createdWithBidFallback = true;
        } catch (retryError) {
          apiError = retryError;
        }
      }

      if (adSet != null) {
        const statusStr = (adSet as { status?: string }).status ?? status ?? 'PAUSED';
        return NextResponse.json({
          success: true,
          adSet: {
            id: adSet.id,
            name: adSet.name,
            campaignId: adSet.campaign_id,
            status: String(statusStr).toLowerCase(),
            createdAt: adSet.created_time
          },
          guardrailAdjustments: {
            changed: dailyBudgetGuardrail.changed,
            dailyBudget: dailyBudgetGuardrail,
          },
          fallbackApplied: createdWithBidFallback
            ? { bid_strategy: 'LOWEST_COST_WITH_BID_CAP', bid_amount: 100 }
            : undefined,
        });
      }

      const err = apiError as Error & { metaCode?: number; metaData?: { error_subcode?: number } };
      let message = err?.message ?? 'Create ad set failed';
      const subcode = err?.metaData?.error_subcode ?? (err?.metaData as any)?.error_subcode;
      if (subcode === 2490487) {
        message = 'Bid amount or bid constraints required: Meta rejected this ad set even after an automatic bid-cap retry.\n\nTry one of these in the form: (1) Optimization goal = Link clicks, Billing event = Link clicks, (2) Use a different campaign objective, or (3) Create once in Meta Ads Manager, then manage here.';
      } else if (subcode === 2446404) {
        message = 'Billing option not available: Your ad account is new to Facebook Products. Some billing and bid options are only available after your account has followed Meta\'s policies for several weeks.\n\nCreate this ad set in Meta Ads Manager (ads.facebook.com) for now, or try again later once your account is eligible.';
      }
      console.error('Facebook API createAdSet failed:', apiError);

      if (process.env.NODE_ENV === 'development') {
        const fallbackId = `dev_fallback_${campaignId}_${Date.now()}`;
        const fallback = {
          id: fallbackId,
          name,
          campaignId,
          status: String(status).toLowerCase(),
          budget: dailyBudget,
        };
        devFallbackAdSets.push(fallback);
        return NextResponse.json({
          success: true,
          adSet: { id: fallback.id, name: fallback.name, campaignId: fallback.campaignId, status: fallback.status, createdAt: new Date().toISOString() },
          isDevelopmentFallback: true,
        });
      }

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
      },
      guardrailAdjustments: {
        changed: dailyBudgetGuardrail.changed,
        dailyBudget: dailyBudgetGuardrail,
      },
    });
  } catch (error) {
    console.error('Error creating ad set:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create ad set'
    }, { status: 500 });
  }
} 