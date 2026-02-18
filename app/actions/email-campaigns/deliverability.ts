"use server";

import { createClient } from '@/utils/supabase/server';

interface CampaignDeliverabilityRow {
  id: string;
  name: string;
  emails_sent?: number;
  emails_delivered?: number;
  emails_bounced?: number;
}

interface EmailSendRow {
  email?: string;
  status?: string;
  sent_at?: string | null;
  bounce_reason?: string | null;
  bounced_at?: string | null;
  campaign_id?: string | null;
}

export interface DeliverabilityData {
  domains: Array<{
    domain: string;
    sent: number;
    delivered: number;
    bounced: number;
    deliveredRate: number;
    bounceRate: number;
  }>;
  bounces: Array<{
    email: string;
    domain: string;
    reason: string;
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
  };
}

/**
 * Get email deliverability data (admin only)
 */
export async function getDeliverability(): Promise<DeliverabilityData> {
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    // Get overall campaign statistics
    const { data: campaigns, error: campaignsError } = await supabase
      .from('email_campaigns')
      .select(`
        id,
        name,
        status,
        emails_sent,
        emails_delivered,
        emails_bounced,
        total_recipients,
        sent_at,
        created_at
      `)
      .not('emails_sent', 'is', null)
      .gt('emails_sent', 0);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw new Error('Failed to fetch campaigns');
    }

    const campaignsList = (campaigns ?? null) as unknown as CampaignDeliverabilityRow[] | null;

    // Get subscriber data for domain analysis
    const { data: subscribers, error: subscribersError } = await supabase
      .from('subscribers')
      .select('email, status')
      .eq('status', 'active');

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      throw new Error('Failed to fetch subscribers');
    }

    // Get email sends for more detailed tracking
    const { data: emailSends, error: sendsError } = await supabase
      .from('email_sends')
      .select('email, status, sent_at, bounce_reason, bounced_at, campaign_id')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1000); // Limit to recent sends

    if (sendsError) {
      console.error('Error fetching email sends:', sendsError);
      // Continue without email sends data
    }

    // Calculate overall metrics
    const totalSent =
      campaignsList?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0;
    const totalDelivered =
      campaignsList?.reduce((sum, c) => sum + (c.emails_delivered || 0), 0) || 0;
    const totalBounced =
      campaignsList?.reduce((sum, c) => sum + (c.emails_bounced || 0), 0) || 0;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    // Analyze by domain
    const domainStats = new Map<string, { sent: number; delivered: number; bounced: number }>();

    // Extract domains from subscribers
    subscribers?.forEach((subscriber) => {
      if (subscriber.email) {
        const domain = subscriber.email.split('@')[1];
        if (domain) {
          const current = domainStats.get(domain) || { sent: 0, delivered: 0, bounced: 0 };
          current.sent += 1; // Approximate - would need actual send data
          current.delivered += 1; // Approximate
          domainStats.set(domain, current);
        }
      }
    });

    const sendsList = (emailSends ?? null) as EmailSendRow[] | null;

    // Process email sends for more accurate domain stats
    sendsList?.forEach((send) => {
      if (send.email) {
        const domain = send.email.split('@')[1];
        if (domain) {
          const current = domainStats.get(domain) || { sent: 0, delivered: 0, bounced: 0 };
          current.sent += 1;
          if (send.status === 'delivered') {
            current.delivered += 1;
          } else if (send.status === 'bounced') {
            current.bounced += 1;
          }
          domainStats.set(domain, current);
        }
      }
    });

    // Convert domain stats to array format
    const domains = Array.from(domainStats.entries()).map(([domain, stats]) => {
      const total = stats.sent || 1; // Avoid division by zero
      return {
        domain,
        sent: stats.sent,
        delivered: stats.delivered,
        bounced: stats.bounced,
        deliveredRate: total > 0 ? (stats.delivered / total) * 100 : 0,
        bounceRate: total > 0 ? (stats.bounced / total) * 100 : 0,
      };
    });

    // Get bounce details
    const bounces: Array<{
      email: string;
      domain: string;
      reason: string;
      bouncedAt: string;
      campaignId: string | null;
      campaignName: string | null;
    }> = [];

    sendsList?.forEach((send) => {
      if (send.status === 'bounced' && send.bounced_at) {
        const email = send.email || '';
        const domain = email.split('@')[1] || 'unknown';
        const campaign = campaignsList?.find((c) => c.id === send.campaign_id);
        bounces.push({
          email,
          domain,
          reason: send.bounce_reason || 'Unknown reason',
          bouncedAt: send.bounced_at,
          campaignId: send.campaign_id || null,
          campaignName: campaign?.name || null,
        });
      }
    });

    // Sort domains by sent count (descending)
    domains.sort((a, b) => b.sent - a.sent);

    // Sort bounces by date (most recent first)
    bounces.sort((a, b) => new Date(b.bouncedAt).getTime() - new Date(a.bouncedAt).getTime());

    return {
      domains: domains.slice(0, 50), // Top 50 domains
      bounces: bounces.slice(0, 100), // Most recent 100 bounces
      overall: {
        totalSent,
        totalDelivered,
        totalBounced,
        deliveryRate,
        bounceRate,
      },
    };
  } catch (error) {
    console.error('Error in getDeliverability:', error);
    throw error;
  }
}

