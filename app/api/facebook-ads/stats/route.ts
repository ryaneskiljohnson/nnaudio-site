import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';

export async function GET(request: NextRequest) {
  try {
    // Development mode: always return mock data if Facebook app is not ready
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
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

      return NextResponse.json({
        success: true,
        stats: mockStats
      });
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

    // In a real implementation, this would fetch actual insights from Facebook
    // For now, we'll return mock data that matches the structure
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
      returnOnAdSpend: 4.23
    };

    return NextResponse.json({
      success: true,
      stats: mockStats
    });
  } catch (error) {
    console.error('Error fetching ad stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ad statistics'
    }, { status: 500 });
  }
} 