/**
 * @fileoverview Tests for Facebook Ads API: GET list, POST create (mock and validation).
 * @module api/facebook-ads/__tests__/ads.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Routes now require an authenticated admin; simulate an authorized admin.
vi.mock('@/utils/supabase/server', () => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    single: async () => ({ data: { id: 'admin-1' }, error: null }),
    maybeSingle: async () => ({ data: { id: 'admin-1' }, error: null }),
  };
  return {
    createClient: vi.fn(async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'admin-test' } }, error: null }) },
      from: () => builder,
    })),
  };
});

import { GET, POST } from '../ads/route';

const originalEnv = { ...process.env };

describe('GET /api/facebook-ads/ads', () => {
  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and ads list when mock is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/ads');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.ads)).toBe(true);
    expect(data.isDevelopmentMode).toBe(true);
  });
});

describe('POST /api/facebook-ads/ads (create)', () => {
  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and ad when mock is enabled', async () => {
    const body = {
      name: 'Test Ad',
      adSetId: 'adset_1',
      status: 'active',
      creative: { title: 'Headline', body: 'Body', linkUrl: 'https://nnaud.io', callToAction: 'Learn More' },
    };
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/ads', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.ad).toBeDefined();
    expect(data.ad.name).toBe(body.name);
    expect(data.ad.adSetId).toBe(body.adSetId);
    expect(data.isDevelopmentMode).toBe(true);
  });

});
