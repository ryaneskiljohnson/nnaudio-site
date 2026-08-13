import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';
import { requireAdminResponse } from "@/utils/auth/require-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdminResponse();
    if (authError) {
      return authError;
    }

    const { id: campaignId } = await params;

    if (isFacebookAdsMockEnabled()) {
      // Simulate pause delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return NextResponse.json({
        success: true,
        message: 'Campaign paused successfully (Development Mode)',
        campaignId,
        status: 'paused',
        isDevelopmentMode: true
      });
    }

    const cookieToken = request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value?.trim() ?? null;
    const envToken = process.env.FACEBOOK_SYSTEM_USER_TOKEN?.trim() ?? null;
    const token = cookieToken || envToken;
    const adAccountId =
      request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value?.trim() ??
      process.env.FACEBOOK_AD_ACCOUNT_ID?.trim() ??
      null;
    const facebookAPI = createFacebookAPI(adAccountId, () => token);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    // Pause the campaign
    await facebookAPI.pauseCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign paused successfully',
      campaignId,
      status: 'paused'
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause campaign'
    }, { status: 500 });
  }
} 