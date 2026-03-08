/**
 * @fileoverview Tests for Facebook API utils (campaign objectives).
 * @module utils/facebook/__tests__/api.test
 */

import { describe, it, expect } from 'vitest';
import { CAMPAIGN_OBJECTIVES } from '../api';

describe('CAMPAIGN_OBJECTIVES', () => {
  it('includes required Meta OUTCOME_* objectives', () => {
    expect(CAMPAIGN_OBJECTIVES.OUTCOME_TRAFFIC).toBeDefined();
    expect(CAMPAIGN_OBJECTIVES.OUTCOME_LEADS).toBeDefined();
    expect(CAMPAIGN_OBJECTIVES.OUTCOME_SALES).toBeDefined();
    expect(CAMPAIGN_OBJECTIVES.OUTCOME_ENGAGEMENT).toBeDefined();
    expect(CAMPAIGN_OBJECTIVES.OUTCOME_AWARENESS).toBeDefined();
    expect(CAMPAIGN_OBJECTIVES.OUTCOME_APP_PROMOTION).toBeDefined();
  });

  it('does not include invalid legacy objectives', () => {
    expect((CAMPAIGN_OBJECTIVES as Record<string, string>)['LINK_CLICKS']).toBeUndefined();
  });
});
