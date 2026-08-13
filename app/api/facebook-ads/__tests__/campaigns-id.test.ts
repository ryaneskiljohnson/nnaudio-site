/**
 * @fileoverview Tests for Facebook Ads campaign by ID API (GET edit, PUT update).
 * @module api/facebook-ads/__tests__/campaigns-id.test
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

import { GET, PUT } from '../campaigns/[id]/route';

describe('GET /api/facebook-ads/campaigns/[id]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and campaign with special_ad_categories when mock is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/campaigns/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.campaign).toBeDefined();
    expect(data.campaign.id).toBe('1');
    expect(data.campaign.name).toBe('Cymasphere Launch Campaign');
    expect(data.campaign.objective).toBe('TRAFFIC');
    expect(data.campaign.platforms).toEqual({ facebook: true, instagram: false });
    expect(data.campaign.budget).toEqual({ type: 'daily', amount: 1000 });
    expect(Array.isArray(data.campaign.special_ad_categories)).toBe(true);
    expect(data.isDevelopmentMode).toBe(true);
  });

  it('returns 404 for unknown campaign id when mock is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/campaigns/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Campaign not found');
  });
});

describe('PUT /api/facebook-ads/campaigns/[id]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 when mock is enabled with valid body', async () => {
    const body = {
      name: 'Updated Name',
      objective: 'OUTCOME_TRAFFIC',
      status: 'paused',
      budget: { type: 'daily' as const, amount: 50 },
      special_ad_categories: [] as string[],
    };
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/campaigns/1', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.campaign).toBeDefined();
    expect(data.isDevelopmentMode).toBe(true);
  });
});
