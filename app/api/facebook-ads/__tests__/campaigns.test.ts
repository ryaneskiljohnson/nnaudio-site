/**
 * @fileoverview Tests for Facebook Ads campaigns API (POST create campaign).
 * @module api/facebook-ads/__tests__/campaigns.test
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

import { POST } from '../campaigns/route';

describe('POST /api/facebook-ads/campaigns', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string; FACEBOOK_MOCK_CONNECTION?: string };
    env.NODE_ENV = 'development';
    env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('returns 200 and campaign when mock is enabled with valid body', async () => {
    const body = {
      name: 'Test Campaign',
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      dailyBudget: 50,
    };
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/campaigns', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.campaign).toBeDefined();
    expect(data.campaign.name).toBe(body.name);
    expect(data.campaign.objective).toBe(body.objective);
    expect(data.isDevelopmentMode).toBe(true);
  });

  it('returns 401 when not mock and no token', async () => {
    process.env.FACEBOOK_MOCK_CONNECTION = 'false';
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: 'Only Name' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/not connected|facebook/i);
  });
});
