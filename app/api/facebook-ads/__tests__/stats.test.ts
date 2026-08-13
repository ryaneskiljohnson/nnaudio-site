/**
 * @fileoverview Tests for Facebook Ads stats API (GET).
 * @module api/facebook-ads/__tests__/stats.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// These routes now require an authenticated admin. Simulate an authorized admin
// session so the tests exercise the intended behavior (cookies() is unavailable
// in the test environment, so the real createClient cannot run here).
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

import { GET } from '../stats/route';

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('GET /api/facebook-ads/stats', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 200 and mock stats when mock mode enabled (non-production)', async () => {
    setNodeEnv('test');
    process.env.FACEBOOK_MOCK_CONNECTION = 'true';
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/stats');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.totalCampaigns).toBe('number');
    expect(typeof data.stats.activeCampaigns).toBe('number');
    expect(typeof data.stats.totalSpent).toBe('number');
    expect(data.stats.isDevelopmentMode).toBe(true);
  });

  it('returns 401 in production even if FACEBOOK_MOCK_CONNECTION is true', async () => {
    setNodeEnv('production');
    process.env.FACEBOOK_MOCK_CONNECTION = 'true';
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/stats');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 401 when not mock and no token', async () => {
    setNodeEnv('test');
    process.env.FACEBOOK_MOCK_CONNECTION = 'false';
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/stats');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Not connected');
  });
});
