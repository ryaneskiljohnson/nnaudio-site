/**
 * @fileoverview Delete a Facebook custom audience by ID.
 * @module api/facebook-ads/audiences/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ success: false, error: 'Audience ID required' }, { status: 400 });
    }

    if (isFacebookAdsMockEnabled()) {
      return NextResponse.json({ success: true, message: 'Deleted (mock)' });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);

    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    await facebookAPI.deleteCustomAudience(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting audience:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete audience' },
      { status: 500 }
    );
  }
}
