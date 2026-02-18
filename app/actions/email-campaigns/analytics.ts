"use server";

import { createClient } from '@/utils/supabase/server';

/** Shape of campaign row for analytics (DB columns may differ from generated types) */
interface CampaignAnalyticsRow {
  id: string;
  name: string;
  status: string | null;
  emails_sent?: number;
  emails_delivered?: number;
  emails_opened?: number;
  emails_clicked?: number;
  emails_bounced?: number;
  sent_at: string | null;
}

export interface GetAnalyticsParams {
  timeRange?: string;
  campaignType?: string;
}

/** Return type of getAnalytics; exported as GetAnalyticsResponse from index. */
export type GetAnalyticsResponse = AnalyticsData;

export interface AnalyticsData {
  success: boolean;
  data: {
    summary: {
      totalSent: number;
      totalDelivered: number;
      totalOpened: number;
      totalClicked: number;
      totalBounced: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
      activeSubscribers: number;
    };
    campaigns: Array<{
      id: string;
      name: string;
      type: string;
      status: string | null;
      sent: number;
      delivered: number;
      opens: number;
      clicks: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
      sentAt: string | null;
    }>;
  };
}

/**
 * Get email campaign analytics (admin only)
 */
export async function getAnalytics(
  params?: GetAnalyticsParams
): Promise<AnalyticsData> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    const timeRange = params?.timeRange || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch campaign analytics
    const { data: campaigns, error: campaignsError } = await supabase
      .from('email_campaigns')
      .select(`
        id,
        name,
        status,
        emails_sent,
        emails_delivered,
        emails_opened,
        emails_clicked,
        emails_bounced,
        total_recipients,
        sent_at,
        created_at
      `)
      .gte('created_at', startDate.toISOString())
      .order('sent_at', { ascending: false, nullsFirst: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw new Error('Failed to fetch campaigns');
    }

    const campaignsList = (campaigns ?? null) as unknown as CampaignAnalyticsRow[] | null;

    // Calculate overall metrics
    const totalSent =
      campaignsList?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0;
    const totalDelivered =
      campaignsList?.reduce((sum, c) => sum + (c.emails_delivered || 0), 0) || 0;
    const totalOpened =
      campaignsList?.reduce((sum, c) => sum + (c.emails_opened || 0), 0) || 0;
    const totalClicked =
      campaignsList?.reduce((sum, c) => sum + (c.emails_clicked || 0), 0) || 0;
    const totalBounced =
      campaignsList?.reduce((sum, c) => sum + (c.emails_bounced || 0), 0) || 0;

    // Calculate rates
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    // Get subscriber count
    const { count: activeSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Format campaign data
    const formattedCampaigns =
      campaignsList?.map((campaign) => {
        const emailsSent = campaign.emails_sent || 0;
        return {
          id: campaign.id,
          name: campaign.name,
          type: 'Campaign',
          status: campaign.status,
          sent: emailsSent,
          delivered: campaign.emails_delivered || 0,
          opens: campaign.emails_opened || 0,
          clicks: campaign.emails_clicked || 0,
          openRate:
            emailsSent > 0
              ? ((campaign.emails_opened || 0) / emailsSent) * 100
              : 0,
          clickRate:
            emailsSent > 0
              ? ((campaign.emails_clicked || 0) / emailsSent) * 100
              : 0,
          bounceRate:
            emailsSent > 0
              ? ((campaign.emails_bounced || 0) / emailsSent) * 100
              : 0,
          sentAt: campaign.sent_at,
        };
      }) || [];

    return {
      success: true,
      data: {
        summary: {
          totalSent,
          totalDelivered,
          totalOpened,
          totalClicked,
          totalBounced,
          openRate,
          clickRate,
          bounceRate,
          activeSubscribers: activeSubscribers || 0,
        },
        campaigns: formattedCampaigns,
      },
    };
  } catch (error) {
    console.error('Error in getAnalytics:', error);
    throw error;
  }
}

