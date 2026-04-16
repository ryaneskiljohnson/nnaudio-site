import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    if (isFacebookAdsMockEnabled()) {
      // Simulate resume delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return NextResponse.json({
        success: true,
        message: 'Campaign resumed successfully (Development Mode)',
        campaignId,
        status: 'active',
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
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    // Resume the campaign
    await facebookAPI.resumeCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign resumed successfully',
      campaignId,
      status: 'active'
    });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume campaign'
    }, { status: 500 });
  }
} 