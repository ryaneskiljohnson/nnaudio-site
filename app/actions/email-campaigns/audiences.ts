"use server";

import { createClient } from '@/utils/supabase/server';
import { calculateSubscriberCount } from '@/utils/email-campaigns/calculate-subscriber-count';

const EMAIL_DEBUG = process.env.EMAIL_DEBUG === "1";

export interface GetAudiencesParams {
  limit?: number;
  offset?: number;
  mode?: 'light' | 'full';
  refreshCounts?: boolean;
}

export interface EmailAudience {
  id: string;
  name: string;
  description: string | null;
  subscriber_count: number;
  filters: any;
  created_at: string;
  updated_at: string;
}

export interface GetAudiencesResponse {
  audiences: EmailAudience[];
  total?: number;
}

/**
 * Get all email audiences (admin only)
 * Matches logic from app/api/email-campaigns/audiences/route.ts exactly
 */
export async function getAudiences(
  params?: GetAudiencesParams
): Promise<GetAudiencesResponse> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    const mode = params?.mode || 'full';
    const refreshCounts = params?.refreshCounts || false;

    // Get audiences (light or full)
    const { data: audiences, error } = await supabase
      .from('email_audiences')
      .select(mode === 'light' ? 'id,name,description,subscriber_count,created_at,updated_at,filters' : '*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching audiences:', error);
      throw new Error('Failed to fetch audiences');
    }

    if (EMAIL_DEBUG) {
      console.log(
        `🚀 Processing ${
          audiences?.length || 0
        } audiences for subscriber counts...`
      );
    }

    // Calculate/refresh counts - matching API route logic exactly
    const audiencesWithCounts = mode === "light" ? await (async () => {
      if (!refreshCounts || !audiences || audiences.length === 0) return audiences || [];
      // Refresh counts for static audiences cheaply via junction table
      try {
        const staticIds = (audiences as any[])
          .filter((a: any) => (a.filters && typeof a.filters === 'object' && (a.filters as any).audience_type === 'static'))
          .map((a: any) => a.id);
        if (staticIds.length === 0) return audiences || [];
        const { data: relations } = await supabase
          .from("email_audience_subscribers")
          .select("audience_id, subscriber_id")
          .in("audience_id", staticIds)
          .limit(5000); // Prevent unbounded queries for large audiences
        const counts: Record<string, number> = {};
        (relations || []).forEach((r: any) => {
          if (!r.audience_id) return;
          counts[r.audience_id] = (counts[r.audience_id] || 0) + 1;
        });
        return (audiences as any[]).map((a: any) => ({
          ...a,
          subscriber_count: staticIds.includes(a.id) ? (counts[a.id] || 0) : a.subscriber_count
        }));
      } catch (e) {
        if (EMAIL_DEBUG) console.warn('Light mode refreshCounts failed:', e);
        return audiences || [];
      }
    })() : await Promise.all(
      ((audiences || []) as unknown as { id: string; name: string; subscriber_count: number | null; filters: any }[]).map(async (audience) => {
        let actualCount = 0;

        if (EMAIL_DEBUG) {
          console.log(`\n--- Processing audience: "${audience.name}" ---`);
          console.log(`Stored subscriber_count: ${audience.subscriber_count}`);
          console.log(`Filters:`, JSON.stringify(audience.filters));
        }

        // Check if this is a static audience
        if (
          audience.filters &&
          typeof audience.filters === "object" &&
          audience.filters !== null
        ) {
          const filters = audience.filters as any;
          if (EMAIL_DEBUG) {
            console.log(
              `Audience type from filters: ${filters.audience_type || "not set"}`
            );
          }

          if (filters.audience_type === "static") {
            // For static audiences, call the subscribers API to get the exact same count as the edit modal
            // Note: This matches the API route behavior exactly - it makes an internal API call
            if (EMAIL_DEBUG) {
              console.log(
                `🔍 STATIC AUDIENCE - Getting count from subscribers API for "${audience.name}" (ID: ${audience.id})`
              );
            }

            try {
              // Make internal API call to get subscriber count (same as edit modal)
              // This matches the API route behavior exactly
              const subscribersResponse = await fetch(
                `${
                  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
                }/api/email-campaigns/audiences/${
                  audience.id
                }/subscribers?page=1&limit=1`,
                {
                  method: "GET",
                  headers: {
                    // Note: In server functions, we can't easily pass cookies/headers
                    // This is a limitation we'll need to work around
                    // For now, we'll try without auth headers (RLS will handle it)
                  },
                }
              );

              if (subscribersResponse.ok) {
                const subscribersData = await subscribersResponse.json();
                actualCount = subscribersData.pagination?.total || 0;
                console.log(
                  `📊 STATIC AUDIENCE "${audience.name}": ${actualCount} subscribers (from subscribers API)`
                );
              } else {
                if (EMAIL_DEBUG) {
                  console.error(
                    `❌ Subscribers API call failed for "${audience.name}":`,
                    subscribersResponse.status
                  );
                }
                actualCount = 0;
              }
            } catch (error) {
              if (EMAIL_DEBUG) {
                console.error(
                  `❌ Error calling subscribers API for "${audience.name}":`,
                  error
                );
              }
              actualCount = 0;
            }
          } else {
            // For dynamic audiences, calculate from filters
            if (EMAIL_DEBUG) {
              console.log(
                `🔄 DYNAMIC AUDIENCE - Calculating for "${audience.name}"`
              );
            }
            actualCount = await calculateSubscriberCount(
              supabase,
              audience.filters || {}
            );
            if (EMAIL_DEBUG) {
              console.log(
                `📊 DYNAMIC AUDIENCE "${audience.name}": ${actualCount} subscribers (calculated)`
              );
            }
          }
        } else {
          // For dynamic audiences, calculate from filters
          if (EMAIL_DEBUG) {
            console.log(
              `🔄 NO FILTERS OBJECT - Treating as dynamic audience "${audience.name}"`
            );
          }
          actualCount = await calculateSubscriberCount(
            supabase,
            audience.filters || {}
          );
          if (EMAIL_DEBUG) {
            console.log(
              `📊 NO FILTERS AUDIENCE "${audience.name}": ${actualCount} subscribers (calculated)`
            );
          }
        }

        const result = {
          ...audience,
          subscriber_count: actualCount,
        };

        if (EMAIL_DEBUG) {
          console.log(
            `✅ Final result for "${audience.name}": subscriber_count=${actualCount}`
          );
        }
        return { ...audience, subscriber_count: actualCount } as EmailAudience;
      })
    );

    if (EMAIL_DEBUG) {
      console.log(
        `🏁 Finished processing all audiences. Returning ${audiencesWithCounts.length} audiences.`
      );
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from("email_audiences")
      .select("*", { count: "exact", head: true });

    if (countError) {
      if (EMAIL_DEBUG) {
        console.error("Error getting audiences count:", countError);
      }
    }

    return {
      audiences: audiencesWithCounts || [],
      total: count || 0,
    };
  } catch (error) {
    if (EMAIL_DEBUG) {
      console.error("Audiences server function error:", error);
    }
    console.error('Error in getAudiences:', error);
    throw error;
  }
}

export interface CreateAudienceParams {
  name: string;
  description?: string | null;
  filters?: any;
}

export interface CreateAudienceResponse {
  audience: EmailAudience;
}

/**
 * Create a new email audience (admin only)
 */
export async function createAudience(
  params: CreateAudienceParams
): Promise<CreateAudienceResponse> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail
    const { name, description, filters } = params;

    if (!name) {
      throw new Error('Name is required');
    }

    // Calculate initial subscriber count - matching API route logic exactly
    let initialCount = 0;
    if (filters && typeof filters === "object" && filters !== null) {
      const filtersObj = filters as any;
      if (filtersObj.audience_type === "static") {
        // For static audiences, start with 0 subscribers
        initialCount = 0;
      } else {
        // For dynamic audiences, calculate from filters
        initialCount = await calculateSubscriberCount(supabase, filters || {});
      }
    } else {
      // Default to dynamic audience behavior
      initialCount = await calculateSubscriberCount(supabase, filters || {});
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Create new audience
    const { data: audience, error } = await supabase
      .from('email_audiences')
      .insert({
        name,
        description: description || null,
        filters: filters || {},
        created_by: user.id,
        subscriber_count: initialCount,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating audience:', error);
      throw new Error('Failed to create audience');
    }

    return { audience: { ...audience, subscriber_count: audience?.subscriber_count ?? 0 } as EmailAudience };
  } catch (error) {
    console.error('Error in createAudience:', error);
    throw error;
  }
}

export interface GetAudienceResponse {
  audience: EmailAudience;
}

/**
 * Get a single email audience by ID (admin only)
 * Matches logic from app/api/email-campaigns/audiences/[id]/route.ts (GET) exactly
 */
export async function getAudience(
  audienceId: string
): Promise<GetAudienceResponse> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail
    const { data: audience, error } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Audience not found');
      }
      console.error('Error fetching audience:', error);
      throw new Error('Failed to fetch audience');
    }

    return { audience: { ...audience, subscriber_count: audience?.subscriber_count ?? 0 } as EmailAudience };
  } catch (error) {
    console.error('Error in getAudience:', error);
    throw error;
  }
}

export interface UpdateAudienceParams {
  name?: string;
  description?: string | null;
  filters?: any;
  subscriber_count?: number;
}

export interface UpdateAudienceResponse {
  audience: EmailAudience;
}

/**
 * Update an email audience (admin only)
 * Matches logic from app/api/email-campaigns/audiences/[id]/route.ts (PUT) exactly
 */
export async function updateAudience(
  audienceId: string,
  params: UpdateAudienceParams
): Promise<UpdateAudienceResponse> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail
    const { name, description, filters, subscriber_count } = params;

    const updateData: { [key: string]: unknown } = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (filters !== undefined) updateData.filters = filters;
    if (subscriber_count !== undefined) updateData.subscriber_count = subscriber_count;

    const { data: audience, error } = await supabase
      .from('email_audiences')
      .update(updateData)
      .eq('id', audienceId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Audience not found');
      }
      console.error('Error updating audience:', error);
      throw new Error('Failed to update audience');
    }

    return { audience: { ...audience, subscriber_count: audience?.subscriber_count ?? 0 } as EmailAudience };
  } catch (error) {
    console.error('Error in updateAudience:', error);
    throw error;
  }
}

/**
 * Delete an email audience (admin only)
 * Matches logic from app/api/email-campaigns/audiences/[id]/route.ts (DELETE) exactly
 */
export async function deleteAudience(
  audienceId: string
): Promise<{ message: string }> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail
    const { error } = await supabase
      .from('email_audiences')
      .delete()
      .eq('id', audienceId);

    if (error) {
      console.error('Error deleting audience:', error);
      throw new Error('Failed to delete audience');
    }

    return { message: 'Audience deleted successfully' };
  } catch (error) {
    console.error('Error in deleteAudience:', error);
    throw error;
  }
}

