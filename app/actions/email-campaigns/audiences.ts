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

    // Get audiences (light or full). Table has query_conditions, not filters.
    const { data: audiences, error } = await supabase
      .from('email_audiences')
      .select(mode === 'light' ? 'id,name,description,created_at,updated_at,query_conditions' : '*')
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

    type AudienceRow = { id: string; name: string; description: string | null; created_at: string | null; updated_at: string | null; query_conditions?: unknown };
    const toEmailAudience = (a: AudienceRow, subscriber_count: number): EmailAudience =>
      ({ ...a, subscriber_count, filters: a.query_conditions ?? {} } as EmailAudience);

    // Calculate/refresh counts - matching API route logic exactly
    const audiencesWithCounts = mode === "light" ? await (async () => {
      const list = (audiences || []) as unknown as AudienceRow[];
      if (!refreshCounts || list.length === 0) return list.map((a) => toEmailAudience(a, 0));
      try {
        const filtersList = list.map((a) => (a.query_conditions as Record<string, unknown>) || {});
        const staticIds = list
          .filter((_a, i) => filtersList[i] && typeof filtersList[i] === 'object' && (filtersList[i] as Record<string, unknown>).audience_type === 'static')
          .map((a) => a.id);
        if (staticIds.length === 0) return list.map((a) => toEmailAudience(a, 0));
        const { data: relations } = await supabase
          .from("email_audience_subscribers")
          .select("audience_id, subscriber_id")
          .in("audience_id", staticIds)
          .limit(5000);
        const counts: Record<string, number> = {};
        (relations || []).forEach((r: { audience_id: string | null; subscriber_id: string | null }) => {
          if (r.audience_id == null) return;
          counts[r.audience_id] = (counts[r.audience_id] || 0) + 1;
        });
        return list.map((a) => toEmailAudience(a, staticIds.includes(a.id) ? (counts[a.id] || 0) : 0));
      } catch (e) {
        if (EMAIL_DEBUG) console.warn('Light mode refreshCounts failed:', e);
        return list.map((a) => toEmailAudience(a, 0));
      }
    })() : await Promise.all(
      ((audiences || []) as unknown as AudienceRow[]).map(async (audience) => {
        const filters = (audience.query_conditions ?? {}) as Record<string, unknown>;
        let actualCount = 0;

        if (EMAIL_DEBUG) {
          console.log(`\n--- Processing audience: "${audience.name}" ---`);
          console.log(`Filters:`, JSON.stringify(filters));
        }

        // Check if this is a static audience
        if (
          filters &&
          typeof filters === "object" &&
          Object.keys(filters).length > 0
        ) {
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
              filters || {}
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
            filters || {}
          );
          if (EMAIL_DEBUG) {
            console.log(
              `📊 NO FILTERS AUDIENCE "${audience.name}": ${actualCount} subscribers (calculated)`
            );
          }
        }

        if (EMAIL_DEBUG) {
          console.log(
            `✅ Final result for "${audience.name}": subscriber_count=${actualCount}`
          );
        }
        return toEmailAudience(audience, actualCount);
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

    // Create new audience (table uses query_conditions, not filters)
    const { data: audience, error } = await supabase
      .from('email_audiences')
      .insert({
        name,
        description: description || null,
        query_conditions: filters || {},
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating audience:', error);
      throw new Error('Failed to create audience');
    }

    const row = audience as { id: string; name: string; description: string | null; query_conditions: unknown; created_at: string | null; updated_at: string | null };
    return { audience: { ...row, subscriber_count: initialCount, filters: row.query_conditions } as EmailAudience };
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

    const row = audience as { id: string; name: string; description: string | null; query_conditions: unknown; created_at: string | null; updated_at: string | null };
    return { audience: { ...row, subscriber_count: 0, filters: row.query_conditions } as EmailAudience };
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
    if (filters !== undefined) updateData.query_conditions = filters;

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

    const row = audience as { id: string; name: string; description: string | null; query_conditions: unknown; created_at: string | null; updated_at: string | null };
    return { audience: { ...row, subscriber_count: 0, filters: row.query_conditions } as EmailAudience };
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

