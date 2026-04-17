/**
 * @fileoverview Facebook custom audiences: list (GET) and create (POST).
 * @module api/facebook-ads/audiences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import { isFacebookAdsMockEnabled } from '@/utils/facebook/mock-mode';

interface AudienceCreateBody {
  name: string;
  description?: string;
  subtype?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AudienceCreateBody = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Audience name is required' }, { status: 400 });
    }

    if (isFacebookAdsMockEnabled()) {
      const mockAudience = {
        id: `mock_audience_${Date.now()}`,
        name,
        description: body.description || '',
        approximate_count: Math.floor(Math.random() * 100000) + 10000,
        createdAt: new Date().toISOString()
      };
      return NextResponse.json({
        success: true,
        audience: mockAudience,
        message: 'Audience created successfully (mock mode)'
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);

    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    const subtype = body.subtype ?? 'CUSTOM';
    const description = body.description ?? '';
    const audience = await facebookAPI.createCustomAudience(name, description, subtype);

    return NextResponse.json({
      success: true,
      audience: {
        id: audience.id,
        name: audience.name,
        description: audience.description,
        approximate_count: audience.approximate_count
      }
    });
  } catch (error) {
    console.error('Error creating audience:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create audience' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (isFacebookAdsMockEnabled()) {
      const mockAudiences = [
        { id: '1', name: 'Music Producers 25-35', description: 'Producers 25-35', approximate_count: 45000 },
        { id: '2', name: 'Lookalike - Existing Customers', description: 'Lookalike', approximate_count: 2100000 }
      ];
      return NextResponse.json({ success: true, audiences: mockAudiences });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? null;
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);

    if (!facebookAPI) {
      return NextResponse.json({ success: false, error: 'Not connected to Facebook Ads' }, { status: 401 });
    }

    const data = await facebookAPI.getCustomAudiences();
    const audiences = (data || []).map((a: { id?: string; name?: string; description?: string; approximate_count?: number }) => ({
      id: a.id,
      name: a.name ?? '',
      description: a.description ?? '',
      approximate_count: a.approximate_count ?? 0
    }));

    return NextResponse.json({ success: true, audiences });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audiences' },
      { status: 500 }
    );
  }
} 