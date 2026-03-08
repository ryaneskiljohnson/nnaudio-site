/**
 * @fileoverview Account-level stats for Ad Manager dashboard (campaign counts + insights).
 * @module api/facebook-ads/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';

function parseNum(s: string | undefined): number {
  if (s == null || s === '') return 0;
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  try {
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';

    if (mockConnection) {
      const mockStats = {
        totalCampaigns: 8,
        activeCampaigns: 3,
        totalSpent: 2847.92,
        totalImpressions: 145823,
        totalClicks: 3456,
        totalConversions: 89,
        averageCTR: 2.37,
        averageCPC: 0.82,
        averageCPM: 19.52,
        conversionRate: 2.57,
        returnOnAdSpend: 4.23,
        isDevelopmentMode: true
      };
      return NextResponse.json({ success: true, stats: mockStats });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);

    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    let totalCampaigns = 0;
    let activeCampaigns = 0;
    let totalSpent = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let averageCTR = 0;
    let averageCPC = 0;
    let averageCPM = 0;

    try {
      const campaigns = await facebookAPI.getCampaigns();
      totalCampaigns = campaigns.length;
      activeCampaigns = campaigns.filter((c: { status?: string }) => String(c.status || '').toUpperCase() === 'ACTIVE').length;
    } catch (e) {
      console.warn('Stats: getCampaigns failed', e);
    }

    const until = new Date();
    const since = new Date(until);
    since.setDate(since.getDate() - 30);
    const dateRange = {
      since: since.toISOString().split('T')[0],
      until: until.toISOString().split('T')[0]
    };

    try {
      const insights = await facebookAPI.getAccountInsights(dateRange);
      totalSpent = parseNum(insights.spend);
      totalImpressions = parseNum(insights.impressions);
      totalClicks = parseNum(insights.clicks);
      totalConversions = parseNum(insights.conversions);
      averageCTR = parseNum(insights.ctr);
      averageCPC = parseNum(insights.cpc);
      averageCPM = parseNum(insights.cpm);
    } catch (e) {
      console.warn('Stats: getAccountInsights failed', e);
    }

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const returnOnAdSpend = totalSpent > 0 && totalConversions > 0 ? (totalConversions / totalSpent) : 0;

    const stats = {
      totalCampaigns,
      activeCampaigns,
      totalSpent,
      totalImpressions,
      totalClicks,
      totalConversions,
      averageCTR,
      averageCPC,
      averageCPM,
      conversionRate,
      returnOnAdSpend
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching ad stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ad statistics'
    }, { status: 500 });
  }
} 