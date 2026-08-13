"use server";

import { createSupabaseServiceRole } from '@/utils/supabase/service';
import { requireAdminAction } from '@/utils/auth/action-guards';
import { escapeIlikeContainsForOr, escapeIlikeExactPattern } from '@/utils/supabase/ilike-escape';

export interface GetSubscribersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  status: string;
  subscribeDate: string;
  lastActivity: string;
  engagement?: string;
  totalOpens?: number;
  totalClicks?: number;
  tags?: string[];
  audienceCount?: number;
}

export interface GetSubscribersResponse {
  subscribers: Subscriber[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    active: number;
    unsubscribed: number;
    bounced: number;
    pending: number;
    highEngagement: number;
    growthRate: string;
  };
}

export interface GetSubscriberResponse {
  subscriber: Subscriber & {
    joinedDate: string;
    emailOptIn: boolean;
    smsOptIn: boolean;
    timezone: string;
    language: string;
    source: string;
    notes: string;
    customFields: Record<string, any>;
    engagementHistory: any[];
    emailHistory: any[];
    audiences: any[];
    subscriptionType?: string;
    userId?: string;
  };
}

// Helper function to evaluate dynamic audience membership
function evaluateDynamicAudienceMembership(subscriber: any, profile: any, filters: any): boolean {
  if (!filters.rules || !Array.isArray(filters.rules) || filters.rules.length === 0) {
    return true; // Default to true if no rules
  }

  for (const rule of filters.rules) {
    if (rule.field === 'subscription') {
      if (profile?.subscription !== rule.value) {
        return false;
      }
    } else if (rule.field === 'status') {
      if (subscriber.status !== rule.value) {
        return false;
      }
    } else if (rule.field === 'trial_status') {
      // Implement trial status logic if needed
      return false;
    }
  }

  return true;
}

/**
 * Get all subscribers (admin only)
 */
export async function getSubscribers(
  params?: GetSubscribersParams
): Promise<GetSubscribersResponse> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    const search = params?.search || '';
    const status = params?.status || 'all';
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    // Build query for subscribers
    let subscribersQuery = supabase
      .from('subscribers')
      .select('id, email, status, created_at, user_id', { count: 'exact' });

    // Apply status filter if not 'all'
    if (status !== 'all' && ['active', 'unsubscribed', 'bounced', 'pending'].includes(status)) {
      subscribersQuery = subscribersQuery.eq('status', status as any);
    }

    // For search, we need to handle it differently since we need to search across users and profiles
    if (search && search.length >= 2) {
      try {
        const safeSearch = escapeIlikeContainsForOr(search);
        // First get all subscribers that match email directly
        const { data: emailMatches, error: emailError } = await supabase
        .from('subscribers')
        .select('id')
        .ilike('email', `%${escapeIlikeExactPattern(search)}%`);

        if (emailError) {
          console.error('Error searching subscribers by email:', emailError);
        }

        // Get subscribers whose profiles match first/last name or email
        // Profiles table has email synced from auth.users
        const { data: profileMatches, error: profileError } = await supabase
        .from('profiles')
        .select('id')
          .or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);

        if (profileError) {
          console.error('Error searching profiles:', profileError);
        }

        const profileUserIds = profileMatches?.map((p) => p.id) || [];

        // Get subscriber IDs that match profile user_ids (which reference auth.users)
        let profileSubscriberMatches: { data: { id: string }[] } = { data: [] };
        if (profileUserIds.length > 0) {
          const { data, error: subscriberError } = await supabase
              .from('subscribers')
              .select('id')
            .in('user_id', profileUserIds);
          
          if (subscriberError) {
            console.error('Error searching subscribers by user_id:', subscriberError);
          } else {
            profileSubscriberMatches = { data: data || [] };
          }
        }

      // Combine all matching IDs
      const allMatchingIds = [
          ...(emailMatches?.map((s) => s.id) || []),
        ...(profileSubscriberMatches.data?.map((s) => s.id) || []),
      ];

        // Remove duplicates
        const uniqueMatchingIds = [...new Set(allMatchingIds)];

        if (uniqueMatchingIds.length > 0) {
          subscribersQuery = subscribersQuery.in('id', uniqueMatchingIds);
      } else {
        // No matches found, return empty result
        subscribersQuery = subscribersQuery.eq('id', 'no-match-placeholder');
        }
      } catch (searchError) {
        console.error('Error in search logic:', searchError);
        // If search fails, just continue without search filter
        // Don't throw - let the query proceed without search
      }
    }

    // Apply pagination and ordering
    subscribersQuery = subscribersQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const {
      data: subscribers,
      error: subscribersError,
      count,
    } = await subscribersQuery;

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      throw new Error('Failed to fetch subscribers');
    }

    // Get stats using count queries (avoids default 1000 row limit on select)
    const totalForStats = count ?? 0;
    const [
      { count: activeCount },
      { count: unsubscribedCount },
      { count: bouncedCount },
      { count: pendingCount },
    ] = await Promise.all([
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'bounced'),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const active = activeCount ?? 0;
    const stats = {
      total: totalForStats,
      active,
      unsubscribed: unsubscribedCount ?? 0,
      bounced: bouncedCount ?? 0,
      pending: pendingCount ?? 0,
      highEngagement: Math.floor(active * 0.3),
      growthRate: '12%',
    };

    // Get profile data for subscribers to include names
    // Profiles table references auth.users(id), so this gives us user data
    const userIds =
      subscribers
        ?.filter((s) => s.user_id)
        .map((s) => s.user_id!)
        .filter(Boolean) || [];
    const profilesMap = new Map();

    if (userIds.length > 0) {
      // Get profiles which reference auth.users(id) - this is the correct way to get user data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Get audience counts for each subscriber (simplified - would need full logic for dynamic audiences)
    const subscriberIds = subscribers?.map((s) => s.id) || [];
    const audienceCountsMap = new Map();

    if (subscriberIds.length > 0) {
      // Get static audience memberships
      const { data: staticMemberships } = await supabase
        .from('email_audience_subscribers')
        .select('audience_id, subscriber_id')
        .in('subscriber_id', subscriberIds);

      // Create a map of static memberships for faster lookup
      const staticMembershipMap = new Map();
      if (staticMemberships) {
        staticMemberships.forEach((membership) => {
          const key = `${membership.subscriber_id}-${membership.audience_id}`;
          staticMembershipMap.set(key, true);
        });
      }

      // Count static memberships per subscriber
      subscriberIds.forEach((subscriberId) => {
        let count = 0;
        staticMemberships?.forEach((membership) => {
          if (membership.subscriber_id === subscriberId) {
            count++;
          }
        });
        audienceCountsMap.set(subscriberId, count);
      });
    }

    // Transform subscribers to include names, audience counts; opens/clicks reserved for real campaign stats
    const transformedSubscribers = (subscribers || []).map((subscriber) => {
      const profile = profilesMap.get(subscriber.user_id) || {};
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      const fullName =
        [firstName, lastName].filter(Boolean).join(' ') ||
        subscriber.email?.split('@')[0] ||
        'Unknown';

      return {
        id: subscriber.id,
        email: subscriber.email || '',
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        status: subscriber.status || 'active',
        subscribeDate: subscriber.created_at || new Date().toISOString(),
        lastActivity: subscriber.created_at || new Date().toISOString(),
        engagement: '',
        totalOpens: 0,
        totalClicks: 0,
        tags: [] as string[],
        audienceCount: audienceCountsMap.get(subscriber.id) || 0,
      };
    });

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      subscribers: transformedSubscribers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
      stats,
    };
  } catch (error) {
    console.error('Error in getSubscribers:', error);
    throw error;
  }
}

/**
 * Get a single subscriber by ID (admin only)
 */
export async function getSubscriber(subscriberId: string): Promise<GetSubscriberResponse> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    // Query the subscriber from the database
    const { data: subscriberData, error: subscriberError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriberId)
      .single();

    if (subscriberError || !subscriberData) {
      console.error('Failed to fetch subscriber:', subscriberError);
      throw new Error('Subscriber not found');
    }

    // Get the user profile if user_id exists
    let profile = null;
    if (subscriberData.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, subscription, subscription_expiration')
        .eq('id', subscriberData.user_id)
        .single();
      profile = profileData;
    }

    const subscriber = {
      id: subscriberData.id,
      name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
        subscriberData.email?.split('@')[0] ||
        'Unknown User',
      email: subscriberData.email || '',
      status: subscriberData.status || 'active',
      subscribeDate: subscriberData.subscribe_date || subscriberData.created_at || new Date().toISOString(),
      lastActivity: subscriberData.updated_at || subscriberData.subscribe_date || new Date().toISOString(),
      location: 'Unknown',
      tags: subscriberData.tags || [],
      engagement: 'Medium',
      totalOpens: 0,
      totalClicks: 0,
      subscriptionType: profile?.subscription || 'none',
      userId: subscriberData.user_id ?? undefined,
      joinedDate: subscriberData.subscribe_date || subscriberData.created_at || new Date().toISOString(),
      emailOptIn: subscriberData.status === 'active',
      smsOptIn: false,
      timezone: 'UTC',
      language: 'en',
      source: 'backfill',
      notes: '',
      customFields: {},
      engagementHistory: [],
      emailHistory: [],
      audiences: [],
    };

    return {
      subscriber,
    };
  } catch (error) {
    console.error('Error in getSubscriber:', error);
    throw error;
  }
}

