/**
 * @fileoverview Tests for Ad Manager delete confirmation modals (Campaigns and Audiences).
 * @module ad-manager/__tests__/delete-modals.test
 */

/// <reference types="vitest/globals" />
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({}) }));

import { DeleteConfirmationModal as CampaignDeleteModal } from '../campaigns/page';
import type { Campaign } from '../campaigns/page';
import { DeleteConfirmationModal as AudienceDeleteModal } from '../audiences/page';
import type { Audience } from '../audiences/page';

describe('Campaign delete confirmation modal', () => {
  const mockCampaign: Campaign = {
    id: 'c1',
    name: 'Test Campaign',
    status: 'active',
    objective: 'OUTCOME_TRAFFIC',
    platform: 'facebook',
    budget: 100,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    adSets: 1,
    ads: 2,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('calls onClose when Cancel is clicked and does not call onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <CampaignDeleteModal
        campaign={mockCampaign}
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting={false}
      />
    );
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when Delete Campaign is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <CampaignDeleteModal
        campaign={mockCampaign}
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting={false}
      />
    );
    const deleteBtn = screen.getByRole('button', { name: /delete campaign/i });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Audience delete confirmation modal', () => {
  const mockAudience: Audience = {
    id: 'a1',
    name: 'Test Audience',
    approximate_count: 1000,
    subscriber_count: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
  };

  it('calls onClose when Cancel is clicked and does not call onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AudienceDeleteModal
        audience={mockAudience}
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting={false}
      />
    );
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when Delete Audience is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AudienceDeleteModal
        audience={mockAudience}
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting={false}
      />
    );
    const deleteBtn = screen.getByRole('button', { name: /delete audience/i });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
