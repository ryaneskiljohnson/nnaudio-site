/**
 * @fileoverview Upload ad image to ad account; returns hash for use in ad creative.
 * @module api/facebook-ads/ad-images
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';
import { requireAdminResponse } from "@/utils/auth/require-admin";

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdminResponse();
    if (authError) {
      return authError;
    }

    if (isFacebookAdsMockEnabled()) {
      return NextResponse.json({
        success: true,
        hash: `mock_${Date.now()}`,
        url: '/images/placeholder.jpg'
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);

    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') ?? formData.get('image');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file (field: file or image)' }, { status: 400 });
    }

    const ext = file.name.replace(/^.*\./, '') || 'jpg';
    const filename = `adimage_${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { hash } = await facebookAPI.uploadAdImage(buffer, filename);

    return NextResponse.json({ success: true, hash, filename });
  } catch (error) {
    console.error('Error uploading ad image:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
