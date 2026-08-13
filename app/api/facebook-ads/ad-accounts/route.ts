/**
 * @fileoverview List ad accounts the current Facebook token can access.
 * @module api/facebook-ads/ad-accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPITokenOnly, FACEBOOK_TOKEN_COOKIE_NAME } from '@/utils/facebook/api';
import { requireAdminResponse } from "@/utils/auth/require-admin";

/**
 * GET /api/facebook-ads/ad-accounts
 * Returns ad accounts accessible with the current token (for debugging connection).
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminResponse();
    if (authError) {
      return authError;
    }

    const cookieToken = request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value?.trim() ?? null;
    const envToken = process.env.FACEBOOK_SYSTEM_USER_TOKEN?.trim() ?? null;
    const token = cookieToken || envToken;
    const facebookAPI = createFacebookAPITokenOnly(() => token);

    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected. Click Connect to Facebook in Ad Manager.',
        adAccounts: [],
      }, { status: 401 });
    }

    let adAccounts = await facebookAPI.getAdAccounts().catch(() => []);
    if (
      (!Array.isArray(adAccounts) || adAccounts.length === 0) &&
      process.env.FACEBOOK_AD_ACCOUNT_ID
    ) {
      const id = String(process.env.FACEBOOK_AD_ACCOUNT_ID).replace(/^act_/, '').trim();
      if (id) {
        adAccounts = [
          {
            id: `act_${id}`,
            account_id: id,
            name: `Ad Account ${id}`,
            currency: 'USD',
            account_status: 1,
            timezone_name: '',
          } as any,
        ];
      }
    }
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
