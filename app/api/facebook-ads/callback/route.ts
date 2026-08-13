import { NextRequest, NextResponse } from 'next/server';
import { FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { requireAdminResponse } from "@/utils/auth/require-admin";

const COOKIE_NAME = FACEBOOK_TOKEN_COOKIE_NAME;
const COOKIE_MAX_AGE_DAYS = 60;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const REDIRECT_URL = `${BASE_URL}/admin/ad-manager`;

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminResponse();
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error);
      return NextResponse.redirect(`${REDIRECT_URL}?error=oauth_denied`);
    }

    // Verify state parameter for CSRF protection
    if (state !== 'facebook_ads_connect') {
      console.error('Invalid state parameter');
      return NextResponse.redirect(`${REDIRECT_URL}?error=invalid_state`);
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(`${REDIRECT_URL}?error=no_code`);
    }

    // Exchange authorization code for access token
    const accessToken = await exchangeCodeForToken(code);
    
    if (!accessToken) {
      return NextResponse.redirect(`${REDIRECT_URL}?error=token_exchange_failed`);
    }

    // Store the access token in an httpOnly cookie (not localStorage) to prevent XSS theft
    const response = NextResponse.redirect(`${REDIRECT_URL}?connected=true`);
    response.cookies.set(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
    });

    // If no FACEBOOK_AD_ACCOUNT_ID in env, fetch ad accounts and store first one so API routes can work without env
    const adAccountIdFromEnv = process.env.FACEBOOK_AD_ACCOUNT_ID;
    if (!adAccountIdFromEnv) {
      const firstAdAccountId = await fetchFirstAdAccountId(accessToken);
      if (firstAdAccountId) {
        response.cookies.set(FACEBOOK_AD_ACCOUNT_COOKIE_NAME, firstAdAccountId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Error handling Facebook OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/ad-manager?error=callback_failed`);
  }
}

async function exchangeCodeForToken(code: string): Promise<string | null> {
  try {
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/facebook-ads/callback`;

    if (!clientId || !clientSecret) {
      console.error('Facebook App credentials not configured');
      return null;
    }

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const response = await fetch(tokenUrl.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token exchange failed:', errorData);
      return null;
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return null;
    }

    // Optionally, exchange short-lived token for long-lived token
    const longLivedToken = await exchangeForLongLivedToken(tokenData.access_token);
    
    return longLivedToken || tokenData.access_token;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return null;
  }
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<string | null> {
  try {
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    tokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const response = await fetch(tokenUrl.toString());
    
    if (!response.ok) {
      console.warn('Failed to exchange for long-lived token, using short-lived token');
      return null;
    }

    const tokenData = await response.json();
    return tokenData.access_token || null;
  } catch (error) {
    console.warn('Error exchanging for long-lived token:', error);
    return null;
  }
}

/** Fetch first ad account ID for the authenticated user (numeric ID without "act_" prefix). */
async function fetchFirstAdAccountId(accessToken: string): Promise<string | null> {
  try {
    const url = new URL('https://graph.facebook.com/v20.0/me/adaccounts');
    url.searchParams.set('fields', 'id,name');
    url.searchParams.set('access_token', accessToken);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data.data && data.data[0]) as { id?: string } | undefined;
    if (!first?.id) return null;
    // Store numeric part only; API uses act_${id}
    const id = String(first.id).replace(/^act_/, '');
    return id || null;
  } catch (error) {
    console.warn('Failed to fetch ad accounts for cookie:', error);
    return null;
  }
} 