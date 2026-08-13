/**
 * @fileoverview Set the ad account to use (stored in cookie). Env FACEBOOK_AD_ACCOUNT_ID overrides.
 * @module api/facebook-ads/ad-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { requireAdminResponse } from "@/utils/auth/require-admin";

const COOKIE_MAX_AGE_DAYS = 60;

/**
 * POST /api/facebook-ads/ad-account
 * Body: { adAccountId: string } (numeric, e.g. "550575860745857")
 * Sets the ad account cookie so subsequent requests use this account.
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdminResponse();
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const raw = body?.adAccountId ?? body?.ad_account_id;
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing adAccountId' },
        { status: 400 }
      );
    }
    const adAccountId = String(raw).replace(/^act_/, '').trim();
    if (!adAccountId) {
      return NextResponse.json(
        { success: false, error: 'Invalid adAccountId' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true, adAccountId: `act_${adAccountId}` });
    response.cookies.set(FACEBOOK_AD_ACCOUNT_COOKIE_NAME, adAccountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
    });
    return response;
  } catch (error) {
    console.error('Error setting ad account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set ad account' },
      { status: 500 }
    );
  }
}
