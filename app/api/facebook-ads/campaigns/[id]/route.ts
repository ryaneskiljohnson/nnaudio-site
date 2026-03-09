import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, CAMPAIGN_OBJECTIVES, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';
import type { FacebookCampaign } from '@/utils/facebook/api';

/**
 * Format Meta/API date for datetime-local input (YYYY-MM-DDTHH:mm).
 * Handles ISO 8601, date-only, and Unix timestamp (seconds or ms).
 */
function toDateTimeLocal(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  if (!s) return '';
  // Already datetime-local style
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);
  // Date only YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + 'T00:00';
  // Full ISO with Z or offset (e.g. 2024-01-20T08:00:00+0000 or 2024-01-20T08:00:00Z)
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1] + 'T' + isoMatch[2];
  // Unix timestamp (seconds or milliseconds)
  const num = parseInt(s, 10);
  if (!Number.isNaN(num)) {
    const ms = num < 1e12 ? num * 1000 : num;
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }
  return s.slice(0, 16);
}

/**
 * Normalize Facebook API campaign to the shape expected by the edit page
 * (platforms, budget, schedule, special_ad_categories). Platforms default to both true; override with metadata in GET.
 */
function normalizeCampaignForEdit(c: FacebookCampaign) {
  const dailyCents = c.daily_budget ? parseInt(c.daily_budget, 10) : 0;
  const lifetimeCents = c.lifetime_budget ? parseInt(c.lifetime_budget, 10) : 0;
  const hasDaily = dailyCents > 0;
  const hasCampaignBudget = dailyCents > 0 || lifetimeCents > 0;
  const raw = c.special_ad_categories;
  const specialAdCategories: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (raw ? [raw] : [])
      : [];
  return {
    id: c.id,
    name: c.name,
    objective: c.objective,
    status: (c.status ?? '').toString().toLowerCase() as 'active' | 'paused' | 'ended',
    createdAt: c.created_time,
    platforms: {
      facebook: true,
      instagram: true,
    },
    /** When true, budget is set at campaign level (CBO); when false, budget is set per ad set. */
    budgetLevel: hasCampaignBudget ? ('campaign' as const) : ('ad_set' as const),
    budget: {
      type: (hasDaily ? 'daily' : 'lifetime') as 'daily' | 'lifetime',
      amount: hasDaily ? dailyCents / 100 : lifetimeCents / 100,
    },
    schedule: {
      startDate: toDateTimeLocal(c.start_time),
      endDate: toDateTimeLocal(c.stop_time),
    },
    special_ad_categories: specialAdCategories,
    buying_type: (c as { buying_type?: string }).buying_type ?? 'AUCTION',
    description: undefined as string | undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    
    // Development mode: return mock campaign data
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const mockCampaigns = {
        "1": {
          id: "1",
          name: "Cymasphere Launch Campaign",
          description: "Main campaign to promote the launch of Cymasphere music production software",
          objective: "TRAFFIC",
          status: "active",
          platforms: {
            facebook: true,
            instagram: false
          },
          budgetLevel: "campaign",
          budget: {
            type: "daily",
            amount: 1000
          },
          schedule: {
            startDate: "2024-01-20T09:00",
            endDate: "2024-02-20T23:59"
          },
          special_ad_categories: [],
          createdAt: "2024-01-20T10:00:00Z"
        },
        "2": {
          id: "2",
          name: "Instagram Promotion",
          description: "Social media engagement campaign targeting music producers",
          objective: "ENGAGEMENT",
          status: "paused",
          platforms: {
            facebook: false,
            instagram: true
          },
          budgetLevel: "campaign",
          budget: {
            type: "lifetime",
            amount: 500
          },
          schedule: {
            startDate: "2024-01-18T12:00",
            endDate: ""
          },
          special_ad_categories: [],
          createdAt: "2024-01-18T12:00:00Z"
        },
        "3": {
          id: "3",
          name: "Brand Awareness Drive",
          description: "Building brand recognition in the music production community",
          objective: "BRAND_AWARENESS",
          status: "active",
          platforms: {
            facebook: true,
            instagram: true
          },
          budgetLevel: "campaign",
          budget: {
            type: "daily",
            amount: 750
          },
          schedule: {
            startDate: "2024-01-15T08:00",
            endDate: "2024-03-15T20:00"
          },
          special_ad_categories: [],
          createdAt: "2024-01-15T08:00:00Z"
        }
      };

      const campaign = mockCampaigns[campaignId as keyof typeof mockCampaigns];
      
      if (!campaign) {
        return NextResponse.json({
          success: false,
          error: 'Campaign not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        campaign,
        isDevelopmentMode: true
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const raw = await facebookAPI.getCampaign(campaignId);
    
    if (!raw) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found'
      }, { status: 404 });
    }

    let campaign = normalizeCampaignForEdit(raw);
    try {
      const { createSupabaseServiceRole } = await import('@/utils/supabase/service');
      const supabase = await createSupabaseServiceRole();
      const { data: meta } = await (supabase as any).from('facebook_campaign_metadata').select('description, platforms, start_date, end_date').eq('campaign_id', campaignId).maybeSingle();
      if (meta) {
        campaign = {
          ...campaign,
          description: meta.description ?? undefined,
          platforms: meta.platforms ?? { facebook: true, instagram: true },
          schedule: {
            startDate: meta.start_date ? toDateTimeLocal(meta.start_date) : campaign.schedule.startDate,
            endDate: meta.end_date ? toDateTimeLocal(meta.end_date) : campaign.schedule.endDate,
          },
        };
      }
    } catch (_) {
      // Table may not exist or RLS; continue without metadata
    }
    return NextResponse.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch campaign'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    
    // Development mode: simulate campaign update
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      // Simulate update delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic validation
      if (!body.name || !body.objective) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: name, objective'
        }, { status: 400 });
      }

      const updatedCampaign = {
        ...body,
        id: campaignId,
        updatedAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        campaign: updatedCampaign,
        message: 'Campaign updated successfully (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const { name, objective, status, description, platforms, budget, schedule, special_ad_categories, buying_type: buyingType } = body;

    // Validate required fields
    if (!name || !objective || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, objective, status'
      }, { status: 400 });
    }

    // Validate objective
    if (!Object.keys(CAMPAIGN_OBJECTIVES).includes(objective)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid campaign objective'
      }, { status: 400 });
    }

    // Update campaign. Meta does not allow changing objective on existing campaigns — omit it.
    // Writable: name, status, daily_budget, lifetime_budget, special_ad_categories, buying_type.
    const budgetUpdates: { daily_budget?: number; lifetime_budget?: number } = {};
    if (budget?.type === 'daily' && budget.amount != null) budgetUpdates.daily_budget = budget.amount;
    if (budget?.type === 'lifetime' && budget.amount != null) budgetUpdates.lifetime_budget = budget.amount;
    await facebookAPI.updateCampaign(campaignId, {
      name,
      status: status.toUpperCase(),
      ...budgetUpdates,
      special_ad_categories: Array.isArray(special_ad_categories) ? special_ad_categories : [],
      ...(buyingType != null ? { buying_type: String(buyingType) } : {}),
    });

    try {
      const { createSupabaseServiceRole } = await import('@/utils/supabase/service');
      const supabase = await createSupabaseServiceRole();
      await (supabase as any).from('facebook_campaign_metadata').upsert({
        campaign_id: campaignId,
        description: description ?? null,
        platforms: platforms ?? { facebook: true, instagram: true },
        start_date: schedule?.startDate || null,
        end_date: schedule?.endDate || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'campaign_id' });
    } catch (_) {
      // Table may not exist
    }

    const raw = await facebookAPI.getCampaign(campaignId);
    let campaign = raw ? normalizeCampaignForEdit(raw) : undefined;
    if (campaign) {
      campaign = {
        ...campaign,
        description,
        platforms: platforms ?? campaign.platforms,
        schedule: {
          startDate: schedule?.startDate ?? campaign.schedule?.startDate ?? '',
          endDate: schedule?.endDate ?? campaign.schedule?.endDate ?? '',
        },
      };
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    const message = error instanceof Error ? error.message : 'Failed to update campaign';
    const statusCode = (error as { statusCode?: number }).statusCode;
    const status = statusCode != null && statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    return NextResponse.json({
      success: false,
      error: message
    }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    
    // Development mode: simulate campaign deletion
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      // Simulate deletion delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    await facebookAPI.deleteCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete campaign'
    }, { status: 500 });
  }
} 