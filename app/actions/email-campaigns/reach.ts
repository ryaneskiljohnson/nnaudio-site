"use server";

import { createClient } from '@/utils/supabase/server';

export interface CalculateReachParams {
  audienceIds: string[];
  excludedAudienceIds?: string[];
}

export interface CalculateReachResponse {
  uniqueCount: number;
  details: {
    totalIncluded: number;
    totalExcluded: number;
    includedAudiences: number;
    excludedAudiences: number;
  };
}

// Helper function to get subscriber IDs from dynamic audience filters
async function getSubscriberIdsFromFilters(supabase: any, filters: any): Promise<string[]> {
  try {
    let statusValue: string | null = null;
    let subscriptionValue: string | null = null;
    let trialStatusValue: string | null = null;
    let additionalRules: any[] = [];

    if (Array.isArray(filters?.rules)) {
      for (const rule of filters.rules) {
        if (rule.field === 'status') statusValue = rule.value;
        else if (rule.field === 'subscription') subscriptionValue = rule.value;
        else if (rule.field === 'trial_status') trialStatusValue = rule.value;
        else additionalRules.push(rule);
      }
    }

    const effectiveStatus = statusValue || 'active';

    let subscribersQuery = supabase
      .from('subscribers')
      .select('id,user_id,subscribe_date')
      .eq('status', effectiveStatus);

    if (subscriptionValue || trialStatusValue) {
      let profilesSel = supabase.from('profiles').select('id');
      if (subscriptionValue) {
        profilesSel = profilesSel.eq('subscription', subscriptionValue);
      }
      if (trialStatusValue) {
        const nowIso = new Date().toISOString();
        if (trialStatusValue === 'active') {
          profilesSel = profilesSel.gt('trial_expiration', nowIso).eq('subscription', 'none');
        } else if (trialStatusValue === 'expired') {
          profilesSel = profilesSel.lte('trial_expiration', nowIso);
        }
      }
      const { data: profilesData } = await profilesSel;
      const profileIds = (profilesData || []).map((p: any) => p.id);
      if (profileIds.length === 0) return [];
      subscribersQuery = subscribersQuery.in('user_id', profileIds);
    }

    for (const rule of additionalRules) {
      if (rule.field === 'signup_date' && rule.operator === 'within') {
        const days = parseInt(String(rule.value).replace('_days', ''));
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (isNaN(days) ? 7 : days));
        subscribersQuery = subscribersQuery.gte('subscribe_date', cutoff.toISOString());
      }
    }

    const { data: baseSubs, error: subsErr } = await subscribersQuery;
    if (subsErr) return [];
    let ids = (baseSubs || []).map((s: any) => s.id);

    const lastOpenRule = additionalRules.find((r: any) => r.field === 'last_email_open');
    if (lastOpenRule && lastOpenRule.operator === 'older_than') {
      const days = parseInt(String(lastOpenRule.value).replace('_days', ''));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (isNaN(days) ? 60 : days));
      const { data: recentOpeners } = await supabase
        .from('email_opens')
        .select('subscriber_id')
        .gte('opened_at', cutoff.toISOString());
      const exclude = new Set((recentOpeners || []).map((r: any) => r.subscriber_id));
      ids = ids.filter((id: string) => !exclude.has(id));
    }

    return ids;
  } catch (error) {
    console.error('Error getting subscriber IDs from filters:', error);
    return [];
  }
}

// Helper function to calculate unique reach
async function calculateUniqueReach(
  supabase: any,
  audienceIds: string[],
  excludedAudienceIds: string[] = []
): Promise<CalculateReachResponse> {
  try {
    if (audienceIds.length === 0) {
      return {
        uniqueCount: 0,
        details: {
          totalIncluded: 0,
          totalExcluded: 0,
          includedAudiences: 0,
          excludedAudiences: 0,
        },
      };
    }

    const { data: audiences } = await supabase
      .from('email_audiences')
      .select('id, name, filters')
      .in('id', [...audienceIds, ...excludedAudienceIds]);

    if (!audiences) {
      return {
        uniqueCount: 0,
        details: {
          totalIncluded: 0,
          totalExcluded: 0,
          includedAudiences: 0,
          excludedAudiences: 0,
        },
      };
    }

    const includedAudiences = audiences.filter((a: any) => audienceIds.includes(a.id));
    const excludedAudiences = audiences.filter((a: any) => excludedAudienceIds.includes(a.id));

    const allIncludedSubscriberIds = new Set<string>();
    const allExcludedSubscriberIds = new Set<string>();

    for (const audience of includedAudiences) {
      const filters = (audience.filters as any) || {};
      if (filters.audience_type === 'static') {
        const { data: relations } = await supabase
          .from('email_audience_subscribers')
          .select('subscriber_id')
          .eq('audience_id', audience.id);
        relations?.forEach((r: any) => {
          if (r.subscriber_id) {
            allIncludedSubscriberIds.add(r.subscriber_id);
          }
        });
      } else {
        const subscriberIds = await getSubscriberIdsFromFilters(supabase, filters);
        subscriberIds.forEach((id) => allIncludedSubscriberIds.add(id));
      }
    }

    for (const audience of excludedAudiences) {
      const filters = (audience.filters as any) || {};
      if (filters.audience_type === 'static') {
        const { data: relations } = await supabase
          .from('email_audience_subscribers')
          .select('subscriber_id')
          .eq('audience_id', audience.id);
        relations?.forEach((r: any) => {
          if (r.subscriber_id) {
            allExcludedSubscriberIds.add(r.subscriber_id);
          }
        });
      } else {
        const subscriberIds = await getSubscriberIdsFromFilters(supabase, filters);
        subscriberIds.forEach((id) => allExcludedSubscriberIds.add(id));
      }
    }

    const originalIncludedCount = allIncludedSubscriberIds.size;
    allExcludedSubscriberIds.forEach((id) => {
      allIncludedSubscriberIds.delete(id);
    });
    const uniqueCount = allIncludedSubscriberIds.size;

    return {
      uniqueCount,
      details: {
        totalIncluded: originalIncludedCount,
        totalExcluded: allExcludedSubscriberIds.size,
        includedAudiences: includedAudiences.length,
        excludedAudiences: excludedAudiences.length,
      },
    };
  } catch (error) {
    console.error('Error calculating unique reach:', error);
    return {
      uniqueCount: 0,
      details: {
        totalIncluded: 0,
        totalExcluded: 0,
        includedAudiences: 0,
        excludedAudiences: 0,
      },
    };
  }
}

/**
 * Calculate unique reach for given audiences (admin only)
 */
export async function calculateReach(
  params: CalculateReachParams
): Promise<CalculateReachResponse> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    const { audienceIds = [], excludedAudienceIds = [] } = params;

    if (!Array.isArray(audienceIds)) {
      throw new Error('audienceIds must be an array');
    }

    return await calculateUniqueReach(supabase, audienceIds, excludedAudienceIds);
  } catch (error) {
    console.error('Error in calculateReach:', error);
    throw error;
  }
}

export interface CalculateBatchReachParams {
  campaigns: Array<{
    id: string;
    audienceIds: string[];
    excludedAudienceIds?: string[];
  }>;
}

export interface CalculateBatchReachResponse {
  results: Record<string, CalculateReachResponse>;
}

/**
 * Calculate unique reach for multiple campaigns in batch (admin only)
 */
export async function calculateBatchReach(
  params: CalculateBatchReachParams
): Promise<CalculateBatchReachResponse> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    const items = params.campaigns || [];
    if (!Array.isArray(items)) {
      throw new Error('campaigns must be an array');
    }

    const results: Record<string, CalculateReachResponse> = {};
    for (const item of items) {
      const audienceIds = Array.isArray(item.audienceIds) ? item.audienceIds : [];
      const excludedAudienceIds = Array.isArray(item.excludedAudienceIds) ? item.excludedAudienceIds : [];
      const res = await calculateUniqueReach(supabase, audienceIds, excludedAudienceIds);
      results[item.id] = res;
    }

    return { results };
  } catch (error) {
    console.error('Error in calculateBatchReach:', error);
    throw error;
  }
}

