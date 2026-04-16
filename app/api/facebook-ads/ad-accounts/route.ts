/**
 * @fileoverview List ad accounts the current Facebook token can access.
 * @module api/facebook-ads/ad-accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPITokenOnly, FACEBOOK_TOKEN_COOKIE_NAME } from '@/utils/facebook/api';

/**
 * GET /api/facebook-ads/ad-accounts
 * Returns ad accounts accessible with the current token (for debugging connection).
 */
export async function GET(request: NextRequest) {
  try {
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPITokenOnly(getToken);

    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected. Click Connect to Facebook in Ad Manager.',
        adAccounts: [],
      }, { status: 401 });
    }

    const adAccounts = await facebookAPI.getAdAccounts();
    return NextResponse.json({
      success: true,
      adAccounts: adAccounts.map((a) => ({
        id: a.id,
        account_id: a.account_id,
        name: a.name,
        currency: a.currency,
        account_status: a.account_status,
      })),
    });
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ad accounts',
      adAccounts: [],
    }, { status: 500 });
  }
}
