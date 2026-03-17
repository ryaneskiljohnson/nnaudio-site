"use server";

import { createClient } from "@/utils/supabase/server";

interface CampaignDeliverabilityRow {
  id: string;
  name: string;
  emails_sent?: number;
  emails_delivered?: number;
  emails_bounced?: number;
  emails_spam?: number;
}

interface EmailSendRow {
  email?: string;
  status?: string;
  sent_at?: string | null;
  campaign_id?: string | null;
}

interface EmailBounceRow {
  bounce_reason?: string | null;
  bounce_type?: string | null;
  bounced_at?: string | null;
  campaign_id?: string | null;
  subscriber_id?: string | null;
}

interface SubscriberRow {
  id?: string;
  email?: string;
}

interface WebhookLogRow {
  event_type?: string;
  campaign_id?: string | null;
}

interface DomainReputationRow {
  domain: string;
  reputation_score?: number | null;
  is_blacklisted?: boolean | null;
  last_checked_at?: string | null;
  spf_status?: string | null;
  dkim_status?: string | null;
  dmarc_status?: string | null;
}

export interface DeliverabilityData {
  domains: Array<{
    domain: string;
    sent: number;
    delivered: number;
    bounced: number;
    deliveredRate: number;
    bounceRate: number;
    spam: number;
    blocked: number;
    reputation: number;
    lastChecked: string | null;
    authentication: {
      spf: string | null;
      dkim: string | null;
      dmarc: string | null;
    };
  }>;
  bounces: Array<{
    email: string;
    domain: string;
    reason: string;
    type: string;
    bouncedAt: string;
    campaignId: string | null;
    campaignName: string | null;
  }>;
  overall: {
    totalSent: number;
    totalDelivered: number;
    totalBounced: number;
    deliveryRate: number;
    bounceRate: number;
    totalSpam: number;
    spamRate: number;
    reputationScore: number;
  };
}

/**
 * Get email deliverability data (admin only)
 */
export async function getDeliverability(): Promise<DeliverabilityData> {
  try {
    const supabase = await createClient();

    const { data: campaigns, error: campaignsError } = await supabase
      .from("email_campaigns")
      .select(`
        id,
        name,
        emails_sent,
        emails_delivered,
        emails_bounced,
        emails_spam
      `)
      .not("emails_sent", "is", null)
      .gt("emails_sent", 0);

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      throw new Error("Failed to fetch campaigns");
    }

    const [
      emailSendsResult,
      emailBouncesResult,
      domainReputationResult,
      webhookLogsResult,
      subscribersResult,
    ] = await Promise.all([
      supabase
        .from("email_sends")
        .select("email, status, sent_at, campaign_id")
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(2000),
      supabase
        .from("email_bounces")
        .select("bounce_reason, bounce_type, bounced_at, campaign_id, subscriber_id")
        .not("bounced_at", "is", null)
        .order("bounced_at", { ascending: false })
        .limit(500),
      supabase
        .from("email_domain_reputation")
        .select(
          "domain, reputation_score, is_blacklisted, last_checked_at, spf_status, dkim_status, dmarc_status"
        ),
      supabase
        .from("email_webhook_logs")
        .select("event_type, campaign_id")
        .limit(2000),
      supabase
        .from("subscribers")
        .select("id, email")
        .not("email", "is", null),
    ]);

    if (emailSendsResult.error) {
      console.error("Error fetching email sends:", emailSendsResult.error);
    }
    if (emailBouncesResult.error) {
      console.error("Error fetching email bounces:", emailBouncesResult.error);
    }
    if (domainReputationResult.error) {
      console.error(
        "Error fetching domain reputation:",
        domainReputationResult.error
      );
    }
    if (webhookLogsResult.error) {
      console.error("Error fetching webhook logs:", webhookLogsResult.error);
    }
    if (subscribersResult.error) {
      console.error("Error fetching subscribers:", subscribersResult.error);
    }

    const campaignsList =
      ((campaigns ?? []) as unknown as CampaignDeliverabilityRow[]) || [];
    const sendsList =
      ((emailSendsResult.data ?? []) as unknown as EmailSendRow[]) || [];
    const bounceList =
      ((emailBouncesResult.data ?? []) as unknown as EmailBounceRow[]) || [];
    const domainReputationRows =
      ((domainReputationResult.data ?? []) as unknown as DomainReputationRow[]) ||
      [];
    const webhookLogs =
      ((webhookLogsResult.data ?? []) as unknown as WebhookLogRow[]) || [];
    const subscribers =
      ((subscribersResult.data ?? []) as unknown as SubscriberRow[]) || [];

    const totalSent = campaignsList.reduce(
      (sum, campaign) => sum + (campaign.emails_sent || 0),
      0
    );
    const totalDelivered = campaignsList.reduce(
      (sum, campaign) => sum + (campaign.emails_delivered || 0),
      0
    );
    const totalBounced = campaignsList.reduce(
      (sum, campaign) => sum + (campaign.emails_bounced || 0),
      0
    );
    const totalSpam = campaignsList.reduce(
      (sum, campaign) => sum + (campaign.emails_spam || 0),
      0
    );

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const spamRate = totalSent > 0 ? (totalSpam / totalSent) * 100 : 0;

    const subscriberEmailById = new Map<string, string>();
    for (const subscriber of subscribers) {
      if (subscriber.id && subscriber.email) {
        subscriberEmailById.set(subscriber.id, subscriber.email);
      }
    }

    const domainStats = new Map<
      string,
      {
        sent: number;
        delivered: number;
        bounced: number;
        spam: number;
        blocked: number;
        lastChecked: string | null;
      }
    >();

    for (const send of sendsList) {
      if (!send.email) continue;
      const domain = send.email.split("@")[1];
      if (!domain) continue;

      const current = domainStats.get(domain) || {
        sent: 0,
        delivered: 0,
        bounced: 0,
        spam: 0,
        blocked: 0,
        lastChecked: send.sent_at || null,
      };

      current.sent += 1;
      if (send.status === "delivered" || send.status === "sent") {
        current.delivered += 1;
      }
      if (!current.lastChecked || (send.sent_at && send.sent_at > current.lastChecked)) {
        current.lastChecked = send.sent_at || null;
      }

      domainStats.set(domain, current);
    }

    for (const bounce of bounceList) {
      const email = bounce.subscriber_id
        ? subscriberEmailById.get(bounce.subscriber_id)
        : undefined;
      const domain = email?.split("@")[1];
      if (!domain) continue;

      const current = domainStats.get(domain) || {
        sent: 0,
        delivered: 0,
        bounced: 0,
        spam: 0,
        blocked: 0,
        lastChecked: bounce.bounced_at || null,
      };

      current.bounced += 1;
      if (
        bounce.bounce_type?.toLowerCase() === "blocked" ||
        bounce.bounce_reason?.toLowerCase().includes("blocked")
      ) {
        current.blocked += 1;
      }
      if (
        !current.lastChecked ||
        (bounce.bounced_at && bounce.bounced_at > current.lastChecked)
      ) {
        current.lastChecked = bounce.bounced_at || null;
      }
      domainStats.set(domain, current);
    }

    const reputationMap = new Map(
      domainReputationRows.map((row) => [row.domain, row])
    );

    const domains = Array.from(domainStats.entries()).map(([domain, stats]) => {
      const total = Math.max(stats.sent, 1);
      const domainReputation = reputationMap.get(domain);
      const deliveredRate = (stats.delivered / total) * 100;
      const domainBounceRate = (stats.bounced / total) * 100;
      const derivedReputation = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            domainReputation?.reputation_score ??
              deliveredRate - domainBounceRate * 2 - stats.blocked * 5
          )
        )
      );

      return {
        domain,
        sent: stats.sent,
        delivered: stats.delivered,
        bounced: stats.bounced,
        deliveredRate,
        bounceRate: domainBounceRate,
        spam: stats.spam,
        blocked: stats.blocked,
        reputation: derivedReputation,
        lastChecked: domainReputation?.last_checked_at || stats.lastChecked,
        authentication: {
          spf: domainReputation?.spf_status || null,
          dkim: domainReputation?.dkim_status || null,
          dmarc: domainReputation?.dmarc_status || null,
        },
      };
    });

    const bounces = bounceList.map((bounce) => {
      const email = bounce.subscriber_id
        ? subscriberEmailById.get(bounce.subscriber_id) || ""
        : "";
      const domain = email.split("@")[1] || "unknown";
      const campaign = campaignsList.find((c) => c.id === bounce.campaign_id);
      return {
        email,
        domain,
        reason: bounce.bounce_reason || "Unknown reason",
        type: bounce.bounce_type || "unknown",
        bouncedAt: bounce.bounced_at || "",
        campaignId: bounce.campaign_id || null,
        campaignName: campaign?.name || null,
      };
    });

    domains.sort((a, b) => b.sent - a.sent);
    bounces.sort(
      (a, b) => new Date(b.bouncedAt).getTime() - new Date(a.bouncedAt).getTime()
    );

    const averageReputation =
      domains.length > 0
        ? domains.reduce((sum, domain) => sum + domain.reputation, 0) /
          domains.length
        : deliveryRate;

    return {
      domains: domains.slice(0, 50),
      bounces: bounces.slice(0, 100),
      overall: {
        totalSent,
        totalDelivered,
        totalBounced,
        deliveryRate,
        bounceRate,
        totalSpam,
        spamRate,
        reputationScore: averageReputation,
      },
    };
  } catch (error) {
    console.error("Error in getDeliverability:", error);
    throw error;
  }
}

