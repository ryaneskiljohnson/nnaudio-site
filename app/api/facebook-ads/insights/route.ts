/**
 * @fileoverview Account-level insights for analytics page (date-range support).
 * @module api/facebook-ads/insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';

function parseNum(s: string | undefined): number {
  if (s == null || s === '') return 0;
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : 0;
}

function dateRangeFromPreset(preset: string): { since: string; until: string } {
  const until = new Date();
  const since = new Date(until);
  switch (preset) {
    case 'last_7_days':
      since.setDate(since.getDate() - 7);
      break;
    case 'last_90_days':
      since.setDate(since.getDate() - 90);
      break;
    case 'last_30_days':
    default:
      since.setDate(since.getDate() - 30);
      break;
  }
  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0]
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const datePreset = url.searchParams.get('datePreset') || 'last_30_days';

    if (isFacebookAdsMockEnabled()) {
      const mockOverview = {
        totalSpent: 2847.92,
        totalImpressions: 145823,
        totalClicks: 3456,
        totalConversions: 89,
        averageCTR: 2.37,
        averageCPC: 0.82,
        averageCPM: 19.52,
        roas: 4.23
      };
      return NextResponse.json({
        success: true,
        overview: mockOverview,
        trends: { spentTrend: 'neutral', impressionsTrend: 'neutral', clicksTrend: 'neutral', conversionsTrend: 'neutral' },
        platformBreakdown: { facebook: mockOverview, instagram: mockOverview },
        campaigns: []
      });
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

    const dateRange = dateRangeFromPreset(datePreset);
    const insights = await facebookAPI.getAccountInsights(dateRange);

    const totalSpent = parseNum(insights.spend);
    const totalImpressions = parseNum(insights.impressions);
    const totalClicks = parseNum(insights.clicks);
    const totalConversions = parseNum(insights.conversions);
    const averageCTR = parseNum(insights.ctr);
    const averageCPC = parseNum(insights.cpc);
    const averageCPM = parseNum(insights.cpm);
    const roas = totalSpent > 0 && totalConversions > 0 ? totalConversions / totalSpent : 0;

    const overview = {
      totalSpent,
      totalImpressions,
      totalClicks,
      totalConversions,
      averageCTR,
      averageCPC,
      averageCPM,
      roas
    };

    const fb = { spent: totalSpent / 2, impressions: totalImpressions / 2, clicks: totalClicks / 2, conversions: totalConversions / 2 };
    const ig = { spent: totalSpent / 2, impressions: totalImpressions / 2, clicks: totalClicks / 2, conversions: totalConversions / 2 };
    return NextResponse.json({
      success: true,
      overview,
      trends: { spentTrend: 'neutral' as const, impressionsTrend: 'neutral' as const, clicksTrend: 'neutral' as const, conversionsTrend: 'neutral' as const },
      platformBreakdown: { facebook: fb, instagram: ig },
      campaigns: []
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
