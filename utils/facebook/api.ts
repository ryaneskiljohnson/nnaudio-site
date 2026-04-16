// Facebook Marketing API utility functions
import { NextResponse } from 'next/server';

// Facebook API configuration. Use a supported version; Meta deprecates older versions (error 2635).
// See https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets/
const FACEBOOK_API_VERSION = 'v22.0';
const FACEBOOK_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

/** Default targeting per Meta docs: geo_locations.countries required; facebook_positions and publisher_platforms recommended. */
const META_DEFAULT_TARGETING = {
  facebook_positions: ['feed'],
  geo_locations: { countries: ['US'] },
  publisher_platforms: ['facebook', 'audience_network'],
} as const;

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
  /** Required by Meta; array e.g. [] or ['HOUSING'] */
  special_ad_categories?: string[] | string;
  /** AUCTION (default) or RESERVATION */
  buying_type?: string;
  /** Campaign-level bid strategy (CBO). e.g. LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP */
  bid_strategy?: string;
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
  optimization_goal?: string;
  billing_event?: string;
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

/**
 * Meta Campaign Creating params. Maps to POST act_{id}/campaigns (form-encoded).
 * All Meta-documented Creating params are supported: core fields below, plus any extra via meta_params.
 * See docs/META_CAMPAIGN_CREATE.md for full parameter table.
 */
export interface CreateCampaignParams {
  name: string;
  objective: string;
  status: string;
  /** Required by Meta; use [] for non–housing/employment/credit/social_issues ads */
  special_ad_categories?: string[];
  /** Meta default AUCTION; we send this so the request matches the reference. */
  buying_type?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  /** Meta: spend cap. Pass-through so we support all Meta campaign settings. */
  spend_cap?: number;
  /** Meta: ad labels. Pass-through. */
  adlabels?: string[] | Record<string, unknown>[];
  /** Meta: bid_strategy at campaign level (e.g. LOWEST_COST_WITHOUT_CAP). */
  bid_strategy?: string;
  /** Meta: promoted_object (pixel_id, application_id, page_id, etc.). JSON object. */
  promoted_object?: Record<string, unknown>;
  /** Meta: execution_options (e.g. validate_only, include_recommendations). */
  execution_options?: string[];
  /** Any other Meta Creating params; keys/values are forwarded to the form body (values stringified). */
  meta_params?: Record<string, string | number | boolean | Record<string, unknown> | unknown[]>;
}

/**
 * Meta Ad Set Creating params. Maps to POST act_{id}/adsets (form-encoded).
 * All Meta-documented Creating params supported: core below, plus optional and meta_params passthrough.
 * See docs/META_AD_SET_CREATE.md for full parameter table.
 */
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
  /** When true, omit daily_budget/lifetime_budget (campaign has CBO budget). Meta: "You can only set an ad set budget or a campaign budget." */
  campaign_has_budget?: boolean;
  /** When campaign_has_budget: campaign daily budget in dollars. Used so ad set end_time implies total spend >= Meta's ~$200 min (daily × days). */
  campaign_daily_budget_dollars?: number;
  /** Required by Meta when campaign uses special categories; use [] for none. */
  special_ad_categories?: string[];
  /** Meta default LOWEST_COST_WITHOUT_CAP; required when using bid cap. */
  bid_strategy?: string;
  /** Cents; required when bid_strategy is LOWEST_COST_WITH_BID_CAP or COST_CAP. */
  bid_amount?: number;
  /** Meta: destination_type (WEBSITE, APP, MESSENGER, etc.). */
  destination_type?: string;
  /** Meta: promoted_object for conversions, app installs, etc. */
  promoted_object?: Record<string, unknown>;
  /** Meta: adset_schedule (delivery schedule). */
  adset_schedule?: Record<string, unknown>[];
  /** Meta: attribution_spec for conversion attribution. */
  attribution_spec?: Record<string, unknown>[];
  /** Meta: daily_spend_cap (cents). */
  daily_spend_cap?: number;
  /** Meta: lifetime_spend_cap (cents). */
  lifetime_spend_cap?: number;
  /** Meta: execution_options (e.g. validate_only). */
  execution_options?: string[];
  /** Any other Meta Creating params; forwarded to form body (values stringified). */
  meta_params?: Record<string, string | number | boolean | Record<string, unknown> | unknown[]>;
}

/** Fields allowed when updating an ad set (Meta Marketing API). */
export interface UpdateAdSetParams {
  name?: string;
  status?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  targeting?: any;
  optimization_goal?: string;
  billing_event?: string;
}

/**
 * Meta Ad Creating params. Maps to POST act_{id}/ads (form-encoded).
 * All Meta-documented Creating params supported: core below, plus optional and meta_params passthrough.
 * See docs/META_AD_CREATE.md for full parameter table.
 */
export interface CreateAdParams {
  name: string;
  adset_id: string;
  status: string;
  creative: any;
  /** Optional; domain where conversions are attributed (e.g. facebook.com). */
  conversion_domain?: string;
  /** Optional; ad-level schedule start (sales/app promotion campaigns). */
  ad_schedule_start_time?: string;
  /** Optional; ad-level schedule end. */
  ad_schedule_end_time?: string;
  /** Meta: ad labels. */
  adlabels?: string[] | Record<string, unknown>[];
  /** Meta: tracking_specs for conversion tracking. */
  tracking_specs?: Record<string, unknown>[];
  /** Meta: execution_options (e.g. validate_only, synchronous_ad_review). */
  execution_options?: string[];
  /** Any other Meta Creating params; forwarded to form body (values stringified). */
  meta_params?: Record<string, string | number | boolean | Record<string, unknown> | unknown[]>;
}

// Facebook API client class
/** Normalize ad account ID to numeric form (strip act_ prefix) for consistent URL building. */
function normalizeAdAccountId(adAccountId: string): string {
  return String(adAccountId).replace(/^act_/, '').trim();
}

export class FacebookAdsAPI {
  private accessToken: string;
  private adAccountId: string;

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken;
    this.adAccountId = normalizeAdAccountId(adAccountId);
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
    
    // Build query string for GET/DELETE or when params exist (e.g. access_token)
    if (method === 'GET' || method === 'DELETE' || Object.keys(params).length > 0) {
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

    const timeoutMs = 20000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Facebook API request failed:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request to Meta timed out. Please try again.');
      }
      if (error instanceof Error && error.message === 'fetch failed') {
        throw new Error('Network error contacting Meta. Check your connection and try again.');
      }
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
        fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining,special_ad_categories,buying_type'
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
          fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining,special_ad_categories,buying_type,bid_strategy'
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  /**
   * Create campaign. Uses form-encoded body because Meta Marketing API expects
   * application/x-www-form-urlencoded for POST, not JSON.
   * Meta Creating params: name, objective, status, special_ad_categories, buying_type,
   * daily_budget, lifetime_budget, start_time, end_time (see docs/META_CAMPAIGN_CREATE.md).
   */
  async createCampaign(params: CreateCampaignParams): Promise<FacebookCampaign> {
    const specialCategories = params.special_ad_categories ?? [];
    const formBody: Record<string, string> = {
      access_token: this.accessToken,
      name: params.name,
      objective: params.objective,
      status: params.status,
      special_ad_categories: JSON.stringify(specialCategories),
      buying_type: params.buying_type ?? 'AUCTION',
      is_adset_budget_sharing_enabled: '0',
    };
    if (params.daily_budget != null) formBody.daily_budget = String(Math.round(params.daily_budget * 100));
    if (params.lifetime_budget != null) formBody.lifetime_budget = String(Math.round(params.lifetime_budget * 100));
    if (params.start_time) formBody.start_time = params.start_time;
    if (params.end_time) formBody.end_time = params.end_time;
    if (params.spend_cap != null) formBody.spend_cap = String(Math.round(params.spend_cap * 100));
    if (params.adlabels != null && Array.isArray(params.adlabels)) formBody.adlabels = JSON.stringify(params.adlabels);
    if (params.bid_strategy != null) formBody.bid_strategy = params.bid_strategy;
    if (params.promoted_object != null) formBody.promoted_object = JSON.stringify(params.promoted_object);
    if (params.execution_options != null && params.execution_options.length > 0) formBody.execution_options = JSON.stringify(params.execution_options);
    if (params.meta_params != null) {
      for (const [k, v] of Object.entries(params.meta_params)) {
        if (v === undefined || v === null) continue;
        formBody[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }

    const url = `${FACEBOOK_BASE_URL}/act_${this.adAccountId}/campaigns`;
    const body = new URLSearchParams(formBody).toString();

    const timeoutMs = 20000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        const msg = (result as any).error?.message ?? `HTTP ${response.status}`;
        throw new Error(msg);
      }
      return result as FacebookCampaign;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request to Meta timed out. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Update campaign. Uses form-encoded POST to match Meta Marketing API.
   * Only writable fields: name, status, objective, daily_budget, lifetime_budget, special_ad_categories.
   * start_time/stop_time are read-only at campaign level in Meta.
   */
  async updateCampaign(campaignId: string, updates: Partial<CreateCampaignParams> & { special_ad_categories?: string[] }): Promise<{ success: boolean }> {
    const formBody: Record<string, string> = {
      access_token: this.accessToken,
    };
    if (updates.name != null) formBody.name = updates.name;
    if (updates.status != null) formBody.status = updates.status;
    if (updates.objective != null) formBody.objective = updates.objective;
    if (updates.daily_budget != null) formBody.daily_budget = String(Math.round(updates.daily_budget * 100));
    if (updates.lifetime_budget != null) formBody.lifetime_budget = String(Math.round(updates.lifetime_budget * 100));
    if (updates.special_ad_categories != null) formBody.special_ad_categories = JSON.stringify(updates.special_ad_categories);
    if (updates.buying_type != null) formBody.buying_type = updates.buying_type;

    const body = new URLSearchParams(formBody).toString();
    const url = `${FACEBOOK_BASE_URL}/${campaignId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = (await response.json()) as { error?: { message?: string; error_user_msg?: string; code?: number; error_subcode?: number } };
    if (!response.ok) {
      const err = result.error;
      const message =
        err?.error_user_msg ?? err?.message ?? `Update campaign failed: ${response.status}`;
      const e = new Error(message) as Error & { metaCode?: number; metaSubcode?: number; statusCode?: number };
      e.metaCode = err?.code;
      e.metaSubcode = err?.error_subcode;
      e.statusCode = response.status;
      throw e;
    }
    return { success: true };
  }

  /**
   * @brief Remove a campaign's budget (disable CBO) so ad sets can use their own budgets.
   * @param campaignId - Meta campaign ID.
   * @note Sends daily_budget=0 which clears the campaign-level budget on Meta.
   */
  async removeCampaignBudget(campaignId: string): Promise<void> {
    const formBody = new URLSearchParams({
      access_token: this.accessToken,
      daily_budget: '0',
    }).toString();
    const url = `${FACEBOOK_BASE_URL}/${campaignId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error((result as any)?.error?.message ?? `removeCampaignBudget failed: ${response.status}`);
    }
  }

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
    
    const response = await this.makeRequest<{ data?: FacebookAdSet[] }>(
      endpoint,
      'GET',
      {
        fields: 'id,name,campaign_id,status,created_time,updated_time,daily_budget,lifetime_budget,start_time,end_time,targeting,optimization_goal,billing_event'
      }
    );
    return Array.isArray(response?.data) ? response.data : [];
  }

  /**
   * Create ad set. Follows Meta Marketing API Creating spec:
   * https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets/
   * Required: name, campaign_id, targeting (countries), daily_budget OR lifetime_budget.
   * For daily_budget: use start_time + end_time (duration > 24h) OR end_time=0 for ongoing.
   */
  async createAdSet(params: CreateAdSetParams): Promise<FacebookAdSet> {
    const targeting =
      params.targeting && typeof params.targeting === 'object' && params.targeting !== null
        ? { ...META_DEFAULT_TARGETING, ...params.targeting }
        : { ...META_DEFAULT_TARGETING };
    if (!targeting.geo_locations?.countries?.length) {
      (targeting as Record<string, unknown>).geo_locations = { countries: ['US'] };
    }
    /** Meta requires bid_amount when bid_strategy is LOWEST_COST_WITH_BID_CAP, COST_CAP, or TARGET_COST. Only send bid_strategy when using a cap/target; otherwise omit so Meta defaults to lowest cost without cap. */
    const BID_STRATEGIES_REQUIRING_BID_AMOUNT = ['LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'TARGET_COST'];
    const requestedBidStrategy = params.bid_strategy ?? 'LOWEST_COST_WITHOUT_CAP';
    const hasBidAmount = params.bid_amount != null && params.bid_amount > 0;
    const useCapStrategy = BID_STRATEGIES_REQUIRING_BID_AMOUNT.includes(requestedBidStrategy) && hasBidAmount;

    const formBody: Record<string, string> = {
      access_token: this.accessToken,
      name: params.name,
      campaign_id: params.campaign_id,
      status: params.status,
      targeting: JSON.stringify(targeting),
      optimization_goal: params.optimization_goal || 'LINK_CLICKS',
      billing_event: params.billing_event || 'LINK_CLICKS',
      special_ad_categories: JSON.stringify(params.special_ad_categories ?? []),
    };
    if (useCapStrategy) {
      formBody.bid_strategy = requestedBidStrategy;
      formBody.bid_amount = String(Math.round(params.bid_amount!));
    }
    /* Do not send bid_strategy when using lowest cost without cap. Sending it can trigger Meta 2446404 "Billing Option Not Available" for new ad accounts. Omitting it lets Meta default to lowest cost. */
    if (params.destination_type != null) formBody.destination_type = params.destination_type;
    if (params.promoted_object != null) formBody.promoted_object = JSON.stringify(params.promoted_object);
    if (params.adset_schedule != null) formBody.adset_schedule = JSON.stringify(params.adset_schedule);
    if (params.attribution_spec != null) formBody.attribution_spec = JSON.stringify(params.attribution_spec);
    if (params.daily_spend_cap != null) formBody.daily_spend_cap = String(Math.round(params.daily_spend_cap));
    if (params.lifetime_spend_cap != null) formBody.lifetime_spend_cap = String(Math.round(params.lifetime_spend_cap));
    if (params.execution_options != null && params.execution_options.length > 0) formBody.execution_options = JSON.stringify(params.execution_options);
    if (params.meta_params != null) {
      for (const [k, v] of Object.entries(params.meta_params)) {
        if (v === undefined || v === null) continue;
        formBody[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }
    const isoWithTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)/;
    const hasStart = params.start_time != null && isoWithTz.test(String(params.start_time).trim());
    const hasEnd = params.end_time != null && String(params.end_time).trim() !== '' && isoWithTz.test(String(params.end_time).trim());
    const campaignHasBudget = params.campaign_has_budget === true;

    if (campaignHasBudget) {
      /* Campaign uses CBO budget — do NOT send ad set budget. Meta: "You can only set an ad set budget or a campaign budget." */
      if (hasStart) formBody.start_time = String(params.start_time).trim();
      if (hasEnd) formBody.end_time = String(params.end_time).trim();
    } else if (params.lifetime_budget != null && params.lifetime_budget > 0) {
      formBody.lifetime_budget = String(Math.round(params.lifetime_budget * 100));
      if (hasStart) formBody.start_time = String(params.start_time).trim();
      if (hasEnd) formBody.end_time = String(params.end_time).trim();
      else {
        const end = new Date();
        end.setDate(end.getDate() + 30);
        formBody.end_time = end.toISOString();
      }
    } else {
      const cents = Math.round((params.daily_budget ?? 10) * 100);
      formBody.daily_budget = String(Math.max(100, cents));
      if (hasStart && hasEnd) {
        formBody.start_time = String(params.start_time).trim();
        formBody.end_time = String(params.end_time).trim();
      } else {
        formBody.start_time = hasStart ? String(params.start_time).trim() : new Date().toISOString();
        formBody.end_time = hasEnd ? String(params.end_time).trim() : '0';
      }
    }

    /* Keep bid strategy and bid_amount set for non-cap case (LOWEST_COST_WITH_BID_CAP + high bid_amount). */

    const url = `${FACEBOOK_BASE_URL}/act_${this.adAccountId}/adsets`;
    const body = new URLSearchParams(formBody).toString();
    if (process.env.NODE_ENV === 'development') {
      console.log('[createAdSet] bid_strategy in request:', formBody.bid_strategy, 'bid_amount in request:', formBody.bid_amount ?? '(not set)');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const result = await response.json();
    if (!response.ok) {
      const err = (result as any)?.error;
      const message =
        err?.error_user_msg ||
        err?.message ||
        (err?.error_data ? `Meta error: ${JSON.stringify(err.error_data)}` : null) ||
        `Create ad set failed (${err?.code ?? response.status})`;
      console.error('Meta createAdSet error:', { status: response.status, code: err?.code, error: err, body: result });
      const e = new Error(message) as Error & { metaCode?: number; metaData?: unknown };
      e.metaCode = err?.code;
      e.metaData = err?.error_data ?? err;
      throw e;
    }
    // Meta often returns only { id } on create; fetch full ad set when needed
    const created = result as { id?: string; name?: string; campaign_id?: string; status?: string; created_time?: string };
    if (created.id && (created.name == null || created.campaign_id == null)) {
      const full = await this.getAdSet(created.id);
      if (full) return full;
    }
    return result as FacebookAdSet;
  }

  /** Get a single ad set by ID. */
  async getAdSet(adSetId: string): Promise<FacebookAdSet | null> {
    const response = await this.makeRequest<FacebookAdSet>(
      adSetId,
      'GET',
      {
        fields: 'id,name,campaign_id,status,created_time,updated_time,daily_budget,lifetime_budget,start_time,end_time,targeting,optimization_goal,billing_event'
      }
    );
    return response;
  }

  /** Update an ad set. Uses form-encoded body for Meta Marketing API. */
  async updateAdSet(adSetId: string, params: UpdateAdSetParams): Promise<FacebookAdSet> {
    const formBody: Record<string, string> = { access_token: this.accessToken };
    if (params.name != null) formBody.name = params.name;
    if (params.status != null) formBody.status = params.status;
    if (params.daily_budget != null) formBody.daily_budget = String(params.daily_budget * 100);
    if (params.lifetime_budget != null) formBody.lifetime_budget = String(params.lifetime_budget * 100);
    const isoWithTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)/;
    if (params.start_time != null && isoWithTz.test(String(params.start_time).trim())) formBody.start_time = String(params.start_time).trim();
    if (params.end_time != null) {
      const et = String(params.end_time).trim();
      if (et === '0') formBody.end_time = '0';
      else if (isoWithTz.test(et)) formBody.end_time = et;
    }
    if (params.targeting != null) formBody.targeting = typeof params.targeting === 'string' ? params.targeting : JSON.stringify(params.targeting);
    if (params.optimization_goal != null) formBody.optimization_goal = params.optimization_goal;
    if (params.billing_event != null) formBody.billing_event = params.billing_event;

    const url = `${FACEBOOK_BASE_URL}/${adSetId}`;
    const body = new URLSearchParams(formBody).toString();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error((result as { error?: { message?: string } })?.error?.message || `Update ad set failed: ${response.status}`);
    }
    return result as FacebookAdSet;
  }

  /** Delete an ad set. */
  async deleteAdSet(adSetId: string): Promise<void> {
    await this.makeRequest<{ success: boolean }>(adSetId, 'DELETE');
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

  /**
   * Upload image to ad account; returns hash for use in ad creative.
   * @param imageBuffer - Raw image bytes
   * @param filename - Must include extension (e.g. image.jpg)
   */
  async uploadAdImage(imageBuffer: Buffer, filename: string): Promise<{ hash: string }> {
    const form = new FormData();
    form.append('access_token', this.accessToken);
    form.append(filename, new Blob([new Uint8Array(imageBuffer)]), filename);
    const url = `${FACEBOOK_BASE_URL}/act_${this.adAccountId}/adimages`;
    const response = await fetch(url, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok) {
      throw new Error((result as any).error?.message || `Upload failed: ${response.status}`);
    }
    const images = (result as any).images;
    const entry = images?.[filename] || Object.values(images || {})[0];
    const hash = entry?.hash;
    if (!hash) throw new Error('No image hash in response');
    return { hash };
  }

  /**
   * Create ad creative (e.g. link ad with image). Requires page_id in object_story_spec.
   */
  async createAdCreative(params: { name?: string; object_story_spec: Record<string, unknown> }): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      name: params.name || 'Creative',
      object_story_spec: params.object_story_spec
    };
    const formBody = new URLSearchParams();
    formBody.set('access_token', this.accessToken);
    formBody.set('name', String(body.name));
    formBody.set('object_story_spec', JSON.stringify(body.object_story_spec));
    const url = `${FACEBOOK_BASE_URL}/act_${this.adAccountId}/adcreatives`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString()
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error((result as any).error?.message || `Create creative failed: ${response.status}`);
    }
    const id = (result as any).id;
    if (!id) throw new Error('No creative id in response');
    return { id };
  }

  /**
   * Create ad. Uses form-encoded body to match Meta Marketing API (same as campaigns/adsets).
   * Meta Creating params: name, adset_id, creative, status; optional conversion_domain, ad_schedule_*.
   * See docs/META_AD_CREATE.md.
   */
  async createAd(params: CreateAdParams): Promise<FacebookAd> {
    const creative =
      params.creative?.creative_id != null
        ? { creative_id: params.creative.creative_id }
        : params.creative;
    const formBody: Record<string, string> = {
      access_token: this.accessToken,
      name: params.name,
      adset_id: String(params.adset_id),
      status: params.status,
      creative: typeof creative === 'string' ? creative : JSON.stringify(creative ?? {}),
    };
    if (params.conversion_domain != null && params.conversion_domain.trim() !== '') {
      formBody.conversion_domain = params.conversion_domain.trim();
    }
    if (params.ad_schedule_start_time != null && params.ad_schedule_start_time.trim() !== '') {
      formBody.ad_schedule_start_time = params.ad_schedule_start_time.trim();
    }
    if (params.ad_schedule_end_time != null && params.ad_schedule_end_time.trim() !== '') {
      formBody.ad_schedule_end_time = params.ad_schedule_end_time.trim();
    }
    if (params.adlabels != null && Array.isArray(params.adlabels)) formBody.adlabels = JSON.stringify(params.adlabels);
    if (params.tracking_specs != null) formBody.tracking_specs = JSON.stringify(params.tracking_specs);
    if (params.execution_options != null && params.execution_options.length > 0) formBody.execution_options = JSON.stringify(params.execution_options);
    if (params.meta_params != null) {
      for (const [k, v] of Object.entries(params.meta_params)) {
        if (v === undefined || v === null) continue;
        formBody[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }
    const url = `${FACEBOOK_BASE_URL}/act_${this.adAccountId}/ads`;
    const body = new URLSearchParams(formBody).toString();
    const timeoutMs = 20000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      if (!response.ok) {
        const msg = (result as any).error?.message ?? `HTTP ${response.status}`;
        throw new Error(msg);
      }
      return result as FacebookAd;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request to Meta timed out. Please try again.');
      }
      throw error;
    }
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

  // Get custom audiences (Meta fields: id, name, description, subtype, approximate_count, data_source, time_created)
  async getCustomAudiences(): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>(
      `act_${this.adAccountId}/customaudiences`,
      'GET',
      { fields: 'id,name,description,subtype,approximate_count,data_source,time_created' }
    );
    return response.data;
  }

  /** Delete a custom audience by ID. */
  async deleteCustomAudience(audienceId: string): Promise<{ success: boolean }> {
    await this.makeRequest<{ success: boolean }>(audienceId, 'DELETE');
    return { success: true };
  }
}

/** Cookie name for Facebook access token (httpOnly on server). Do not store token in localStorage. */
export const FACEBOOK_TOKEN_COOKIE_NAME = 'facebook_access_token';

/** Cookie name for selected ad account ID (set after OAuth if FACEBOOK_AD_ACCOUNT_ID not in env). */
export const FACEBOOK_AD_ACCOUNT_COOKIE_NAME = 'facebook_ad_account_id';

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
  adAccountId: string | null | undefined,
  getToken?: () => string | null
): FacebookAdsAPI | null {
  const token = getToken ? getToken() : getStoredFacebookToken();
  if (!token) {
    return null;
  }
  const raw = String(adAccountId ?? "").trim();
  if (!raw) {
    return null;
  }
  return new FacebookAdsAPI(token, normalizeAdAccountId(raw));
}

/**
 * @brief Builds a client with only a user token — for Graph `me/*` calls (e.g. list ad accounts).
 * @param getToken Returns the Meta user access token.
 * @returns API instance or null if no token. Ad account id is a placeholder and must not be used for `act_*` calls.
 */
export function createFacebookAPITokenOnly(
  getToken: () => string | null
): FacebookAdsAPI | null {
  const token = getToken();
  if (!token?.trim()) {
    return null;
  }
  return new FacebookAdsAPI(token, "0");
}

/**
 * Campaign objectives allowed by Meta Marketing API for campaign creation.
 * Only OUTCOME_* objectives are currently accepted; legacy (e.g. LINK_CLICKS) are invalid.
 */
export const CAMPAIGN_OBJECTIVES = {
  OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Sales',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_APP_PROMOTION: 'App promotion',
} as const;

// Campaign status mapping
export const CAMPAIGN_STATUS = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  DELETED: 'Deleted',
  ARCHIVED: 'Archived',
} as const;

/** Meta special ad categories (required on create; use [] for none). */
export const SPECIAL_AD_CATEGORIES = {
  NONE: 'None',
  HOUSING: 'Housing',
  EMPLOYMENT: 'Employment',
  FINANCIAL_PRODUCTS_SERVICES: 'Financial products & services',
  ISSUES_ELECTIONS_POLITICS: 'Issues, elections or politics',
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