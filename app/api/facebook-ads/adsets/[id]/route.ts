/**
 * @fileoverview API route: GET/PUT/DELETE a single ad set by ID.
 * @module api/facebook-ads/adsets/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME, type UpdateAdSetParams } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';
import { applyDailyBudgetGuardrails, getGrowthGuardrailsFromEnv } from '@/utils/growth/guardrails';

/** Optimization goals that require bid constraints (Meta error 2490487). We do not support them in the UI. */
const OPTIMIZATION_GOALS_REQUIRING_BID_CONSTRAINTS = ['VALUE', 'LOWEST_COST_WITH_MIN_ROAS'] as const;

/** Demo ad set payload when `isFacebookAdsMockEnabled()` (non-production only). */
function mockAdSet(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: 'Desktop Users 25-45',
    campaignId: '1',
    campaign_id: '1',
    status: 'active',
    daily_budget: '50000',
    budget: 500,
    spent: 123.45,
    impressions: 6225,
    clicks: 156,
    conversions: 12,
    ctr: 2.51,
    targeting: { ageMin: 25, ageMax: 45, locations: ['United States'] },
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    createdAt: '2024-01-20',
    created_time: '2024-01-20T10:00:00Z',
    updated_time: '2024-01-20T10:00:00Z',
    ...overrides,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adSetId } = await context.params;
    if (!adSetId) {
      return NextResponse.json({ success: false, error: 'Ad set ID required' }, { status: 400 });
    }

    if (isFacebookAdsMockEnabled()) {
      const adSet = mockAdSet(adSetId, { name: `Ad Set ${adSetId}` });
      return NextResponse.json({ success: true, adSet, isDevelopmentMode: true });
    }

    const adAccountId =
      process.env.FACEBOOK_AD_ACCOUNT_ID ??
      _request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ??
      null;
    const getToken = () => _request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    const adSet = await facebookAPI.getAdSet(adSetId);
    if (!adSet) {
      return NextResponse.json({ success: false, error: 'Ad set not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      adSet: {
        ...adSet,
        campaignId: adSet.campaign_id,
        budget: adSet.daily_budget ? parseInt(adSet.daily_budget, 10) / 100 : adSet.lifetime_budget ? parseInt(adSet.lifetime_budget, 10) / 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching ad set:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch ad set' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adSetId } = await context.params;
    if (!adSetId) {
      return NextResponse.json({ success: false, error: 'Ad set ID required' }, { status: 400 });
    }

    if (isFacebookAdsMockEnabled()) {
      const body = await request.json();
      const adSet = mockAdSet(adSetId, {
        name: body.name ?? 'Updated Ad Set',
        status: (body.status ?? 'PAUSED').toLowerCase(),
        daily_budget: body.dailyBudget != null ? String(body.dailyBudget * 100) : '50000',
        budget: body.dailyBudget ?? 500,
      });
      return NextResponse.json({ success: true, adSet, isDevelopmentMode: true });
    }

    const adAccountId =
      process.env.FACEBOOK_AD_ACCOUNT_ID ??
      request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ??
      null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    const body = await request.json();
    const params: UpdateAdSetParams = {};
    if (body.name != null) params.name = body.name;
    if (body.status != null) params.status = body.status.toUpperCase();
    let dailyBudgetGuardrail:
      | ReturnType<typeof applyDailyBudgetGuardrails>
      | null = null;
    if (body.dailyBudget != null) {
      const existingAdSet = await facebookAPI.getAdSet(adSetId);
      const previousDailyBudgetUsd =
        existingAdSet?.daily_budget != null
          ? parseInt(String(existingAdSet.daily_budget), 10) / 100
          : null;
      const guardrails = getGrowthGuardrailsFromEnv();
      dailyBudgetGuardrail = applyDailyBudgetGuardrails(
        Number(body.dailyBudget),
        guardrails,
        {
          mode: 'update',
          previousDailyBudgetUsd,
        }
      );
      params.daily_budget = dailyBudgetGuardrail.appliedUsd;
    }
    if (body.lifetimeBudget != null) params.lifetime_budget = body.lifetimeBudget;
    if (body.startTime != null) params.start_time = body.startTime;
    if (body.noEndDate === true) params.end_time = '0';
    else if (body.endTime != null) params.end_time = body.endTime;
    if (body.targeting != null) params.targeting = body.targeting;
    if (body.optimizationGoal != null) {
      const goal = String(body.optimizationGoal).trim().toUpperCase();
      if ((OPTIMIZATION_GOALS_REQUIRING_BID_CONSTRAINTS as readonly string[]).includes(goal)) {
        return NextResponse.json({
          success: false,
          error: 'Bid amount or bid constraints required: The optimization goal (VALUE/ROAS) requires a minimum ROAS or bid cap, which is not configurable here. Choose "Link clicks", "Conversions", or another goal from the list, or set ROAS in Meta Ads Manager.',
        }, { status: 400 });
      }
      params.optimization_goal = body.optimizationGoal;
    }
    if (body.billingEvent != null) params.billing_event = body.billingEvent;

    const adSet = await facebookAPI.updateAdSet(adSetId, params);
    return NextResponse.json({
      success: true,
      adSet: {
        id: adSet.id,
        name: adSet.name,
        campaignId: adSet.campaign_id,
        status: (adSet.status ?? '').toLowerCase(),
        createdAt: adSet.created_time,
      },
      guardrailAdjustments:
        dailyBudgetGuardrail != null
          ? {
              changed: dailyBudgetGuardrail.changed,
              dailyBudget: dailyBudgetGuardrail,
            }
          : null,
    });
  } catch (error) {
    console.error('Error updating ad set:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update ad set' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adSetId } = await context.params;
    if (!adSetId) {
      return NextResponse.json({ success: false, error: 'Ad set ID required' }, { status: 400 });
    }

    if (isFacebookAdsMockEnabled()) {
      return NextResponse.json({ success: true, message: 'Ad set deleted (Development Mode)', isDevelopmentMode: true });
    }

    const adAccountId =
      process.env.FACEBOOK_AD_ACCOUNT_ID ??
      _request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ??
      null;
    const getToken = () => _request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    await facebookAPI.deleteAdSet(adSetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ad set:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete ad set' }, { status: 500 });
  }
}
