import { NextRequest, NextResponse } from 'next/server';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';
import { requireAdminResponse } from "@/utils/auth/require-admin";

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminResponse();
    if (authError) {
      return authError;
    }

    if (isFacebookAdsMockEnabled()) {
      // Simulate successful connection and redirect back to ad manager
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/ad-manager?connected=true&mock=true`);
    }

    // Facebook OAuth configuration
    const clientId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/facebook-ads/callback`;
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Facebook App ID not configured'
      }, { status: 500 });
    }

    // Required permissions for Facebook Marketing API (omit invalid scopes: pages_manage_ads, email)
    const scopes = [
      'ads_management',
      'ads_read',
      'business_management',
      'pages_read_engagement'
    ].join(',');

    // Build Facebook OAuth URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
    facebookAuthUrl.searchParams.set('client_id', clientId);
    facebookAuthUrl.searchParams.set('redirect_uri', redirectUri);
    facebookAuthUrl.searchParams.set('scope', scopes);
    facebookAuthUrl.searchParams.set('response_type', 'code');
    facebookAuthUrl.searchParams.set('state', 'facebook_ads_connect'); // CSRF protection

    // Redirect to Facebook OAuth
    return NextResponse.redirect(facebookAuthUrl.toString());
  } catch (error) {
    console.error('Error initiating Facebook OAuth:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate Facebook connection'
    }, { status: 500 });
  }
} 