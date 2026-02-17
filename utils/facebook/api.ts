// Facebook Marketing API utility functions
import { NextResponse } from 'next/server';

// Facebook API configuration
const FACEBOOK_API_VERSION = 'v20.0';
const FACEBOOK_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// Types for Facebook API responses and requests
export interface FacebookError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

export interface FacebookAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  account_id: string;
}

export interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  updated_time: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  account_id: string;
}

export interface FacebookAdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  created_time: string;
  updated_time: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  targeting?: any;
}

export interface FacebookAd {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  status: string;
  created_time: string;
  updated_time: string;
  creative?: any;
}

export interface FacebookInsights {
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  ctr: string;
  cpc: string;
  cpm: string;
  conversions?: string;
  conversion_rate?: string;
  cost_per_conversion?: string;
}

export interface CreateCampaignParams {
  name: string;
  objective: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
}

export interface CreateAdSetParams {
  name: string;
  campaign_id: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  targeting: any;
  optimization_goal: string;
  billing_event: string;
}

export interface CreateAdParams {
  name: string;
  adset_id: string;
  status: string;
  creative: any;
}

// Facebook API client class
export class FacebookAdsAPI {
  private accessToken: string;
  private adAccountId: string;

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
  }

  // Generic API request method
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    params: Record<string, any> = {},
    data: Record<string, any> = {}
  ): Promise<T> {
    let url = `${FACEBOOK_BASE_URL}/${endpoint}`;
    
    // Add access token to params
    params.access_token = this.accessToken;
    
    // Build query string for GET requests or if params are needed
    if (method === 'GET' || Object.keys(params).length > 1) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      url += `?${queryParams.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && Object.keys(data).length > 0) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('Facebook API request failed:', error);
      throw error;
    }
  }

  // Test API connection
  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const user = await this.makeRequest<any>('me', 'GET', { fields: 'id,name,email' });
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get ad accounts
  async getAdAccounts(): Promise<FacebookAdAccount[]> {
    const response = await this.makeRequest<{ data: FacebookAdAccount[] }>(
      'me/adaccounts',
      'GET',
      { fields: 'id,name,account_status,currency,timezone_name,account_id' }
    );
    return response.data;
  }

  // Get campaigns
  async getCampaigns(): Promise<FacebookCampaign[]> {
    const response = await this.makeRequest<{ data: FacebookCampaign[] }>(
      `act_${this.adAccountId}/campaigns`,
      'GET',
      { 
        fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining'
      }
    );
    return response.data;
  }

  // Get single campaign
  async getCampaign(campaignId: string): Promise<FacebookCampaign | null> {
    try {
      const response = await this.makeRequest<FacebookCampaign>(
        campaignId,
        'GET',
        { 
          fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining'
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  // Create campaign
  async createCampaign(params: CreateCampaignParams): Promise<FacebookCampaign> {
    const campaignData = {
      name: params.name,
      objective: params.objective,
      status: params.status,
      ...(params.daily_budget && { daily_budget: params.daily_budget * 100 }), // Convert to cents
      ...(params.lifetime_budget && { lifetime_budget: params.lifetime_budget * 100 }),
      ...(params.start_time && { start_time: params.start_time }),
      ...(params.end_time && { end_time: params.end_time }),
    };

    return await this.makeRequest<FacebookCampaign>(
      `act_${this.adAccountId}/campaigns`,
      'POST',
      { access_token: this.accessToken },
      campaignData
    );
  }

  // Update campaign
  async updateCampaign(campaignId: string, updates: Partial<CreateCampaignParams>): Promise<{ success: boolean }> {
    const updateData = {
      ...(updates.name && { name: updates.name }),
      ...(updates.status && { status: updates.status }),
      ...(updates.daily_budget && { daily_budget: updates.daily_budget * 100 }),
      ...(updates.lifetime_budget && { lifetime_budget: updates.lifetime_budget * 100 }),
      ...(updates.start_time && { start_time: updates.start_time }),
      ...(updates.end_time && { end_time: updates.end_time }),
    };

    await this.makeRequest<{ success: boolean }>(
      campaignId,
      'POST',
      { access_token: this.accessToken },
      updateData
    );

    return { success: true };
  }

  // Delete campaign
  async deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
    await this.makeRequest<{ success: boolean }>(
      campaignId,
      'DELETE'
    );
    return { success: true };
  }

  // Get ad sets
  async getAdSets(campaignId?: string): Promise<FacebookAdSet[]> {
    const endpoint = campaignId 
      ? `${campaignId}/adsets`
      : `act_${this.adAccountId}/adsets`;
    
    const response = await this.makeRequest<{ data: FacebookAdSet[] }>(
      endpoint,
      'GET',
      { 
        fields: 'id,name,campaign_id,status,created_time,updated_time,daily_budget,lifetime_budget,start_time,end_time,targeting'
      }
    );
    return response.data;
  }

  // Create ad set
  async createAdSet(params: CreateAdSetParams): Promise<FacebookAdSet> {
    const adSetData = {
      name: params.name,
      campaign_id: params.campaign_id,
      status: params.status,
      targeting: params.targeting,
      optimization_goal: params.optimization_goal,
      billing_event: params.billing_event,
      ...(params.daily_budget && { daily_budget: params.daily_budget * 100 }),
      ...(params.lifetime_budget && { lifetime_budget: params.lifetime_budget * 100 }),
      ...(params.start_time && { start_time: params.start_time }),
      ...(params.end_time && { end_time: params.end_time }),
    };

    return await this.makeRequest<FacebookAdSet>(
      `act_${this.adAccountId}/adsets`,
      'POST',
      { access_token: this.accessToken },
      adSetData
    );
  }

  // Get ads
  async getAds(adSetId?: string): Promise<FacebookAd[]> {
    const endpoint = adSetId 
      ? `${adSetId}/ads`
      : `act_${this.adAccountId}/ads`;
    
    const response = await this.makeRequest<{ data: FacebookAd[] }>(
      endpoint,
      'GET',
      { 
        fields: 'id,name,adset_id,campaign_id,status,created_time,updated_time,creative'
      }
    );
    return response.data;
  }

  // Create ad
  async createAd(params: CreateAdParams): Promise<FacebookAd> {
    const adData = {
      name: params.name,
      adset_id: params.adset_id,
      status: params.status,
      creative: params.creative,
    };

    return await this.makeRequest<FacebookAd>(
      `act_${this.adAccountId}/ads`,
      'POST',
      { access_token: this.accessToken },
      adData
    );
  }

  // Get insights for campaigns, ad sets, or ads
  async getInsights(
    objectId: string,
    level: 'campaign' | 'adset' | 'ad',
    dateRange: { since: string; until: string },
    metrics: string[] = ['impressions', 'clicks', 'spend', 'reach', 'ctr', 'cpc', 'cpm']
  ): Promise<FacebookInsights[]> {
    const response = await this.makeRequest<{ data: FacebookInsights[] }>(
      `${objectId}/insights`,
      'GET',
      {
        level,
        time_range: JSON.stringify(dateRange),
        fields: metrics.join(','),
      }
    );
    return response.data;
  }

  // Get account insights summary
  async getAccountInsights(
    dateRange: { since: string; until: string }
  ): Promise<FacebookInsights> {
    const insights = await this.makeRequest<{ data: FacebookInsights[] }>(
      `act_${this.adAccountId}/insights`,
      'GET',
      {
        time_range: JSON.stringify(dateRange),
        fields: 'impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,conversions,conversion_rate,cost_per_conversion',
      }
    );
    
    return insights.data[0] || {} as FacebookInsights;
  }

  // Pause/Resume campaign
  async pauseCampaign(campaignId: string): Promise<{ success: boolean }> {
    return this.updateCampaign(campaignId, { status: 'PAUSED' });
  }

  async resumeCampaign(campaignId: string): Promise<{ success: boolean }> {
    return this.updateCampaign(campaignId, { status: 'ACTIVE' });
  }

  // Create custom audience
  async createCustomAudience(
    name: string,
    description: string,
    subtype: string = 'CUSTOM'
  ): Promise<any> {
    const audienceData = {
      name,
      description,
      subtype,
    };

    return await this.makeRequest<any>(
      `act_${this.adAccountId}/customaudiences`,
      'POST',
      { access_token: this.accessToken },
      audienceData
    );
  }

  // Get custom audiences
  async getCustomAudiences(): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>(
      `act_${this.adAccountId}/customaudiences`,
      'GET',
      { fields: 'id,name,description,approximate_count,data_source' }
    );
    return response.data;
  }
}

/** Cookie name for Facebook access token (httpOnly on server). Do not store token in localStorage. */
export const FACEBOOK_TOKEN_COOKIE_NAME = 'facebook_access_token';

/**
 * Returns the Facebook token from client localStorage. Prefer passing a server-side getter to createFacebookAPI instead.
 * @deprecated Use httpOnly cookie and pass getToken from API route (request.cookies) for security.
 */
export function getStoredFacebookToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(FACEBOOK_TOKEN_COOKIE_NAME);
  }
  return null;
}

/**
 * Stores the token in localStorage (client only). Used only for backward compatibility.
 * Server-side OAuth callback stores the token in an httpOnly cookie instead.
 * @deprecated Server callback now uses httpOnly cookie; avoid storing tokens in localStorage.
 */
export function storeFacebookToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FACEBOOK_TOKEN_COOKIE_NAME, token);
  }
}

/** Removes the token from localStorage (client only). For server cookie, call POST /api/facebook-ads/disconnect. */
export function removeFacebookToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FACEBOOK_TOKEN_COOKIE_NAME);
  }
}

/**
 * Creates a Facebook API instance. On the server, pass a getter that reads the token from request cookies.
 * @param adAccountId - Facebook Ad Account ID
 * @param getToken - Optional. Server-side: pass () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null
 */
export function createFacebookAPI(
  adAccountId: string,
  getToken?: () => string | null
): FacebookAdsAPI | null {
  const token = getToken ? getToken() : getStoredFacebookToken();
  if (!token) {
    return null;
  }
  return new FacebookAdsAPI(token, adAccountId);
}

// Campaign objectives mapping
export const CAMPAIGN_OBJECTIVES = {
  BRAND_AWARENESS: 'Brand Awareness',
  REACH: 'Reach',
  TRAFFIC: 'Traffic',
  ENGAGEMENT: 'Engagement',
  APP_INSTALLS: 'App Installs',
  VIDEO_VIEWS: 'Video Views',
  LEAD_GENERATION: 'Lead Generation',
  MESSAGES: 'Messages',
  CONVERSIONS: 'Conversions',
  CATALOG_SALES: 'Catalog Sales',
  STORE_VISITS: 'Store Visits',
} as const;

// Campaign status mapping
export const CAMPAIGN_STATUS = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  DELETED: 'Deleted',
  ARCHIVED: 'Archived',
} as const;

// Optimization goals for ad sets
export const OPTIMIZATION_GOALS = {
  REACH: 'REACH',
  BRAND_AWARENESS: 'BRAND_AWARENESS',
  LINK_CLICKS: 'LINK_CLICKS',
  IMPRESSIONS: 'IMPRESSIONS',
  POST_ENGAGEMENT: 'POST_ENGAGEMENT',
  CONVERSIONS: 'CONVERSIONS',
  LANDING_PAGE_VIEWS: 'LANDING_PAGE_VIEWS',
  VIDEO_VIEWS: 'VIDEO_VIEWS',
  LEADS: 'LEADS',
} as const;

// Billing events
export const BILLING_EVENTS = {
  IMPRESSIONS: 'IMPRESSIONS',
  CLICKS: 'CLICKS',
  CONVERSIONS: 'CONVERSIONS',
  VIDEO_VIEWS: 'VIDEO_VIEWS',
} as const; 