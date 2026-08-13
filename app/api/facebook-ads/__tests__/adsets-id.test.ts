/**
 * @fileoverview Tests for Facebook Ads ad sets API: create (POST), GET one, PUT update, DELETE.
 * @module api/facebook-ads/__tests__/adsets-id.test
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

import { GET as GET_LIST, POST } from '../adsets/route';
import { GET, PUT, DELETE } from '../adsets/[id]/route';

describe('GET /api/facebook-ads/adsets (list)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and adSets array with id, name, budget for dropdown', async () => {
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/adsets?campaignId=1');
    const response = await GET_LIST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.adSets)).toBe(true);
    data.adSets.forEach((adSet: { id: string; name: string; budget: number }) => {
      expect(adSet).toHaveProperty('id');
      expect(adSet).toHaveProperty('name');
      expect(typeof adSet.budget === 'number' || typeof adSet.budget === 'undefined').toBe(true);
    });
  });
});

describe('POST /api/facebook-ads/adsets (create)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and ad set when mock is enabled', async () => {
    const body = {
      name: 'Test Ad Set',
      campaignId: '1',
      status: 'PAUSED',
      dailyBudget: 20,
      targeting: { geo_locations: { countries: ['US'] } },
      optimizationGoal: 'LINK_CLICKS',
      billingEvent: 'IMPRESSIONS',
    };
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/adsets', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.adSet).toBeDefined();
    expect(data.adSet.name).toBe(body.name);
    expect(data.adSet.campaignId).toBe(body.campaignId);
    expect(data.isDevelopmentMode).toBe(true);
  });
});

describe('GET /api/facebook-ads/adsets/[id]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and ad set when mock is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/adsets/adset_1');
    const response = await GET(request, { params: Promise.resolve({ id: 'adset_1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.adSet).toBeDefined();
    expect(data.adSet.id).toBe('adset_1');
    expect(data.adSet.name).toBeDefined();
    expect(data.adSet.campaignId).toBeDefined();
    expect(data.isDevelopmentMode).toBe(true);
  });
});

describe('PUT /api/facebook-ads/adsets/[id]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and updated ad set when mock is enabled', async () => {
    const body = {
      name: 'Updated Ad Set Name',
      status: 'PAUSED',
      dailyBudget: 25,
      optimizationGoal: 'IMPRESSIONS',
      billingEvent: 'IMPRESSIONS',
    };
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/adsets/adset_1', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'adset_1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.adSet).toBeDefined();
    expect(data.adSet.name).toBe(body.name);
    expect(data.adSet.status).toBe('paused');
    expect(data.isDevelopmentMode).toBe(true);
  });
});

describe('DELETE /api/facebook-ads/adsets/[id]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 when mock is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/adsets/adset_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'adset_1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.isDevelopmentMode).toBe(true);
  });
});
