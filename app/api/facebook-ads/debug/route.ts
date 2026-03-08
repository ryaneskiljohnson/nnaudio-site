/**
 * @fileoverview Debug endpoint to verify token and ad account access (GET only).
 * @module api/facebook-ads/debug
 *
 * GET /api/facebook-ads/debug
 * Returns: token present, /me result, /act_XXX result so you can see if the token
 * can read the ad account (if it can't read, it can't create).
 */

import { NextRequest, NextResponse } from 'next/server';
import { FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';

const FACEBOOK_BASE = 'https://graph.facebook.com/v20.0';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value?.trim();
    const adAccountIdRaw =
      process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const adAccountId = adAccountIdRaw ? String(adAccountIdRaw).replace(/^act_/, '') : null;
    const actId = adAccountId ? `act_${adAccountId}` : null;

    const out: {
      tokenPresent: boolean;
      adAccountIdUsed: string | null;
      me: { success: boolean; data?: unknown; error?: string } | null;
      adAccount: { success: boolean; data?: unknown; error?: string } | null;
    } = {
      tokenPresent: !!token,
      adAccountIdUsed: actId,
      me: null,
      adAccount: null,
    };

    if (!token) {
      return NextResponse.json(out);
    }

    const meRes = await fetch(`${FACEBOOK_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
    const meJson = await meRes.json();
    if (meJson.error) {
      out.me = { success: false, error: meJson.error.message || JSON.stringify(meJson.error) };
    } else {
      out.me = { success: true, data: meJson };
    }

    if (actId) {
      const accRes = await fetch(
        `${FACEBOOK_BASE}/${actId}?fields=name,account_status&access_token=${encodeURIComponent(token)}`
      );
      const accJson = await accRes.json();
      if (accJson.error) {
        out.adAccount = { success: false, error: accJson.error.message || JSON.stringify(accJson.error) };
      } else {
        out.adAccount = { success: true, data: accJson };
      }
    }

    return NextResponse.json(out);
  } catch (error) {
    console.error('Facebook ads debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
}
