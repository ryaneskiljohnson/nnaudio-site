/**
 * @fileoverview Tests for Facebook Ads campaigns API (POST create campaign).
 * @module api/facebook-ads/__tests__/campaigns.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../campaigns/route';

describe('POST /api/facebook-ads/campaigns', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    process.env.FACEBOOK_MOCK_CONNECTION = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
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
