import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    
    // Development mode: simulate campaign deletion
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      // Simulate deletion delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully (Development Mode)',
        campaignId,
        isDevelopmentMode: true
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

    // Delete the campaign
    await facebookAPI.deleteCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
      campaignId
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete campaign'
    }, { status: 500 });
  }
} 