/**
 * @fileoverview Tests for Facebook Ads stats API (GET).
 * @module api/facebook-ads/__tests__/stats.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../stats/route';

describe('GET /api/facebook-ads/stats', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 200 and mock stats when FACEBOOK_MOCK_CONNECTION is true', async () => {
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

  it('returns 401 when not mock and no token', async () => {
    process.env.FACEBOOK_MOCK_CONNECTION = 'false';
    const request = new NextRequest('http://localhost:3000/api/facebook-ads/stats');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Not connected');
  });
});
