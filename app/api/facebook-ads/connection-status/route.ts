import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';

export async function GET(request: NextRequest) {
  try {
    if (isFacebookAdsMockEnabled()) {
      return NextResponse.json({
        connected: true,
        user: {
          id: 'mock_user_123',
          name: 'Development User',
          email: 'dev@example.com'
        },
        message: 'Connected to Facebook Ads (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const adAccountId =
      process.env.FACEBOOK_AD_ACCOUNT_ID ??
      request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ??
      null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        connected: false,
        message: 'No Facebook access token found'
      });
    }

    // Test the connection
    const connectionTest = await facebookAPI.testConnection();
    
    if (connectionTest.success) {
      return NextResponse.json({
        connected: true,
        user: connectionTest.user,
        message: 'Connected to Facebook Ads',
        isDevelopmentMode: false,
        adAccountId: adAccountId ? (String(adAccountId).startsWith('act_') ? adAccountId : `act_${adAccountId}`) : undefined
      });
    } else {
      return NextResponse.json({
        connected: false,
        message: connectionTest.error || 'Failed to connect to Facebook'
      });
    }
  } catch (error) {
    console.error('Error checking Facebook connection:', error);
    return NextResponse.json({
      connected: false,
      message: 'Error checking connection status'
    }, { status: 500 });
  }
} 