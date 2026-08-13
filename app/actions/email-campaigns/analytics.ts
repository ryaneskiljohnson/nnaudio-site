/**
 * @fileoverview Email analytics actions used by the admin performance and
 * growth dashboard surfaces.
 * @module app/actions/email-campaigns/analytics
 */

"use server";

import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { requireAdminAction } from "@/utils/auth/action-guards";

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

interface EmailOpenRow {
  user_agent: string | null;
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
      totalUnsubscribes: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
      unsubscribeRate: number;
      activeSubscribers: number;
    };
    trends: {
      openRateChange: number;
      clickRateChange: number;
      unsubscribeRateChange: number;
      bounceRateChange: number;
    };
    devices: {
      mobile: number;
      desktop: number;
      tablet: number;
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
      unsubscribes: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
      sentAt: string | null;
    }>;
  };
}

/**
 * @brief Maps time range input to a day count.
 * @param timeRange - Selected admin time range.
 * @returns Number of days in the current reporting window.
 */
function getRangeDays(timeRange: string): number {
  switch (timeRange) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    case "1y":
      return 365;
    default:
      return 30;
  }
}

/**
 * @brief Classifies a user agent into a rough device bucket.
 * @param userAgent - Email-open user agent string.
 * @returns Device type for admin reporting.
 */
function classifyDevice(userAgent: string | null): "mobile" | "desktop" | "tablet" {
  const normalized = (userAgent || "").toLowerCase();

  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return "tablet";
  }

  if (
    normalized.includes("iphone") ||
    normalized.includes("android") ||
    normalized.includes("mobile")
  ) {
    return "mobile";
  }

  return "desktop";
}

/**
 * @brief Calculates a rate safely.
 * @param numerator - Value being measured.
 * @param denominator - Population size.
 * @returns Percentage rate.
 */
function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

/**
 * @brief Calculates period-over-period change.
 * @param current - Current period rate.
 * @param previous - Previous period rate.
 * @returns Delta in percentage points.
 */
function rateChange(current: number, previous: number): number {
  return Number((current - previous).toFixed(2));
}

/**
 * Get email campaign analytics (admin only)
 */
export async function getAnalytics(
  params?: GetAnalyticsParams
): Promise<AnalyticsData> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const timeRange = params?.timeRange || "30d";
    const days = getRangeDays(timeRange);
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(
      currentStart.getTime() - days * 24 * 60 * 60 * 1000
    );

    const { data: campaigns, error: campaignsError } = await supabase
      .from("email_campaigns")
      .select(
        `
        id,
        name,
        status,
        emails_sent,
        emails_delivered,
        emails_opened,
        emails_clicked,
        emails_bounced,
        sent_at,
        created_at
      `
      )
      .gte("created_at", previousStart.toISOString())
      .order("sent_at", { ascending: false, nullsFirst: false });

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      throw new Error("Failed to fetch campaigns");
    }

    const campaignsList =
      ((campaigns ?? []) as unknown as CampaignAnalyticsRow[]) || [];
    const currentCampaigns = campaignsList.filter((campaign) => {
      const createdAt = campaign.sent_at || "";
      return createdAt >= currentStart.toISOString();
    });
    const previousCampaigns = campaignsList.filter((campaign) => {
      const createdAt = campaign.sent_at || "";
      return createdAt >= previousStart.toISOString() && createdAt < currentStart.toISOString();
    });

    const [
      activeSubscribersResult,
      currentUnsubscribesResult,
      previousUnsubscribesResult,
      emailOpensResult,
      unsubscribeRowsResult,
    ] = await Promise.all([
      supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("email_unsubscribes")
        .select("id", { count: "exact", head: true })
        .gte("unsubscribed_at", currentStart.toISOString()),
      supabase
        .from("email_unsubscribes")
        .select("id", { count: "exact", head: true })
        .gte("unsubscribed_at", previousStart.toISOString())
        .lt("unsubscribed_at", currentStart.toISOString()),
      supabase
        .from("email_opens")
        .select("user_agent")
        .gte("opened_at", currentStart.toISOString()),
      supabase
        .from("email_unsubscribes")
        .select("campaign_id, unsubscribed_at")
        .gte("unsubscribed_at", currentStart.toISOString()),
    ]);

    const buildSummary = (
      campaignRows: CampaignAnalyticsRow[],
      totalUnsubscribes: number
    ) => {
      const totalSent = campaignRows.reduce(
        (sum, campaign) => sum + (campaign.emails_sent || 0),
        0
      );
      const totalDelivered = campaignRows.reduce(
        (sum, campaign) => sum + (campaign.emails_delivered || 0),
        0
      );
      const totalOpened = campaignRows.reduce(
        (sum, campaign) => sum + (campaign.emails_opened || 0),
        0
      );
      const totalClicked = campaignRows.reduce(
        (sum, campaign) => sum + (campaign.emails_clicked || 0),
        0
      );
      const totalBounced = campaignRows.reduce(
        (sum, campaign) => sum + (campaign.emails_bounced || 0),
        0
      );

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribes,
        openRate: safeRate(totalOpened, totalSent),
        clickRate: safeRate(totalClicked, totalSent),
        bounceRate: safeRate(totalBounced, totalSent),
        unsubscribeRate: safeRate(totalUnsubscribes, totalSent),
      };
    };

    const currentSummary = buildSummary(
      currentCampaigns,
      currentUnsubscribesResult.count || 0
    );
    const previousSummary = buildSummary(
      previousCampaigns,
      previousUnsubscribesResult.count || 0
    );

    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
    const opens = ((emailOpensResult.data ?? []) as EmailOpenRow[]) || [];
    for (const open of opens) {
      deviceCounts[classifyDevice(open.user_agent)] += 1;
    }
    const totalTrackedOpens = Math.max(opens.length, 1);

    const formattedCampaigns = currentCampaigns.map((campaign) => {
      const unsubscribes =
        (unsubscribeRowsResult.data || []).filter(
          (unsubscribe) => unsubscribe.campaign_id === campaign.id
        ).length || 0;
      const emailsSent = campaign.emails_sent || 0;
      return {
        id: campaign.id,
        name: campaign.name,
        type: "Campaign",
        status: campaign.status,
        sent: emailsSent,
        delivered: campaign.emails_delivered || 0,
        opens: campaign.emails_opened || 0,
        clicks: campaign.emails_clicked || 0,
        unsubscribes,
        openRate: safeRate(campaign.emails_opened || 0, emailsSent),
        clickRate: safeRate(campaign.emails_clicked || 0, emailsSent),
        bounceRate: safeRate(campaign.emails_bounced || 0, emailsSent),
        sentAt: campaign.sent_at,
      };
    });

    return {
      success: true,
      data: {
        summary: {
          ...currentSummary,
          activeSubscribers: activeSubscribersResult.count || 0,
        },
        trends: {
          openRateChange: rateChange(
            currentSummary.openRate,
            previousSummary.openRate
          ),
          clickRateChange: rateChange(
            currentSummary.clickRate,
            previousSummary.clickRate
          ),
          unsubscribeRateChange: rateChange(
            currentSummary.unsubscribeRate,
            previousSummary.unsubscribeRate
          ),
          bounceRateChange: rateChange(
            currentSummary.bounceRate,
            previousSummary.bounceRate
          ),
        },
        devices: {
          mobile: Number(
            safeRate(deviceCounts.mobile, totalTrackedOpens).toFixed(1)
          ),
          desktop: Number(
            safeRate(deviceCounts.desktop, totalTrackedOpens).toFixed(1)
          ),
          tablet: Number(
            safeRate(deviceCounts.tablet, totalTrackedOpens).toFixed(1)
          ),
        },
        campaigns: formattedCampaigns,
      },
    };
  } catch (error) {
    console.error("Error in getAnalytics:", error);
    throw error;
  }
}

