import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, CAMPAIGN_OBJECTIVES, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';
import { applyDailyBudgetGuardrails, getGrowthGuardrailsFromEnv } from '@/utils/growth/guardrails';
import { createClient } from '@/utils/supabase/server';

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

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) {
      return authError;
    }

    if (isFacebookAdsMockEnabled()) {
      const mockCampaigns = [
        {
          id: "1",
          name: "Cymasphere Launch Campaign",
          status: "active",
          objective: "TRAFFIC",
          platform: "facebook",
          budget: 1000,
          spent: 245.50,
          impressions: 12450,
          clicks: 312,
          conversions: 24,
          createdAt: "2024-01-20",
          ctr: 2.51,
          cpc: 0.78,
          cpm: 19.72,
          adSets: 2,
          ads: 4
        },
        {
          id: "2", 
          name: "Instagram Promotion",
          status: "paused",
          objective: "ENGAGEMENT",
          platform: "instagram",
          budget: 500,
          spent: 89.25,
          impressions: 5680,
          clicks: 156,
          conversions: 8,
          createdAt: "2024-01-18",
          ctr: 2.75,
          cpc: 0.57,
          cpm: 15.71,
          adSets: 1,
          ads: 2
        },
        {
          id: "3",
          name: "Brand Awareness Drive",
          status: "active",
          objective: "BRAND_AWARENESS",
          platform: "facebook",
          budget: 750,
          spent: 156.80,
          impressions: 8900,
          clicks: 198,
          conversions: 12,
          createdAt: "2024-01-15",
          ctr: 2.22,
          cpc: 0.79,
          cpm: 17.62,
          adSets: 1,
          ads: 3
        }
      ];

      return NextResponse.json({
        success: true,
        campaigns: mockCampaigns,
        isDevelopmentMode: true
      });
    }

    const { token, adAccountId } = resolveFacebookContext(request);
    const facebookAPI = createFacebookAPI(adAccountId, () => token);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const campaigns = await facebookAPI.getCampaigns();
    
    // Transform Facebook campaigns to our format (mirrors Meta: objective, buying_type, special_ad_categories)
    const transformedCampaigns = campaigns.map(campaign => {
      const raw = campaign.special_ad_categories;
      const specialAdCategories: string[] = Array.isArray(raw)
        ? raw
        : typeof raw === 'string' ? (raw ? [raw] : []) : [];
      return {
        id: campaign.id,
        name: campaign.name,
        status: (campaign.status ?? '').toString().toLowerCase(),
        objective: campaign.objective,
        buying_type: (campaign as { buying_type?: string }).buying_type ?? 'AUCTION',
        special_ad_categories: specialAdCategories,
        platform: 'facebook',
        budget: campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        createdAt: campaign.created_time,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        adSets: 0,
        ads: 0
      };
    });

    return NextResponse.json({
      success: true,
      campaigns: transformedCampaigns
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch campaigns'
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
      
      // Simulate campaign creation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCampaign = {
        id: `mock_${Date.now()}`,
        name: body.name,
        status: body.status?.toLowerCase() || 'paused',
        objective: body.objective,
        platform: body.platforms?.facebook ? 'facebook' : 'instagram',
        budget: body.dailyBudget || body.lifetimeBudget || 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        createdAt: new Date().toISOString(),
        ctr: 0,
        cpc: 0,
        cpm: 0,
        adSets: 0,
        ads: 0
      };

      return NextResponse.json({
        success: true,
        campaign: mockCampaign,
        message: 'Campaign created successfully (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const { token, adAccountId } = resolveFacebookContext(request);
    const facebookAPI = createFacebookAPI(adAccountId, () => token);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name, objective, status, dailyBudget, lifetimeBudget, startTime, endTime, description, platforms, special_ad_categories, buying_type: buyingType } = body;
    const guardrails = getGrowthGuardrailsFromEnv();

    // Validate required fields
    if (!name || !objective || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, objective, status'
      }, { status: 400 });
    }

    // Validate objective
    if (!Object.keys(CAMPAIGN_OBJECTIVES).includes(objective)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid campaign objective'
      }, { status: 400 });
    }

    const specialCategories = Array.isArray(special_ad_categories)
      ? special_ad_categories.filter((s: string) => s && s !== 'NONE')
      : [];

    const dailyBudgetNum = typeof dailyBudget === 'number'
      ? dailyBudget
      : typeof dailyBudget === 'string'
        ? parseFloat(dailyBudget)
        : NaN;
    const launchDailyBudget = applyDailyBudgetGuardrails(
      Number.isFinite(dailyBudgetNum) && dailyBudgetNum > 0
        ? dailyBudgetNum
        : guardrails.launchDailyBudgetUsd,
      guardrails,
      { mode: 'launch' }
    );
    const lifetimeBudgetNum = typeof lifetimeBudget === 'number'
      ? lifetimeBudget
      : typeof lifetimeBudget === 'string'
        ? parseFloat(lifetimeBudget)
        : NaN;
    const maxLaunchLifetimeBudget = guardrails.launchDailyBudgetUsd * 30;
    const safeLifetimeBudget = Number.isFinite(lifetimeBudgetNum) && lifetimeBudgetNum > 0
      ? Math.min(lifetimeBudgetNum, maxLaunchLifetimeBudget)
      : undefined;
    const lifetimeBudgetGuardrailChanged =
      safeLifetimeBudget != null &&
      Number.isFinite(lifetimeBudgetNum) &&
      lifetimeBudgetNum > safeLifetimeBudget;
    const lifetimeBudgetGuardrailReason = lifetimeBudgetGuardrailChanged
      ? `Launch mode caps lifetime budget at ${maxLaunchLifetimeBudget} USD (30 days at launch daily budget).`
      : null;

    const campaign = await facebookAPI.createCampaign({
      name,
      objective,
      status: status.toUpperCase(),
      special_ad_categories: specialCategories,
      buying_type: buyingType == null ? undefined : String(buyingType),
      ...(dailyBudget != null ? { daily_budget: launchDailyBudget.appliedUsd } : {}),
      ...(safeLifetimeBudget != null ? { lifetime_budget: safeLifetimeBudget } : {}),
      ...(startTime != null ? { start_time: startTime } : {}),
      ...(endTime != null ? { end_time: endTime } : {}),
    });

    try {
      const { createSupabaseServiceRole } = await import('@/utils/supabase/service');
      const supabase = await createSupabaseServiceRole();
      await (supabase as any).from('facebook_campaign_metadata').upsert({
        campaign_id: campaign.id,
        description: description ?? null,
        platforms: platforms ?? { facebook: true, instagram: true },
        start_date: startTime || null,
        end_date: endTime || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'campaign_id' });
    } catch (_) {
      // Table may not exist yet (run migration 20260308000000_facebook_campaign_metadata)
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: (campaign.status ?? status ?? 'PAUSED').toString().toLowerCase(),
        objective: campaign.objective,
        createdAt: campaign.created_time
      },
      guardrailAdjustments: {
        changed: launchDailyBudget.changed || lifetimeBudgetGuardrailChanged,
        dailyBudget: launchDailyBudget,
        lifetimeBudget:
          safeLifetimeBudget != null
            ? {
                requestedUsd: Number.isFinite(lifetimeBudgetNum) ? lifetimeBudgetNum : null,
                appliedUsd: safeLifetimeBudget,
                changed: lifetimeBudgetGuardrailChanged,
                reasons: lifetimeBudgetGuardrailReason ? [lifetimeBudgetGuardrailReason] : [],
              }
            : null,
      },
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create campaign'
    }, { status: 500 });
  }
} 