"use server";

import { unstable_cache } from "next/cache";
import { requireAdminAction } from "@/utils/auth/action-guards";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { getNormalizedEmailsWithUltimateBundleProductGrants } from "@/lib/ultimate-elite-bundles";
import { SubscriptionType } from "@/utils/supabase/types";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/client";
import {
  emailFromStripeCharge,
  isPaidStripeCharge,
  stripeCustomerIdFromCharge,
} from "@/utils/stripe/paid-charge";
import { attributeSpendToUsers } from "@/utils/crm/attribute-spend";
import { countActiveOwnedProducts } from "@/utils/crm/owned-product-count";
import {
  emailIlikeOrClause,
  sanitizeCrmSearchTerm,
} from "@/utils/crm/escape-search";
import { holdQuery } from "@/utils/crm/hold-query";
import {
  isDerivedCrmSortField,
  sortCrmProfileKeys,
  type CrmProfileSortExtras,
  type CrmProfileSortKey,
} from "@/utils/crm/sort-profile-keys";
import {
  canPageFromSpendersOnly,
  customerIdsRankedBySpend,
  idsRankedByText,
  sliceRankedPage,
} from "@/utils/crm/total-spent-page";
import { chunkIds, fetchAllRangedRows } from "@/utils/supabase/in-chunks";

/** Cache window for the paying-customer Stripe spend index. */
const PAYING_CUSTOMER_CACHE_SECONDS = 120;
/** Safety cap: 500 pages × 100 charges (walk stops earlier when Stripe is done). */
const MAX_PAYING_CHARGE_PAGES = 500;

export interface AdminDashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  lifetimeRevenue: number;
  totalCustomers: number;
  freeUsers: number;
  monthlySubscribers: number;
  annualSubscribers: number;
  lifetimeCustomers: number;
  adminUsers: number;
  trialUsers: number;
  churnRate: number;
  recentActivity: AdminActivity[];
}

export interface AdminActivity {
  id: string;
  type: "subscription" | "payment" | "user_signup" | "cancellation";
  description: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
}

export interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscription: string;
  customerId?: string;
  subscriptionExpiration?: string;
  trialExpiration?: string;
  createdAt: string;
  lastActive?: string;
  totalSpent: number;
  /** Number of paid orders (Stripe charges). -1 while loading. */
  orderCount?: number;
  /** Catalog products the user owns. -1 while loading. */
  productCount?: number;
  hasNfr?: boolean;
  /** True when user_management NFR applies and they have a grant for a product in an ultimate bundle. */
  hasNfrEliteBundle?: boolean;
  /** First dashboard click for NNAudio Access macOS installer (ISO string). */
  nnaudioAccessInstallerMacosAt?: string | null;
  /** First dashboard click for NNAudio Access Windows installer (ISO string). */
  nnaudioAccessInstallerWindowsAt?: string | null;
}

export interface DetailedUserData extends UserData {
  subscriptions: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    priceId: string;
    amount: number;
    interval: string;
  }[];
  purchases: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    description: string;
  }[];
  invoices: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    dueDate: string | null;
    description: string;
  }[];
}

/**
 * Fetches comprehensive admin dashboard statistics
 * @deprecated Use individual stat functions instead for better performance
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    // Get all users from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const totalUsers = profiles?.length || 0;

    // Count subscription types
    const subscriptionCounts =
      profiles?.reduce((acc, profile) => {
        const sub = profile.subscription || "none";
        acc[sub] = (acc[sub] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const freeUsers = subscriptionCounts.none || 0;
    const monthlySubscribers = subscriptionCounts.monthly || 0;
    const annualSubscribers = subscriptionCounts.annual || 0;
    const lifetimeCustomers = subscriptionCounts.lifetime || 0;
    const adminUsers = subscriptionCounts.admin || 0;

    // Count trial users (those with trial_expiration but no active subscription)
    const trialUsers =
      profiles?.filter(
        (p) =>
          p.trial_expiration &&
          new Date(p.trial_expiration) > new Date() &&
          p.subscription === "none"
      ).length || 0;

    const activeSubscriptions = monthlySubscribers + annualSubscribers;

    let monthlyRevenue = 0;
    let lifetimeRevenue = 0;
    try {
      monthlyRevenue = await getMonthlyRevenue();
    } catch (e) {
      console.error("getAdminDashboardStats: getMonthlyRevenue failed", e);
    }
    try {
      lifetimeRevenue = await getLifetimeRevenue();
    } catch (e) {
      console.error("getAdminDashboardStats: getLifetimeRevenue failed", e);
    }

    /** @note Stripe cancellation-based churn not aggregated here yet */
    const churnRate = 0;

    // Get recent activity
    const recentActivity = await getRecentActivity();

    // Get total customers (using total users as proxy)
    const totalCustomers = totalUsers;

    return {
      totalUsers,
      activeSubscriptions,
      monthlyRevenue,
      lifetimeRevenue,
      totalCustomers,
      freeUsers,
      monthlySubscribers,
      annualSubscribers,
      lifetimeCustomers,
      adminUsers,
      trialUsers,
      churnRate,
      recentActivity,
    };
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    throw error;
  }
}

/**
 * Fetches total users count and breakdown
 */
export async function getTotalUsers(): Promise<{
  totalUsers: number;
  freeUsers: number;
  activeSubscriptions: number;
}> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("subscription");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const totalUsers = profiles?.length || 0;

    const subscriptionCounts =
      profiles?.reduce((acc, profile) => {
        const sub = profile.subscription || "none";
        acc[sub] = (acc[sub] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const freeUsers = subscriptionCounts.none || 0;
    const monthlySubscribers = subscriptionCounts.monthly || 0;
    const annualSubscribers = subscriptionCounts.annual || 0;
    const activeSubscriptions = monthlySubscribers + annualSubscribers;

    return {
      totalUsers,
      freeUsers,
      activeSubscriptions,
    };
  } catch (error) {
    console.error("Error fetching total users:", error);
    throw error;
  }
}

/**
 * Fetches active subscriptions breakdown
 */
export async function getActiveSubscriptions(): Promise<{
  activeSubscriptions: number;
  monthlySubscribers: number;
  annualSubscribers: number;
}> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("subscription");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const subscriptionCounts =
      profiles?.reduce((acc, profile) => {
        const sub = profile.subscription || "none";
        acc[sub] = (acc[sub] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const monthlySubscribers = subscriptionCounts.monthly || 0;
    const annualSubscribers = subscriptionCounts.annual || 0;
    const activeSubscriptions = monthlySubscribers + annualSubscribers;

    return {
      activeSubscriptions,
      monthlySubscribers,
      annualSubscribers,
    };
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    throw error;
  }
}

/**
 * Fetches lifetime customers count
 */
export async function getLifetimeCustomers(): Promise<number> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("subscription")
      .eq("subscription", "lifetime");

    if (profilesError) {
      console.error("Error fetching lifetime customers:", profilesError);
      throw profilesError;
    }

    return profiles?.length || 0;
  } catch (error) {
    console.error("Error fetching lifetime customers:", error);
    throw error;
  }
}

/**
 * Fetches Monthly Recurring Revenue (MRR)
 * MRR = Sum of all active subscription monthly values
 * For annual subscriptions: (annual price / 12) to get monthly equivalent
 */
export async function getMRR(): Promise<number> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("STRIPE_SECRET_KEY not set, returning 0 for MRR");
      return 0;
    }

    let totalMRR = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    // Get all active subscriptions from Stripe
    while (hasMore) {
      const subscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
      });

      for (const subscription of subscriptions.data) {
        // Skip subscriptions that are canceled or will cancel at period end
        if (subscription.cancel_at_period_end) {
          continue;
        }

        // Get the subscription item (first item)
        const item = subscription.items.data[0];
        if (!item?.price) {
          continue;
        }

        const price = item.price;
        const amount = (price.unit_amount || 0) / 100;
        const interval = price.recurring?.interval;

        if (interval === "month") {
          // Monthly subscription - use amount directly
          totalMRR += amount;
        } else if (interval === "year") {
          // Annual subscription - divide by 12 to get monthly equivalent
          totalMRR += amount / 12;
        }
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Round to nearest cent
    return Math.round(totalMRR * 100) / 100;
  } catch (error) {
    console.error("Error fetching MRR:", error);
    throw error;
  }
}

/**
 * Fetches Year-to-Date (YTD) sales using Balance Transactions API
 * Calculates revenue from January 1st of the current year to today
 */
export async function getYTDSales(): Promise<number> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("STRIPE_SECRET_KEY not set, returning 0 for YTD sales");
      return 0;
    }

    // Calculate YTD start date (January 1st of current year)
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st
    const yearStartTimestamp = Math.floor(yearStart.getTime() / 1000);

    let totalRevenue = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    // Use Balance Transactions API - aggregates all financial transactions
    while (hasMore) {
      const balanceTransactions: Stripe.Response<
        Stripe.ApiList<Stripe.BalanceTransaction>
      > = await stripe.balanceTransactions.list({
        created: { gte: yearStartTimestamp },
        limit: 100,
        starting_after: startingAfter,
      });

      for (const transaction of balanceTransactions.data) {
        // Only count charge transactions (not refunds, fees, etc.)
        // Type 'charge' represents successful payments
        if (transaction.type === "charge" && transaction.amount > 0) {
          totalRevenue += transaction.amount;
        }
      }

      hasMore = balanceTransactions.has_more;
      if (balanceTransactions.data.length > 0) {
        startingAfter =
          balanceTransactions.data[balanceTransactions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Convert from cents to dollars and round to nearest cent
    const revenue = totalRevenue / 100;
    return Math.round(revenue * 100) / 100;
  } catch (error) {
    console.error("Error fetching YTD sales:", error);
    throw error;
  }
}

/**
 * Fetches monthly revenue (last 30 days) using Balance Transactions API
 * This is much more efficient than querying invoices and charges separately
 */
export async function getMonthlyRevenue(): Promise<number> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn(
        "STRIPE_SECRET_KEY not set, returning 0 for monthly revenue"
      );
      return 0;
    }

    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
    );

    let totalRevenue = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    // Use Balance Transactions API - aggregates all financial transactions
    while (hasMore) {
      const balanceTransactions: Stripe.Response<
        Stripe.ApiList<Stripe.BalanceTransaction>
      > = await stripe.balanceTransactions.list({
        created: { gte: thirtyDaysAgo },
        limit: 100,
        starting_after: startingAfter,
      });

      for (const transaction of balanceTransactions.data) {
        // Only count charge transactions (not refunds, fees, etc.)
        // Type 'charge' represents successful payments
        if (transaction.type === "charge" && transaction.amount > 0) {
          totalRevenue += transaction.amount;
        }
      }

      hasMore = balanceTransactions.has_more;
      if (balanceTransactions.data.length > 0) {
        startingAfter =
          balanceTransactions.data[balanceTransactions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Convert from cents to dollars and round to nearest cent
    const revenue = totalRevenue / 100;
    return Math.round(revenue * 100) / 100;
  } catch (error) {
    console.error("Error fetching monthly revenue:", error);
    throw error;
  }
}

/**
 * Revenue totals for today, last 7 days, and last 30 days (Stripe balance transactions, charge type).
 * @returns { today, last7Days, last30Days } in dollars
 */
export interface RevenueSummaries {
  today: number;
  last7Days: number;
  last30Days: number;
}

export async function getRevenueSummaries(): Promise<RevenueSummaries> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { today: 0, last7Days: 0, last30Days: 0 };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const oneDayAgo = nowSec - 24 * 60 * 60;
    const sevenDaysAgo = nowSec - 7 * 24 * 60 * 60;
    const thirtyDaysAgo = nowSec - 30 * 24 * 60 * 60;

    let today = 0;
    let last7Days = 0;
    let last30Days = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const balanceTransactions: Stripe.Response<
        Stripe.ApiList<Stripe.BalanceTransaction>
      > = await stripe.balanceTransactions.list({
        created: { gte: thirtyDaysAgo },
        limit: 100,
        starting_after: startingAfter,
      });

      for (const transaction of balanceTransactions.data) {
        if (transaction.type !== "charge" || transaction.amount <= 0) continue;
        const amount = transaction.amount / 100;
        const created = transaction.created;
        last30Days += amount;
        if (created >= sevenDaysAgo) last7Days += amount;
        if (created >= oneDayAgo) today += amount;
      }

      hasMore = balanceTransactions.has_more;
      if (balanceTransactions.data.length > 0) {
        startingAfter =
          balanceTransactions.data[balanceTransactions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      today: round(today),
      last7Days: round(last7Days),
      last30Days: round(last30Days),
    };
  } catch (error) {
    console.error("Error fetching revenue summaries:", error);
    throw error;
  }
}

/**
 * Fetches lifetime revenue using Balance Transactions API
 * This is much more efficient than querying invoices and charges separately
 */
export async function getLifetimeRevenue(): Promise<number> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn(
        "STRIPE_SECRET_KEY not set, returning 0 for lifetime revenue"
      );
      return 0;
    }

    let totalRevenue = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    // Use Balance Transactions API - aggregates all financial transactions
    while (hasMore) {
      const balanceTransactions: Stripe.Response<
        Stripe.ApiList<Stripe.BalanceTransaction>
      > = await stripe.balanceTransactions.list({
        limit: 100,
        starting_after: startingAfter,
      });

      for (const transaction of balanceTransactions.data) {
        // Only count charge transactions (not refunds, fees, etc.)
        // Type 'charge' represents successful payments
        if (transaction.type === "charge" && transaction.amount > 0) {
          totalRevenue += transaction.amount;
        }
      }

      hasMore = balanceTransactions.has_more;
      if (balanceTransactions.data.length > 0) {
        startingAfter =
          balanceTransactions.data[balanceTransactions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Convert from cents to dollars and round to nearest cent
    const revenue = totalRevenue / 100;
    return Math.round(revenue * 100) / 100;
  } catch (error) {
    console.error("Error fetching lifetime revenue:", error);
    throw error;
  }
}

/**
 * Fetches trial users count
 */
export async function getTrialUsers(): Promise<number> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("trial_expiration, subscription");

    if (profilesError) {
      console.error("Error fetching trial users:", profilesError);
      throw profilesError;
    }

    const trialUsers =
      profiles?.filter(
        (p) =>
          p.trial_expiration &&
          new Date(p.trial_expiration) > new Date() &&
          p.subscription === "none"
      ).length || 0;

    return trialUsers;
  } catch (error) {
    console.error("Error fetching trial users:", error);
    throw error;
  }
}

/**
 * Fetches trial users broken down by trial type (7-day vs 14-day) with conversion rates
 */
export async function getTrialUsersByType(): Promise<{
  sevenDayTrials: number;
  fourteenDayTrials: number;
  sevenDayConversionRate: number;
  fourteenDayConversionRate: number;
}> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("STRIPE_SECRET_KEY not set, returning 0 for trial breakdown");
      return { 
        sevenDayTrials: 0, 
        fourteenDayTrials: 0,
        sevenDayConversionRate: 0,
        fourteenDayConversionRate: 0,
      };
    }

    const supabase = await createSupabaseServiceRole();

    // Get all profiles to map customer_id to user_id
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, customer_id, trial_expiration, subscription");

    if (profilesError) {
      console.error("Error fetching profiles for trial breakdown:", profilesError);
      throw profilesError;
    }

    // Create a map of customer_id to profile
    const customerToProfileMap = new Map<string, typeof profiles[0]>();
    profiles?.forEach(profile => {
      if (profile.customer_id) {
        customerToProfileMap.set(profile.customer_id, profile);
      }
    });

    // Track active trial users and conversions (for conversion rate calculation)
    const sevenDayTrials = new Set<string>(); // customer IDs - ACTIVE trials only
    const fourteenDayTrials = new Set<string>();
    const sevenDayConversions = new Set<string>(); // All users who had 7-day trial and converted
    const fourteenDayConversions = new Set<string>(); // All users who had 14-day trial and converted
    const allSevenDayTrialUsers = new Set<string>(); // All users who ever had 7-day trial (for conversion rate)
    const allFourteenDayTrialUsers = new Set<string>(); // All users who ever had 14-day trial (for conversion rate)

    const now = Math.floor(Date.now() / 1000);

    // Get all subscriptions to track conversions AND active trials
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const subscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        status: "all", // Get all statuses to track conversions
      });

      for (const subscription of subscriptions.data) {
        // Only process subscriptions that have/had a trial
        if (!subscription.trial_start || !subscription.trial_end) {
          continue;
        }

        const customerId = subscription.customer as string;
        if (!customerId) continue;

        // Calculate trial duration in days
        const trialStart = subscription.trial_start;
        const trialEnd = subscription.trial_end;
        const daysDiff = (trialEnd - trialStart) / (60 * 60 * 24); // Keep as decimal for precision
        
        // Determine trial type (7-day or 14-day)
        // Use a range to account for rounding: 7-day trials are typically 6.5-8 days
        // 14-day trials are typically 13-15 days
        // This accounts for timezone differences and Stripe's exact timestamp handling
        const isSevenDay = daysDiff >= 6.5 && daysDiff <= 8.5;

        // Track ALL users who had this trial type (for conversion rate calculation)
        if (isSevenDay) {
          allSevenDayTrialUsers.add(customerId);
        } else {
          allFourteenDayTrialUsers.add(customerId);
        }

        // Check if this is an ACTIVE trial (currently trialing)
        // Also check that trial has started (trial_start <= now)
        const isActiveTrial = subscription.status === "trialing" && 
                              subscription.trial_start &&
                              subscription.trial_end && 
                              subscription.trial_start <= now &&
                              subscription.trial_end > now;

        // Track active trials
        if (isActiveTrial) {
          if (isSevenDay) {
            sevenDayTrials.add(customerId);
          } else {
            fourteenDayTrials.add(customerId);
          }
        }

        // Check if they converted (have an active paid subscription after trial ended)
        // A conversion means: subscription is active AND trial has ended AND payment was made
        const trialHasEnded = subscription.trial_end && subscription.trial_end <= now;
        const isActive = subscription.status === "active";
        
        // Verify payment was made after trial:
        // 1. If current_period_start > trial_end, they've been billed (Stripe only advances period on successful payment)
        // 2. If current_period_start <= trial_end but subscription is active, they might be in grace period
        //    In this case, we check if the subscription was created before trial_end (meaning they converted)
        //    and the status is active (meaning payment succeeded)
        const subWithPeriod = subscription as Stripe.Subscription & { current_period_start?: number; trial_end?: number };
        const hasPaidAfterTrial = subWithPeriod.current_period_start &&
                                 subWithPeriod.current_period_start > (subWithPeriod.trial_end ?? 0);

        // A conversion means:
        // - Subscription is active (not canceled, not past_due, etc.)
        // - Trial has ended
        // - Payment was made (current_period_start advanced past trial_end)
        const isConverted = isActive && trialHasEnded && hasPaidAfterTrial;

        if (isConverted) {
          if (isSevenDay) {
            sevenDayConversions.add(customerId);
          } else {
            fourteenDayConversions.add(customerId);
          }
        }
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Also check active trials from profiles (for current active trials not in Stripe)
    const activeTrialProfiles = profiles?.filter(
      (p) =>
        p.trial_expiration &&
        new Date(p.trial_expiration) > new Date() &&
        p.subscription === "none"
    ) || [];

    // For profiles with active trials, try to find their Stripe subscription to get accurate trial type
    for (const profile of activeTrialProfiles) {
      if (!profile.customer_id) {
        // For users without customer_id, we can't determine trial type accurately
        // Skip them from the count since we can't verify the trial type
        // This prevents inaccurate estimates
        continue;
      }

      // Only add if not already counted from Stripe
      // If we didn't find them in Stripe subscriptions, they might not have a Stripe subscription yet
      // or the subscription might be in a different state
      // In this case, we can't accurately determine trial type, so we skip them
      // This ensures we only count trials we can verify from Stripe
      if (!sevenDayTrials.has(profile.customer_id) && !fourteenDayTrials.has(profile.customer_id)) {
        // Try to find the subscription in Stripe for this customer
        try {
          const customerSubscriptions = await stripe.subscriptions.list({
            customer: profile.customer_id,
            status: "trialing",
            limit: 1,
          });

          if (customerSubscriptions.data.length > 0) {
            const subscription = customerSubscriptions.data[0];
            if (subscription.trial_start && subscription.trial_end) {
              const daysDiff = (subscription.trial_end - subscription.trial_start) / (60 * 60 * 24);
              const isSevenDay = daysDiff >= 6.5 && daysDiff <= 8.5;
              
              if (isSevenDay) {
                sevenDayTrials.add(profile.customer_id);
              } else {
                fourteenDayTrials.add(profile.customer_id);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching subscription for customer ${profile.customer_id}:`, error);
          // Skip if we can't fetch the subscription
        }
      }
    }

    // Calculate counts (active trials only)
    const sevenDayCount = sevenDayTrials.size;
    const fourteenDayCount = fourteenDayTrials.size;
    
    // For conversion rates, use ALL users who had trials (not just active ones)
    const sevenDayConverted = sevenDayConversions.size;
    const fourteenDayConverted = fourteenDayConversions.size;
    const allSevenDayCount = allSevenDayTrialUsers.size;
    const allFourteenDayCount = allFourteenDayTrialUsers.size;

    // Calculate conversion rates based on all users who had trials
    const sevenDayConversionRate = allSevenDayCount > 0 
      ? (sevenDayConverted / allSevenDayCount) * 100 
      : 0;
    const fourteenDayConversionRate = allFourteenDayCount > 0 
      ? (fourteenDayConverted / allFourteenDayCount) * 100 
      : 0;

    return {
      sevenDayTrials: sevenDayCount,
      fourteenDayTrials: fourteenDayCount,
      sevenDayConversionRate: Math.round(sevenDayConversionRate * 10) / 10, // Round to 1 decimal
      fourteenDayConversionRate: Math.round(fourteenDayConversionRate * 10) / 10,
    };
  } catch (error) {
    console.error("Error fetching trial users by type:", error);
    throw error;
  }
}

/**
 * Fetches average subscription lifespan (how long paying subscribers stay subscribed)
 * Returns the average in days
 */
export async function getAverageSubscriptionLifespan(): Promise<number> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("STRIPE_SECRET_KEY not set, returning 0 for average subscription lifespan");
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const lifespans: number[] = [];

    // Get all subscriptions (active and canceled)
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const subscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        status: "all", // Get all statuses
      });

      for (const subscription of subscriptions.data) {
        // Only count subscriptions that are/were paid (not just trials)
        // Skip if subscription is still in trial
        if (subscription.trial_end && subscription.trial_end > now) {
          continue;
        }

        // Calculate subscription start (use trial_end if trial existed, otherwise created)
        const subscriptionStart = subscription.trial_end && subscription.trial_end <= now
          ? subscription.trial_end // Start counting from when trial ended
          : subscription.created;

        // Calculate subscription end
        let subscriptionEnd: number;
        if (subscription.status === "active" || subscription.status === "trialing") {
          // For active subscriptions, use current time
          subscriptionEnd = now;
        } else if (subscription.canceled_at) {
          // For canceled subscriptions, use canceled_at
          subscriptionEnd = subscription.canceled_at;
        } else if (subscription.ended_at) {
          // For ended subscriptions, use ended_at
          subscriptionEnd = subscription.ended_at;
        } else {
          // Skip if we can't determine end date
          continue;
        }

        // Calculate lifespan in days
        const lifespanDays = Math.round((subscriptionEnd - subscriptionStart) / (60 * 60 * 24));
        
        // Only count subscriptions that actually started (lifespan > 0)
        if (lifespanDays > 0) {
          lifespans.push(lifespanDays);
        }
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Calculate average
    if (lifespans.length === 0) {
      return 0;
    }

    const averageDays = lifespans.reduce((sum, days) => sum + days, 0) / lifespans.length;
    return Math.round(averageDays * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error("Error fetching average subscription lifespan:", error);
    throw error;
  }
}

/**
 * Fetches churn rate
 * Churn rate = (Canceled subscriptions / Total subscriptions) × 100
 * Where Total = Active + Canceled
 */
export async function getChurnRate(): Promise<number> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("STRIPE_SECRET_KEY not set, returning 0 for churn rate");
      return 0;
    }

    let activeCount = 0;
    let canceledCount = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    // Get all subscriptions from Stripe
    while (hasMore) {
      const subscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        status: "all", // Get all statuses
      });

      for (const subscription of subscriptions.data) {
        // Skip subscriptions that are still in trial (not yet paid)
        if (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000)) {
          continue;
        }

        // Count active subscriptions (active status, not canceled)
        if (subscription.status === "active" && !subscription.cancel_at_period_end) {
          activeCount++;
        }
        // Count canceled subscriptions (canceled status or set to cancel at period end)
        else if (subscription.status === "canceled" || 
                 subscription.status === "unpaid" ||
                 (subscription.status === "active" && subscription.cancel_at_period_end)) {
          canceledCount++;
        }
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Calculate churn rate
    const totalSubscriptions = activeCount + canceledCount;
    if (totalSubscriptions === 0) {
      return 0;
    }

    const churnRate = (canceledCount / totalSubscriptions) * 100;
    return Math.round(churnRate * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error("Error fetching churn rate:", error);
    throw error;
  }
}

/**
 * Fetches admin users count
 */
export async function getAdminUsers(): Promise<number> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const { count, error: adminsError } = await supabase
      .from("admins")
      .select("user", { count: "exact", head: true });

    if (adminsError) {
      console.error("Error fetching admin users:", adminsError);
      throw adminsError;
    }

    return count || 0;
  } catch (error) {
    console.error("Error fetching admin users:", error);
    throw error;
  }
}

/**
 * Fetches recent activity for the admin dashboard using Stripe Events API
 * This is much more efficient than querying Supabase tables
 */
export async function getRecentActivity(
  limit: number = 10
): Promise<AdminActivity[]> {
  await requireAdminAction();
  try {
    const activities: AdminActivity[] = [];

    // Use Stripe Events API for recent payment activity
    if (process.env.STRIPE_SECRET_KEY) {
      const events: Stripe.Response<Stripe.ApiList<Stripe.Event>> =
        await stripe.events.list({
          types: [
            "charge.succeeded",
            "invoice.payment_succeeded",
            "customer.subscription.created",
            "customer.subscription.deleted",
          ],
          limit: limit * 2, // Get more to filter and sort
        });

      for (const event of events.data) {
        const eventData = event.data.object as
          | Stripe.Charge
          | Stripe.Invoice
          | Stripe.Subscription;

        if (event.type === "charge.succeeded") {
          const charge = eventData as Stripe.Charge;
          if (charge.paid && !charge.refunded) {
            let customerEmail = "";
            if (charge.customer && typeof charge.customer === "string") {
              // Fetch customer if needed
              try {
                const customer = await stripe.customers.retrieve(
                  charge.customer
                );
                if (!customer.deleted && "email" in customer) {
                  customerEmail = customer.email || "";
                }
              } catch {
                // Customer might not exist, skip email
              }
            } else if (
              charge.customer &&
              typeof charge.customer === "object" &&
              !charge.customer.deleted &&
              "email" in charge.customer
            ) {
              customerEmail = charge.customer.email || "";
            }
            const amount = charge.amount || 0;

            activities.push({
              id: charge.id,
              type: "payment",
              description: `Payment of $${(amount / 100).toFixed(2)}${
                customerEmail ? ` by ${customerEmail}` : ""
              }`,
              amount: amount / 100,
              currency: charge.currency || "usd",
              timestamp: new Date(charge.created * 1000).toISOString(),
              userEmail: customerEmail,
            });
          }
        } else if (event.type === "invoice.payment_succeeded") {
          const invoice = eventData as Stripe.Invoice;
          if (invoice.status === "paid") {
            let customerEmail = "";
            if (invoice.customer && typeof invoice.customer === "string") {
              // Fetch customer if needed
              try {
                const customer = await stripe.customers.retrieve(
                  invoice.customer
                );
                if (!customer.deleted && "email" in customer) {
                  customerEmail = customer.email || "";
                }
              } catch {
                // Customer might not exist, skip email
              }
            } else if (
              invoice.customer &&
              typeof invoice.customer === "object" &&
              !invoice.customer.deleted &&
              "email" in invoice.customer
            ) {
              customerEmail = invoice.customer.email || "";
            }
            const amount = invoice.amount_paid || 0;

            activities.push({
              id: invoice.id,
              type: "subscription",
              description: `Subscription payment of $${(amount / 100).toFixed(
                2
              )}${customerEmail ? ` by ${customerEmail}` : ""}`,
              amount: amount / 100,
              currency: invoice.currency || "usd",
              timestamp: new Date(invoice.created * 1000).toISOString(),
              userEmail: customerEmail,
            });
          }
        } else if (event.type === "customer.subscription.deleted") {
          const subscription = eventData as Stripe.Subscription;
          let customerEmail = "";
          if (
            subscription.customer &&
            typeof subscription.customer === "string"
          ) {
            // Fetch customer if needed
            try {
              const customer = await stripe.customers.retrieve(
                subscription.customer
              );
              if (!customer.deleted && "email" in customer) {
                customerEmail = customer.email || "";
              }
            } catch {
              // Customer might not exist, skip email
            }
          } else if (
            subscription.customer &&
            typeof subscription.customer === "object" &&
            !subscription.customer.deleted &&
            "email" in subscription.customer
          ) {
            customerEmail = subscription.customer.email || "";
          }

          activities.push({
            id: subscription.id,
            type: "cancellation",
            description: `Subscription cancelled${
              customerEmail ? ` by ${customerEmail}` : ""
            }`,
            timestamp: new Date(subscription.canceled_at! * 1000).toISOString(),
            userEmail: customerEmail,
          });
        }
      }
    }

    // Get recent user signups from Supabase (this is fast)
    const supabase = await createSupabaseServiceRole();
    const { data: recentUsers, error: usersError } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (!usersError && recentUsers) {
      for (const user of recentUsers) {
        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(
          user.id
        );
        const userEmail = authUser.user?.email || "";

        activities.push({
          id: user.id,
          type: "user_signup",
          description: `New user signup: ${userEmail}`,
          timestamp: user.updated_at || new Date().toISOString(),
          userId: user.id,
          userEmail: userEmail,
        });
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activities.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}

/**
 * @brief Stripe spend index used for paying-customer filter, spend sort, and row seeds.
 */
type PayingSpendIndex = {
  customerIds: string[];
  userIds: string[];
  spentCentsByCustomerId: Record<string, number>;
  orderCountByCustomerId: Record<string, number>;
  spentCentsByUserId: Record<string, number>;
  orderCountByUserId: Record<string, number>;
  emailByCustomerId: Record<string, string>;
};

/**
 * @brief Fresh empty spend index (never share a mutable singleton).
 * @returns Empty maps and id lists.
 */
function emptySpendIndex(): PayingSpendIndex {
  return {
    customerIds: [],
    userIds: [],
    spentCentsByCustomerId: {},
    orderCountByCustomerId: {},
    spentCentsByUserId: {},
    orderCountByUserId: {},
    emailByCustomerId: {},
  };
}

/**
 * @brief Walks Stripe charges and sums remaining paid amount and paid-order count per customer.
 * @returns Customer ids, spend in cents, and paid charge counts.
 * @note Same paid-charge rule as CRM `totalSpent`. Walks until Stripe is exhausted or the safety cap.
 */
async function fetchPayingStripeSpendIndex(): Promise<PayingSpendIndex> {
  const spent = new Map<string, number>();
  const orders = new Map<string, number>();
  const emails = new Map<string, string>();
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_PAYING_CHARGE_PAGES; page++) {
    const list = await stripe.charges.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const charge of list.data) {
      if (!isPaidStripeCharge(charge)) continue;
      const customerId = stripeCustomerIdFromCharge(charge);
      if (!customerId) continue;
      const net = charge.amount - (charge.amount_refunded ?? 0);
      spent.set(customerId, (spent.get(customerId) ?? 0) + net);
      orders.set(customerId, (orders.get(customerId) ?? 0) + 1);
      const email = emailFromStripeCharge(charge);
      if (email && !emails.has(customerId)) {
        emails.set(customerId, email);
      }
    }
    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  const customerIds = Array.from(spent.keys());
  await fillMissingStripeCustomerEmails(customerIds, emails);
  const attributed = await attributeSpendIndexToProfiles(
    customerIds,
    Object.fromEntries(spent),
    Object.fromEntries(orders),
    Object.fromEntries(emails)
  );

  return {
    customerIds,
    userIds: Object.keys(attributed.spentCentsByUserId),
    spentCentsByCustomerId: Object.fromEntries(spent),
    orderCountByCustomerId: Object.fromEntries(orders),
    spentCentsByUserId: attributed.spentCentsByUserId,
    orderCountByUserId: attributed.orderCountByUserId,
    emailByCustomerId: Object.fromEntries(emails),
  };
}

/**
 * @brief Retrieves Stripe customer emails when charges did not include one.
 * @param customerIds Paying Stripe customer ids.
 * @param emails Emails already collected from charges (mutated).
 */
async function fillMissingStripeCustomerEmails(
  customerIds: string[],
  emails: Map<string, string>
): Promise<void> {
  const missing = customerIds.filter((id) => !emails.has(id));
  for (const chunk of chunkIds(missing, 8)) {
    await Promise.all(
      chunk.map(async (customerId) => {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.deleted || !("email" in customer) || !customer.email) {
            return;
          }
          const email = customer.email.toLowerCase().trim();
          if (email) emails.set(customerId, email);
        } catch (error) {
          console.error(
            "[CRM] Error loading Stripe customer email:",
            customerId,
            error
          );
        }
      })
    );
  }
}

/**
 * @brief Loads profiles for paying customers (by customer_id, then email).
 * @param customerIds Paying Stripe customer ids.
 * @param spentCentsByCustomerId Net paid cents keyed by customer.
 * @param orderCountByCustomerId Paid order counts keyed by customer.
 * @param emailByCustomerId Lowercased emails keyed by customer.
 * @returns Per-user spend and order counts.
 */
async function attributeSpendIndexToProfiles(
  customerIds: string[],
  spentCentsByCustomerId: Record<string, number>,
  orderCountByCustomerId: Record<string, number>,
  emailByCustomerId: Record<string, string>
): Promise<{
  spentCentsByUserId: Record<string, number>;
  orderCountByUserId: Record<string, number>;
}> {
  const supabase = await createSupabaseServiceRole();
  const profiles: Array<{
    id: string;
    customer_id: string | null;
    email: string | null;
    created_at: string | null;
  }> = [];
  const seen = new Set<string>();

  const pushRows = (
    rows: Array<{
      id: string;
      customer_id: string | null;
      email: string | null;
      created_at?: string | null;
    }>
  ) => {
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      profiles.push({
        id: row.id,
        customer_id: row.customer_id,
        email: row.email,
        created_at: row.created_at ?? null,
      });
    }
  };

  for (const chunk of chunkIds(customerIds)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, customer_id, email, created_at")
      .in("customer_id", chunk);
    if (error) {
      console.error("[CRM] Error matching spend by customer_id:", error);
      throw error;
    }
    pushRows(data ?? []);
  }

  const emails = [
    ...new Set(
      customerIds
        .map((id) => emailByCustomerId[id])
        .filter((email): email is string => Boolean(email))
    ),
  ];
  for (const chunk of chunkIds(emails)) {
    const orClause = emailIlikeOrClause(chunk);
    if (!orClause) continue;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, customer_id, email, created_at")
      .or(orClause);
    if (error) {
      console.error("[CRM] Error matching spend by email:", error);
      throw error;
    }
    pushRows(data ?? []);
  }

  return attributeSpendToUsers(
    spentCentsByCustomerId,
    orderCountByCustomerId,
    emailByCustomerId,
    profiles
  );
}

/**
 * @brief Cached Stripe spend index for CRM paying filter and total-spent sort.
 * @returns Paying customer ids and spend cents.
 */
async function getPayingStripeSpendIndex(): Promise<PayingSpendIndex> {
  return unstable_cache(
    fetchPayingStripeSpendIndex,
    ["crm-paying-stripe-spend-index-v3"],
    { revalidate: PAYING_CUSTOMER_CACHE_SECONDS }
  )();
}

/**
 * Get total count of users for CRM (separate from pagination)
 */
export async function getUsersForCRMCount(
  searchTerm?: string,
  subscriptionFilter?: string
): Promise<number> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    // Build count query
    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Handle admin filter separately
    if (subscriptionFilter === "admin") {
      const { data: admins, error: adminsError } = await supabase
        .from("admins")
        .select("user");

      if (!adminsError && admins && admins.length > 0) {
        const adminIds = admins.map((admin: { user: string }) => admin.user);
        countQuery = countQuery.in("id", adminIds);
      } else {
        return 0;
      }
    } else if (subscriptionFilter === "paying") {
      const keys = await fetchAllFilteredProfileKeys(
        supabase,
        searchTerm,
        "paying"
      );
      return keys?.length ?? 0;
    } else if (subscriptionFilter && subscriptionFilter !== "all") {
      const validSubscriptionTypes: SubscriptionType[] = [
        "none",
        "monthly",
        "annual",
        "lifetime",
      ];
      if (
        validSubscriptionTypes.includes(subscriptionFilter as SubscriptionType)
      ) {
        countQuery = countQuery.eq(
          "subscription",
          subscriptionFilter as SubscriptionType
        );
      }
    }

    if (searchTerm && searchTerm.trim().length > 0) {
      const keys = await fetchAllFilteredProfileKeys(
        supabase,
        searchTerm,
        subscriptionFilter
      );
      return keys?.length ?? 0;
    }

    const { count, error } = await countQuery;

    if (error) {
      console.error("Error fetching users count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getUsersForCRMCount:", error);
    return 0;
  }
}

/**
 * @brief Applies CRM search + subscription/paying/admin filters to a profiles query.
 * @param query Supabase profiles query builder.
 * @param supabase Service-role client (for admin id lookup).
 * @param searchTerm Optional name/email search.
 * @param subscriptionFilter CRM filter value (`all`, `paying`, `admin`, plan types).
 * @returns `{ query }` builder, or null when the filter matches nobody.
 * @note The builder is wrapped. Returning a Supabase query from `async`
 *   unwraps its thenable and executes the request, so `.order()` would
 *   run on `{ data, error }` instead of the builder.
 */
async function applyCrmProfileFilters(
  query: any,
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  searchTerm?: string,
  subscriptionFilter?: string
): Promise<{ query: any } | null> {
  let next = query;

  if (subscriptionFilter === "admin") {
    const { data: admins, error: adminsError } = await supabase
      .from("admins")
      .select("user");
    if (adminsError || !admins?.length) return null;
    const adminIds = admins.map((admin: { user: string }) => admin.user);
    if (adminIds.length === 0) return null;
    next = next.in("id", adminIds);
  } else if (subscriptionFilter === "paying") {
    // Paying customers are loaded in customer-id chunks — do not `.in()` the full list.
    return null;
  } else if (subscriptionFilter && subscriptionFilter !== "all") {
    const validSubscriptionTypes: SubscriptionType[] = [
      "none",
      "monthly",
      "annual",
      "lifetime",
    ];
    if (
      validSubscriptionTypes.includes(subscriptionFilter as SubscriptionType)
    ) {
      next = next.eq(
        "subscription",
        subscriptionFilter as SubscriptionType
      );
    }
  }

  return holdQuery(applyCrmSearchFilter(next, searchTerm));
}

const CRM_PROFILE_KEY_COLUMNS =
  "id, customer_id, email, created_at, updated_at, first_name, last_name, subscription";

/**
 * @brief Applies search to a profiles query (name and email).
 * @param query Profiles query builder.
 * @param searchTerm Optional search string.
 * @returns Query with `or` search applied when needed.
 */
function applyCrmSearchFilter(query: any, searchTerm?: string): any {
  const sanitized = sanitizeCrmSearchTerm(searchTerm);
  if (sanitized === null) {
    return query;
  }
  if (sanitized === "") {
    return query.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  const orConditions = [
    `first_name.ilike.%${sanitized}%`,
    `last_name.ilike.%${sanitized}%`,
    `email.ilike.%${sanitized}%`,
  ];
  const parts = sanitized.split(/\s+/);
  if (parts.length > 1) {
    for (const part of parts) {
      if (part.length > 0) {
        orConditions.push(`first_name.ilike.%${part}%`);
        orConditions.push(`last_name.ilike.%${part}%`);
      }
    }
  }
  return query.or(orConditions.join(","));
}

/**
 * @brief Loads every matching CRM profile key for filter, count, and derived sorts.
 * @param supabase Service-role client.
 * @param searchTerm Optional CRM search.
 * @param subscriptionFilter CRM filter value.
 * @returns All matching keys, or null when the filter matches nobody.
 */
async function fetchAllFilteredProfileKeys(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  searchTerm?: string,
  subscriptionFilter?: string
): Promise<CrmProfileSortKey[] | null> {
  if (subscriptionFilter === "paying") {
    const { userIds } = await getPayingStripeSpendIndex();
    if (userIds.length === 0) return null;
    const rows: CrmProfileSortKey[] = [];
    for (const chunk of chunkIds(userIds)) {
      let query = supabase
        .from("profiles")
        .select(CRM_PROFILE_KEY_COLUMNS)
        .in("id", chunk)
        .order("id", { ascending: true });
      query = applyCrmSearchFilter(query, searchTerm);
      const { data, error } = await query;
      if (error) {
        console.error("[CRM] Error fetching paying profile keys:", error);
        throw error;
      }
      if (data?.length) {
        rows.push(...(data as CrmProfileSortKey[]));
      }
    }
    return rows.length > 0 ? rows : null;
  }

  const pageSize = 1000;
  const rows: CrmProfileSortKey[] = [];
  for (let from = 0; ; from += pageSize) {
    const base = supabase.from("profiles").select(CRM_PROFILE_KEY_COLUMNS);
    const filtered = await applyCrmProfileFilters(
      base,
      supabase,
      searchTerm,
      subscriptionFilter
    );
    if (!filtered) return rows.length > 0 ? rows : null;
    const { data, error } = await filtered.query
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[CRM] Error fetching profile keys:", error);
      throw error;
    }
    if (!data?.length) break;
    rows.push(...(data as CrmProfileSortKey[]));
    if (data.length < pageSize) break;
  }
  return rows.length > 0 ? rows : null;
}

/**
 * @brief Loads full profile rows for a page of ids, preserving the given order.
 * @param supabase Service-role client.
 * @param pageIds Ordered profile ids.
 * @returns Profiles in `pageIds` order.
 */
async function fetchProfilesByOrderedIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  pageIds: string[]
): Promise<any[]> {
  if (pageIds.length === 0) return [];
  const byId = new Map<string, any>();
  for (const chunk of chunkIds(pageIds)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", chunk);
    if (error) {
      console.error("Error fetching profiles for CRM page:", error);
      throw error;
    }
    for (const row of data ?? []) {
      byId.set((row as { id: string }).id, row);
    }
  }
  const order = new Map(pageIds.map((id, index) => [id, index]));
  return pageIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .sort(
      (a: { id: string }, b: { id: string }) =>
        (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );
}

/**
 * @brief Loads profile sort keys for user ids, preserving spend order.
 * @param supabase Service-role client.
 * @param userIdsInOrder Profile ids already sorted by spend.
 * @param searchTerm Optional CRM search.
 * @param subscriptionFilter CRM filter (`paying` is treated as all spenders).
 * @param stopAfter Stop after this many matching keys.
 * @returns Matching keys in the same user-id order.
 */
async function fetchProfileKeysByUserIdsInOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  userIdsInOrder: string[],
  searchTerm?: string,
  subscriptionFilter?: string,
  stopAfter?: number
): Promise<CrmProfileSortKey[]> {
  const filter =
    subscriptionFilter === "paying" ? "all" : subscriptionFilter;
  const ordered: CrmProfileSortKey[] = [];
  for (const chunk of chunkIds(userIdsInOrder)) {
    let query = supabase
      .from("profiles")
      .select(CRM_PROFILE_KEY_COLUMNS)
      .in("id", chunk)
      .order("id", { ascending: true });
    const filtered = await applyCrmProfileFilters(
      query,
      supabase,
      searchTerm,
      filter
    );
    if (!filtered) continue;
    const { data, error } = await filtered.query;
    if (error) {
      console.error("[CRM] Error fetching spend-sort users:", error);
      throw error;
    }
    const byId = new Map<string, CrmProfileSortKey>();
    for (const row of (data ?? []) as CrmProfileSortKey[]) {
      byId.set(row.id, row);
    }
    for (const userId of chunk) {
      const row = byId.get(userId);
      if (row) ordered.push(row);
      if (stopAfter != null && ordered.length >= stopAfter) {
        return ordered.slice(0, stopAfter);
      }
    }
  }
  return ordered;
}

/**
 * @brief Loads profile sort keys for customer ids, preserving spend order.
 * @param supabase Service-role client.
 * @param customerIdsInOrder Customer ids already sorted by spend.
 * @param searchTerm Optional CRM search.
 * @param subscriptionFilter CRM filter (`paying` is treated as all spenders).
 * @param stopAfter Stop after this many matching keys (used for desc spend pages).
 * @returns Matching keys in the same customer-id order.
 */
async function fetchProfileKeysByCustomerIdsInOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  customerIdsInOrder: string[],
  searchTerm?: string,
  subscriptionFilter?: string,
  stopAfter?: number
): Promise<CrmProfileSortKey[]> {
  const filter =
    subscriptionFilter === "paying" ? "all" : subscriptionFilter;
  const ordered: CrmProfileSortKey[] = [];
  for (const chunk of chunkIds(customerIdsInOrder)) {
    let query = supabase
      .from("profiles")
      .select(CRM_PROFILE_KEY_COLUMNS)
      .in("customer_id", chunk)
      .order("id", { ascending: true });
    const filtered = await applyCrmProfileFilters(
      query,
      supabase,
      searchTerm,
      filter
    );
    if (!filtered) continue;
    const { data, error } = await filtered.query;
    if (error) {
      console.error("[CRM] Error fetching spend-sort profiles:", error);
      throw error;
    }
    const byCustomer = new Map<string, CrmProfileSortKey[]>();
    for (const row of (data ?? []) as CrmProfileSortKey[]) {
      if (!row.customer_id) continue;
      const list = byCustomer.get(row.customer_id) ?? [];
      list.push(row);
      byCustomer.set(row.customer_id, list);
    }
    for (const customerId of chunk) {
      const rows = byCustomer.get(customerId);
      if (rows?.length) ordered.push(...rows);
      if (stopAfter != null && ordered.length >= stopAfter) {
        return ordered.slice(0, stopAfter);
      }
    }
  }
  return ordered;
}

/**
 * @brief Pages CRM keys by Stripe spend without loading every $0 profile first.
 * @param supabase Service-role client.
 * @param searchTerm Optional CRM search.
 * @param subscriptionFilter CRM filter value.
 * @param sortDirection Ascending or descending.
 * @param page 1-based page.
 * @param limit Page size.
 * @param spendIndex Cached spend totals.
 * @returns The keys for this page, or null when nobody matches.
 */
async function fetchTotalSpentPageKeys(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  searchTerm: string | undefined,
  subscriptionFilter: string | undefined,
  sortDirection: "asc" | "desc" | undefined,
  page: number,
  limit: number,
  spendIndex: PayingSpendIndex
): Promise<CrmProfileSortKey[] | null> {
  const direction = sortDirection === "asc" ? "asc" : "desc";
  const payingOnly = subscriptionFilter === "paying";
  const rankedIds =
    Object.keys(spendIndex.spentCentsByUserId).length > 0
      ? customerIdsRankedBySpend(spendIndex.spentCentsByUserId, direction)
      : customerIdsRankedBySpend(spendIndex.spentCentsByCustomerId, direction);
  const prefetchByUser = Object.keys(spendIndex.spentCentsByUserId).length > 0;

  const needed = Math.max(0, (page - 1) * limit) + limit;
  const prefetchSpenders = payingOnly || direction === "desc";
  const spenderKeys = prefetchSpenders
    ? prefetchByUser
      ? await fetchProfileKeysByUserIdsInOrder(
          supabase,
          rankedIds,
          searchTerm,
          subscriptionFilter,
          needed
        )
      : await fetchProfileKeysByCustomerIdsInOrder(
          supabase,
          rankedIds,
          searchTerm,
          subscriptionFilter,
          needed
        )
    : [];

  if (
    prefetchSpenders &&
    canPageFromSpendersOnly(
      spenderKeys.length,
      page,
      limit,
      payingOnly,
      direction
    )
  ) {
    const pageKeys = sliceRankedPage(spenderKeys, page, limit);
    return pageKeys.length > 0 ? pageKeys : null;
  }

  // Asc (all users) or a desc page that runs past the last spender: $0 rows
  // must be ranked too. Re-sort the full filtered set — do not append zeros
  // onto a truncated spender list or mid-tier spenders disappear.
  const allKeys = await fetchAllFilteredProfileKeys(
    supabase,
    searchTerm,
    subscriptionFilter
  );
  if (!allKeys?.length) {
    const pageKeys = sliceRankedPage(spenderKeys, page, limit);
    return pageKeys.length > 0 ? pageKeys : null;
  }
  sortCrmProfileKeys(allKeys, "totalSpent", direction, {
    spentCentsByUserId: spendIndex.spentCentsByUserId,
    spentCentsByCustomerId: spendIndex.spentCentsByCustomerId,
  });
  const pageKeys = sliceRankedPage(allKeys, page, limit);
  return pageKeys.length > 0 ? pageKeys : null;
}

/**
 * @brief Newest matching profiles by `created_at` (used with last-active prefetch).
 * @param supabase Service-role client.
 * @param searchTerm Optional CRM search.
 * @param subscriptionFilter CRM filter (`paying` is handled by the caller).
 * @param limit Max rows to return.
 * @returns Newest matching keys.
 */
async function fetchNewestProfileKeys(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  searchTerm: string | undefined,
  subscriptionFilter: string | undefined,
  limit: number
): Promise<CrmProfileSortKey[]> {
  if (limit <= 0 || subscriptionFilter === "paying") return [];
  const base = supabase.from("profiles").select(CRM_PROFILE_KEY_COLUMNS);
  const filtered = await applyCrmProfileFilters(
    base,
    supabase,
    searchTerm,
    subscriptionFilter
  );
  if (!filtered) return [];
  const { data, error } = await filtered.query
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[CRM] Error fetching newest profiles for last-active:", error);
    throw error;
  }
  return (data ?? []) as CrmProfileSortKey[];
}

/**
 * @brief Distinct product-grant user ids (candidates for Products sort).
 * @param supabase Service-role client.
 * @returns User ids that have at least one grant.
 */
async function productGrantUserIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>
): Promise<string[]> {
  const ids = new Set<string>();
  const rows = await fetchAllRangedRows<{ user_id?: string | null }>(
    (from, to) =>
      supabase
        .from("product_grants")
        .select("user_id")
        .order("id", { ascending: true })
        .range(from, to)
  );
  for (const row of rows) {
    if (row.user_id) ids.add(row.user_id);
  }
  return Array.from(ids);
}

/**
 * @brief Latest session timestamp for every user_sessions row.
 * @param supabase Service-role client.
 * @returns Map of user id → ISO timestamp.
 */
async function lastActiveByAllSessions(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>
): Promise<Record<string, string>> {
  const lastActive: Record<string, string> = {};
  const sessions = await fetchAllRangedRows<{
    user_id: string;
    refreshed_at?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  }>((from, to) =>
    supabase
      .from("user_sessions")
      .select("user_id, refreshed_at, updated_at, created_at")
      .order("id", { ascending: true })
      .range(from, to)
  );
  for (const session of sessions) {
    const stamp =
      session.refreshed_at || session.updated_at || session.created_at;
    if (!stamp) continue;
    const existing = lastActive[session.user_id];
    if (!existing || stamp > existing) {
      lastActive[session.user_id] = stamp;
    }
  }
  return lastActive;
}

/**
 * @brief Ticket totals for every support ticket (unscoped).
 * @param supabase Service-role client.
 * @returns Map of user id → ticket count.
 */
async function ticketTotalsAllUsers(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>
): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  try {
    const tickets = await fetchAllRangedRows<{ user_id?: string }>(
      (from, to) =>
        supabase
          .from("support_tickets")
          .select("user_id")
          .order("id", { ascending: true })
          .range(from, to)
    );
    for (const row of tickets) {
      const userId = row.user_id;
      if (!userId) continue;
      totals[userId] = (totals[userId] ?? 0) + 1;
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") return totals;
    console.error("[CRM] Error fetching all tickets for sort:", error);
    throw error;
  }
  return totals;
}

/**
 * @brief Pages last-active / tickets / products without scanning every $0 profile.
 * @param supabase Service-role client.
 * @param searchTerm Optional CRM search.
 * @param subscriptionFilter CRM filter value.
 * @param sortField `lastActive`, `supportTickets`, or `productCount`.
 * @param sortDirection Ascending or descending.
 * @param page 1-based page.
 * @param limit Page size.
 * @param spendIndex Cached spend totals (product-count candidates).
 * @returns Page keys plus extras to seed the table, or null when nobody matches.
 */
async function fetchDerivedMetricPageKeys(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  searchTerm: string | undefined,
  subscriptionFilter: string | undefined,
  sortField: "lastActive" | "supportTickets" | "productCount",
  sortDirection: "asc" | "desc" | undefined,
  page: number,
  limit: number,
  spendIndex: PayingSpendIndex
): Promise<{
  pageKeys: CrmProfileSortKey[];
  extras: CrmProfileSortExtras;
} | null> {
  const direction = sortDirection === "asc" ? "asc" : "desc";
  const payingOnly = subscriptionFilter === "paying";
  const needed = Math.max(0, (page - 1) * limit) + limit;

  const pageFromKeys = async (
    keys: CrmProfileSortKey[],
    extras: CrmProfileSortExtras
  ): Promise<{
    pageKeys: CrmProfileSortKey[];
    extras: CrmProfileSortExtras;
  } | null> => {
    sortCrmProfileKeys(keys, sortField, direction, extras);
    const pageKeys = sliceRankedPage(keys, page, limit);
    return pageKeys.length > 0 ? { pageKeys, extras } : null;
  };

  if (payingOnly || direction === "asc") {
    const keys = await fetchAllFilteredProfileKeys(
      supabase,
      searchTerm,
      subscriptionFilter
    );
    if (!keys?.length) return null;
    const { extras } = await buildCrmSortExtras(
      supabase,
      keys,
      sortField,
      spendIndex
    );
    return pageFromKeys(keys, extras);
  }

  if (sortField === "lastActive") {
    const lastActiveByUserId = await lastActiveByAllSessions(supabase);
    const sessionKeys = await fetchProfileKeysByUserIdsInOrder(
      supabase,
      idsRankedByText(lastActiveByUserId, "desc"),
      searchTerm,
      subscriptionFilter,
      needed
    );
    const newestKeys = await fetchNewestProfileKeys(
      supabase,
      searchTerm,
      subscriptionFilter,
      needed
    );
    const byId = new Map<string, CrmProfileSortKey>();
    for (const key of [...sessionKeys, ...newestKeys]) {
      byId.set(key.id, key);
    }
    const union = Array.from(byId.values());
    const extras: CrmProfileSortExtras = { lastActiveByUserId };
    if (
      canPageFromSpendersOnly(union.length, page, limit, false, "desc")
    ) {
      return pageFromKeys(union, extras);
    }
    const allKeys = await fetchAllFilteredProfileKeys(
      supabase,
      searchTerm,
      subscriptionFilter
    );
    if (!allKeys?.length) return pageFromKeys(union, extras);
    extras.lastActiveByUserId = {
      ...lastActiveByUserId,
      ...(await lastActiveByUserIds(
        supabase,
        allKeys.map((key) => key.id)
      )),
    };
    return pageFromKeys(allKeys, extras);
  }

  if (sortField === "supportTickets") {
    const ticketTotalByUserId = await ticketTotalsAllUsers(supabase);
    const rankedIds = customerIdsRankedBySpend(
      ticketTotalByUserId,
      "desc"
    ).filter((userId) => (ticketTotalByUserId[userId] ?? 0) > 0);
    const ticketKeys = await fetchProfileKeysByUserIdsInOrder(
      supabase,
      rankedIds,
      searchTerm,
      subscriptionFilter,
      needed
    );
    const extras: CrmProfileSortExtras = { ticketTotalByUserId };
    if (
      canPageFromSpendersOnly(ticketKeys.length, page, limit, false, "desc")
    ) {
      return pageFromKeys(ticketKeys, extras);
    }
    const allKeys = await fetchAllFilteredProfileKeys(
      supabase,
      searchTerm,
      subscriptionFilter
    );
    if (!allKeys?.length) return pageFromKeys(ticketKeys, extras);
    extras.ticketTotalByUserId = {
      ...ticketTotalByUserId,
      ...(await ticketTotalsByUserIds(
        supabase,
        allKeys.map((key) => key.id)
      )),
    };
    return pageFromKeys(allKeys, extras);
  }

  const candidateIds = new Set<string>(spendIndex.userIds);
  for (const userId of await productGrantUserIds(supabase)) {
    candidateIds.add(userId);
  }
  const candidateKeys = await fetchProfileKeysByUserIdsInOrder(
    supabase,
    Array.from(candidateIds),
    searchTerm,
    subscriptionFilter
  );
  const productCountByUserId =
    await accessActiveProductCountsByUserId(candidateKeys);
  const withProducts = candidateKeys.filter(
    (key) => (productCountByUserId[key.id] ?? 0) > 0
  );
  const extras: CrmProfileSortExtras = { productCountByUserId };
  if (
    canPageFromSpendersOnly(withProducts.length, page, limit, false, "desc")
  ) {
    return pageFromKeys(withProducts, extras);
  }
  const allKeys = await fetchAllFilteredProfileKeys(
    supabase,
    searchTerm,
    subscriptionFilter
  );
  if (!allKeys?.length) return pageFromKeys(withProducts, extras);
  const remaining = allKeys.filter((key) => !productCountByUserId[key.id]);
  Object.assign(
    productCountByUserId,
    await accessActiveProductCountsByUserId(remaining)
  );
  extras.productCountByUserId = productCountByUserId;
  return pageFromKeys(allKeys, extras);
}

/**
 * @brief Latest session timestamp per user for a set of profile ids.
 * @param supabase Service-role client.
 * @param userIds Profile ids.
 * @returns Map of user id → ISO timestamp.
 */
async function lastActiveByUserIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  userIds: string[]
): Promise<Record<string, string>> {
  const lastActive: Record<string, string> = {};
  for (const chunk of chunkIds(userIds)) {
    try {
      const sessions = await fetchAllRangedRows<{
        user_id: string;
        refreshed_at?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
      }>((from, to) =>
        supabase
          .from("user_sessions")
          .select("user_id, refreshed_at, updated_at, created_at")
          .in("user_id", chunk)
          .order("id", { ascending: true })
          .range(from, to)
      );
      for (const session of sessions) {
        const stamp =
          session.refreshed_at || session.updated_at || session.created_at;
        if (!stamp) continue;
        const existing = lastActive[session.user_id];
        if (!existing || stamp > existing) {
          lastActive[session.user_id] = stamp;
        }
      }
    } catch (error) {
      console.error("[CRM] Error fetching sessions for sort:", error);
      throw error;
    }
  }
  return lastActive;
}

/**
 * @brief Ticket totals per user for a set of profile ids.
 * @param supabase Service-role client.
 * @param userIds Profile ids.
 * @returns Map of user id → ticket count.
 */
async function ticketTotalsByUserIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  userIds: string[]
): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const chunk of chunkIds(userIds)) {
    try {
      const tickets = await fetchAllRangedRows<{ user_id?: string }>(
        (from, to) =>
          supabase
            .from("support_tickets")
            .select("user_id")
            .in("user_id", chunk)
            .order("id", { ascending: true })
            .range(from, to)
      );
      for (const row of tickets) {
        const userId = row.user_id;
        if (!userId) continue;
        totals[userId] = (totals[userId] ?? 0) + 1;
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "42P01") continue;
      console.error("[CRM] Error fetching tickets for sort:", error);
      throw error;
    }
  }
  return totals;
}

/**
 * @brief Free-checkout order counts (email + minute buckets) for profile emails.
 * @param supabase Service-role client.
 * @param keys Profile keys with emails.
 * @returns Map of user id → free checkout order count.
 */
async function freeCheckoutOrderCountsByUserId(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  keys: CrmProfileSortKey[]
): Promise<Record<string, number>> {
  const emailToUserIds = new Map<string, string[]>();
  for (const key of keys) {
    const email = key.email?.toLowerCase().trim();
    if (!email) continue;
    const list = emailToUserIds.get(email) ?? [];
    list.push(key.id);
    emailToUserIds.set(email, list);
  }
  const emails = Array.from(emailToUserIds.keys());
  if (emails.length === 0) return {};

  const bucketsByEmail = new Map<string, Set<number>>();
  const MINUTE_MS = 60 * 1000;
  for (const chunk of chunkIds(emails)) {
    try {
      const grantRows = await fetchAllRangedRows<{
        user_email?: string | null;
        granted_at: string;
        notes: string | null;
      }>((from, to) =>
        supabase
          .from("product_grants")
          .select("user_email, granted_at, notes")
          .in("user_email", chunk)
          .order("id", { ascending: true })
          .range(from, to)
      );
      for (const row of grantRows) {
        if (row.notes?.trim().toLowerCase() !== "free checkout") continue;
        const em = String(row.user_email ?? "")
          .toLowerCase()
          .trim();
        if (!em) continue;
        const bucket = Math.floor(
          new Date(row.granted_at).getTime() / MINUTE_MS
        );
        const set = bucketsByEmail.get(em) ?? new Set<number>();
        set.add(bucket);
        bucketsByEmail.set(em, set);
      }
    } catch (error) {
      console.error("[CRM] Error fetching free checkout grants:", error);
    }
  }

  const counts: Record<string, number> = {};
  bucketsByEmail.forEach((set, email) => {
    for (const userId of emailToUserIds.get(email) ?? []) {
      counts[userId] = (counts[userId] ?? 0) + set.size;
    }
  });
  return counts;
}

/**
 * @brief Cached active owned-product count (same source as the table cell and dialog).
 * @param key Profile sort key.
 * @returns Active owned product count.
 */
async function cachedActiveOwnedProductCount(
  key: CrmProfileSortKey
): Promise<number> {
  return unstable_cache(
    () =>
      countActiveOwnedProducts(key.id, {
        customer_id: key.customer_id,
        email: key.email,
      }),
    ["crm-owned-product-count", key.id],
    { revalidate: PAYING_CUSTOMER_CACHE_SECONDS }
  )();
}

/**
 * @brief Active owned-product counts for full-set Products sort.
 * @param keys Matching profile keys.
 * @returns Map of user id → active owned product count.
 */
async function accessActiveProductCountsByUserId(
  keys: CrmProfileSortKey[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const concurrency = 8;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < keys.length) {
      const index = cursor++;
      const key = keys[index];
      if (!key.customer_id && !key.email) {
        counts[key.id] = 0;
        continue;
      }
      try {
        counts[key.id] = await cachedActiveOwnedProductCount(key);
      } catch (error) {
        console.error(
          `[CRM] Error counting owned products for ${key.id}:`,
          error
        );
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(keys.length, 1)) }, () =>
      worker()
    )
  );
  return counts;
}

/**
 * @brief Builds sort extras and order counts for a full CRM key list.
 * @param supabase Service-role client.
 * @param keys Matching profile keys.
 * @param sortField Frontend sort field.
 * @param spendIndex Cached Stripe spend index.
 * @returns Sort extras plus per-user paid+free order counts.
 */
async function buildCrmSortExtras(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRole>>,
  keys: CrmProfileSortKey[],
  sortField: string | undefined,
  spendIndex: PayingSpendIndex
): Promise<{ extras: CrmProfileSortExtras; orderCountByUserId: Record<string, number> }> {
  const userIds = keys.map((key) => key.id);
  const extras: CrmProfileSortExtras = {
    spentCentsByUserId: spendIndex.spentCentsByUserId,
    spentCentsByCustomerId: spendIndex.spentCentsByCustomerId,
  };
  const orderCountByUserId: Record<string, number> = {};

  if (sortField === "orderCount") {
    const freeOrders = await freeCheckoutOrderCountsByUserId(supabase, keys);
    for (const key of keys) {
      const stripeOrders =
        spendIndex.orderCountByUserId[key.id] ??
        (key.customer_id
          ? (spendIndex.orderCountByCustomerId[key.customer_id] ?? 0)
          : 0);
      orderCountByUserId[key.id] = stripeOrders + (freeOrders[key.id] ?? 0);
    }
    extras.orderCountByUserId = orderCountByUserId;
  }

  if (sortField === "lastActive") {
    extras.lastActiveByUserId = await lastActiveByUserIds(supabase, userIds);
  }
  if (sortField === "supportTickets") {
    extras.ticketTotalByUserId = await ticketTotalsByUserIds(supabase, userIds);
  }
  if (sortField === "productCount") {
    extras.productCountByUserId = await accessActiveProductCountsByUserId(keys);
  }

  return { extras, orderCountByUserId };
}

/**
 * Fetches paginated users with their Stripe data for the CRM
 * Does NOT fetch total count - use getUsersForCRMCount separately
 */
export async function getAllUsersForCRM(
  page: number = 1,
  limit: number = 50,
  searchTerm?: string,
  subscriptionFilter?: string,
  sortField?: string,
  sortDirection?: "asc" | "desc"
): Promise<{
  users: UserData[];
  error?: string;
}> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    // Query from profiles table which now includes email column (synced from auth.users)
    // This allows sorting and filtering by email at the database level
    let query = supabase.from("profiles").select("*", { count: "exact" });

    // Handle admin filter separately (admin is not a subscription type)
    let adminUserIds: string[] | null = null;
    if (subscriptionFilter === "admin") {
      // Get all admin user IDs
      const { data: admins, error: adminsError } = await supabase
        .from("admins")
        .select("user");

      if (!adminsError && admins) {
        adminUserIds = admins.map((admin: { user: string }) => admin.user);
        if (adminUserIds.length > 0) {
          query = query.in("id", adminUserIds);
        } else {
          // No admins found - return empty result
          query = query.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      } else {
        // Error fetching admins - return empty result
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    } else if (subscriptionFilter && subscriptionFilter !== "all" && subscriptionFilter !== "paying") {
      // Apply subscription filter for valid subscription types
      const validSubscriptionTypes: SubscriptionType[] = [
        "none",
        "monthly",
        "annual",
        "lifetime",
      ];
      if (
        validSubscriptionTypes.includes(subscriptionFilter as SubscriptionType)
      ) {
        query = query.eq(
          "subscription",
          subscriptionFilter as SubscriptionType
        );
      }
    }

    query = applyCrmSearchFilter(query, searchTerm);

    const needsSpendIndex =
      subscriptionFilter === "paying" ||
      sortField === "totalSpent" ||
      sortField === "orderCount" ||
      sortField === "productCount";
    let spendIndex = emptySpendIndex();
    if (needsSpendIndex) {
      try {
        spendIndex = await getPayingStripeSpendIndex();
      } catch (spendError) {
        console.error("[CRM] Error loading Stripe spend index:", spendError);
        if (
          sortField === "totalSpent" ||
          sortField === "orderCount" ||
          sortField === "productCount" ||
          subscriptionFilter === "paying"
        ) {
          throw spendError;
        }
      }
    }
    let seededOrderCountByUserId: Record<string, number> | null = null;
    let seededProductCountByUserId: Record<string, number> | null = null;
    let seededLastActiveByUserId: Record<string, string> | null = null;
    let allProfiles: any[] | null = null;
    const needsFullScan =
      subscriptionFilter === "paying" || isDerivedCrmSortField(sortField);

    if (sortField === "totalSpent") {
      const pageKeys = await fetchTotalSpentPageKeys(
        supabase,
        searchTerm,
        subscriptionFilter,
        sortDirection,
        page,
        limit,
        spendIndex
      );
      if (!pageKeys || pageKeys.length === 0) {
        return { users: [] };
      }
      allProfiles = await fetchProfilesByOrderedIds(
        supabase,
        pageKeys.map((key) => key.id)
      );
    } else if (
      sortField === "lastActive" ||
      sortField === "supportTickets" ||
      sortField === "productCount"
    ) {
      const derived = await fetchDerivedMetricPageKeys(
        supabase,
        searchTerm,
        subscriptionFilter,
        sortField,
        sortDirection,
        page,
        limit,
        spendIndex
      );
      if (!derived || derived.pageKeys.length === 0) {
        return { users: [] };
      }
      if (sortField === "productCount") {
        seededProductCountByUserId = derived.extras.productCountByUserId ?? {};
      }
      if (sortField === "lastActive") {
        seededLastActiveByUserId = derived.extras.lastActiveByUserId ?? {};
      }
      allProfiles = await fetchProfilesByOrderedIds(
        supabase,
        derived.pageKeys.map((key) => key.id)
      );
    } else if (needsFullScan) {
      const keys = await fetchAllFilteredProfileKeys(
        supabase,
        searchTerm,
        subscriptionFilter
      );
      if (!keys || keys.length === 0) {
        return { users: [] };
      }
      const { extras, orderCountByUserId } = await buildCrmSortExtras(
        supabase,
        keys,
        sortField,
        spendIndex
      );
      seededOrderCountByUserId =
        sortField === "orderCount" ? orderCountByUserId : null;
      if (sortField === "productCount") {
        seededProductCountByUserId = extras.productCountByUserId ?? null;
      }
      sortCrmProfileKeys(keys, sortField, sortDirection, extras);
      const offset = (page - 1) * limit;
      const pageKeys = keys.slice(offset, offset + limit);
      if (pageKeys.length === 0) {
        return { users: [] };
      }
      allProfiles = await fetchProfilesByOrderedIds(
        supabase,
        pageKeys.map((key) => key.id)
      );
    }

    // Map frontend sort fields to database column names
    // All these fields can be sorted at the database level before pagination
    const dbSortableFields: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      subscription: "subscription",
      createdAt: "created_at",
      email: "email", // Email is now available in profiles table (synced from auth.users)
    };

    // Apply sorting to the query if the field can be sorted in the database
    // This MUST be done BEFORE pagination to ensure correct results
    if (allProfiles === null && sortField && sortField in dbSortableFields) {
      const dbSortField = dbSortableFields[sortField];
      const ascending = sortDirection === "asc";

      console.log(
        `Applying database sort: field=${sortField}, dbField=${dbSortField}, direction=${sortDirection}, ascending=${ascending}`
      );

      // For firstName, sort by both first_name and last_name for proper alphabetical sorting
      // Users without names (NULL or empty string) should always appear last
      if (sortField === "firstName") {
        // Include all users but ensure those without names sort last
        // Strategy: Sort by "has a name" first (users with names first), then alphabetically
        // This ensures:
        // - Users WITH names are sorted alphabetically (A-Z or Z-A based on direction)
        // - Users WITHOUT names always appear at the end (regardless of sort direction)

        console.log(
          `Sorting by firstName: users with names will sort ${
            ascending ? "A-Z" : "Z-A"
          }, users without names always last`
        );

        // First order by whether the field is empty/null (0 = has name, 1 = no name)
        // Then order by the actual field value
        query = query
          .order("first_name", {
            ascending,
            nullsFirst: false, // Treat NULL and empty as equal, sort to end
          })
          .order("last_name", {
            ascending,
            nullsFirst: false, // Secondary sort by last name
          });
      } else if (sortField === "lastName") {
        // Similar logic for lastName: sort by lastName first, then firstName
        // Users without either name will appear at the end
        console.log(
          `Sorting by lastName: users with names will sort ${
            ascending ? "A-Z" : "Z-A"
          }, users without names always last`
        );

        query = query
          .order("last_name", {
            ascending,
            nullsFirst: false, // Treat NULL and empty as equal, sort to end
          })
          .order("first_name", {
            ascending,
            nullsFirst: false, // Secondary sort by first name
          });
      } else {
        query = query.order(dbSortField, {
          ascending,
          nullsFirst: false, // NULLs always last
        });
      }
    } else if (allProfiles === null) {
      // Default sorting by updated_at desc if no sort specified or field can't be sorted in DB
      // Note: Fields like 'email', 'lastActive', and 'totalSpent' cannot be sorted at DB level
      // as they require data from external sources (auth.users, stripe API, etc)
      if (!sortField) {
        console.log(
          "No sort field specified, using default sort by updated_at desc"
        );
      } else {
        console.log(
          `Sort field ${sortField} cannot be sorted in database (${sortField} field not in dbSortableFields), using default sort`
        );
      }
      query = query.order("updated_at", {
        ascending: false,
        nullsFirst: false,
      });
    }

    if (allProfiles === null) {
      // All sorting and filtering happens at the database level
      // Apply pagination at the database level (always, for all sort types)
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error: profilesError } = await query;

      if (profilesError) {
        console.error("Error fetching profiles for CRM:", profilesError);
        throw profilesError;
      }

      allProfiles = data ?? [];
    }

    if (!allProfiles || allProfiles.length === 0) {
      console.log("No profiles found for CRM query");
      return { users: [] };
    }

    // Rest of the function uses allProfiles
    const profiles = allProfiles;

    // Fetch NFR status from user_management table for all users
    const userEmails = profiles
      .map((p) => (p as typeof p & { email?: string }).email)
      .filter((email): email is string => !!email && email.length > 0);

    const nfrByUserId: Record<string, boolean> = {};
    const nfrByEmail: Record<string, boolean> = {};
    const profileIds = profiles.map((p) => (p as { id: string }).id);
    const normalizedEmails = userEmails.map((e) => e.toLowerCase().trim());
    if (profileIds.length > 0 || normalizedEmails.length > 0) {
      try {
        const nfrByIdRows: Array<{
          user_id?: string | null;
          user_email?: string | null;
          pro?: boolean | null;
        }> = [];
        const nfrByEmailRows: Array<{
          user_id?: string | null;
          user_email?: string | null;
          pro?: boolean | null;
        }> = [];
        for (const chunk of chunkIds(profileIds)) {
          const { data, error } = await supabase
            .from("user_management")
            .select("user_id, user_email, pro")
            .in("user_id", chunk);
          if (error) throw error;
          if (data) nfrByIdRows.push(...data);
        }
        for (const chunk of chunkIds(normalizedEmails)) {
          const { data, error } = await supabase
            .from("user_management")
            .select("user_id, user_email, pro")
            .in("user_email", chunk);
          if (error) throw error;
          if (data) nfrByEmailRows.push(...data);
        }
        const byIdsRes = { data: nfrByIdRows, error: null };
        const byEmailsRes = { data: nfrByEmailRows, error: null };

        const nfrError = byIdsRes.error ?? byEmailsRes.error;
        const nfrRecords = [
          ...(byIdsRes.data ?? []),
          ...(byEmailsRes.data ?? []),
        ];

        if (!nfrError && nfrRecords.length > 0) {
          nfrRecords.forEach(
            (record: {
              user_id?: string | null;
              user_email?: string | null;
              pro?: boolean | null;
            }) => {
              if (record.user_id) {
                nfrByUserId[record.user_id] = record.pro ?? false;
              }
              const em = record.user_email?.toLowerCase().trim();
              if (em) {
                nfrByEmail[em] = record.pro ?? false;
              }
            }
          );
        }
      } catch (nfrErr) {
        console.error("Error fetching NFR status:", nfrErr);
      }
    }

    const nfrEmailsNeedingEliteGrantCheck = profiles
      .map((p) => {
        const em = (p as typeof p & { email?: string }).email || "";
        const norm = em.toLowerCase().trim();
        const pid = (p as { id: string }).id;
        const hasNfr = norm
          ? (nfrByUserId[pid] ?? nfrByEmail[norm] ?? false)
          : false;
        return { norm, hasNfr };
      })
      .filter((x) => x.hasNfr && x.norm)
      .map((x) => x.norm);

    let eliteNfrEmailSet = new Set<string>();
    if (nfrEmailsNeedingEliteGrantCheck.length > 0) {
      try {
        eliteNfrEmailSet =
          await getNormalizedEmailsWithUltimateBundleProductGrants(
            supabase,
            nfrEmailsNeedingEliteGrantCheck,
          );
      } catch (eliteNfrErr) {
        console.error("Error resolving elite-bundle NFR grants:", eliteNfrErr);
      }
    }

    // Build users array immediately with basic data from profiles
    // This allows the UI to show users right away while additional data loads
    const users: UserData[] = [];

    for (const profile of profiles) {
      const userEmail =
        (profile as typeof profile & { email?: string }).email || "";
      const normalizedEmail = userEmail.toLowerCase().trim();
      const hasNfr =
        nfrByUserId[profile.id] ??
        (normalizedEmail ? nfrByEmail[normalizedEmail] : false) ??
        false;

      const p = profile as typeof profile & {
        nnaudio_access_installer_macos_at?: string | null;
        nnaudio_access_installer_windows_at?: string | null;
      };
      users.push({
        id: profile.id,
        email: userEmail,
        firstName: profile.first_name || undefined,
        lastName: profile.last_name || undefined,
        subscription: profile.subscription || "none",
        customerId: profile.customer_id || undefined,
        subscriptionExpiration: profile.subscription_expiration || undefined,
        trialExpiration: profile.trial_expiration || undefined,
        createdAt:
          profile.created_at ||
          profile.updated_at ||
          new Date().toISOString(),
        lastActive:
          seededLastActiveByUserId?.[profile.id] ||
          profile.created_at ||
          profile.updated_at ||
          new Date().toISOString(),
        totalSpent: needsSpendIndex
          ? (spendIndex.spentCentsByUserId[profile.id] ??
              (profile.customer_id
                ? (spendIndex.spentCentsByCustomerId[profile.customer_id] ??
                  0)
                : 0)) / 100
          : -1,
        orderCount: seededOrderCountByUserId
          ? (seededOrderCountByUserId[profile.id] ?? 0)
          : -1,
        productCount: seededProductCountByUserId
          ? (seededProductCountByUserId[profile.id] ?? 0)
          : -1,
        hasNfr,
        hasNfrEliteBundle:
          hasNfr && eliteNfrEmailSet.has(normalizedEmail),
        nnaudioAccessInstallerMacosAt: p.nnaudio_access_installer_macos_at ?? null,
        nnaudioAccessInstallerWindowsAt:
          p.nnaudio_access_installer_windows_at ?? null,
      });
    }

    // Return users immediately - additional data will be fetched separately
    return {
      users,
    };
  } catch (error) {
    console.error("Error fetching users for CRM:", error);
    return {
      users: [],
      error:
        error instanceof Error ? error.message : "Failed to fetch users",
    };
  }
}

/**
 * Fetches additional user data (lastActive, totalSpent, orderCount) for given user IDs
 * This is called separately after users are displayed to improve perceived performance
 * @note orderCount includes paid Stripe charges plus $0 shop checkouts recorded as product_grants (notes "Free checkout"), grouped per email/minute like my-orders.
 */
export async function getAdditionalUserData(userIds: string[]): Promise<{
  lastActive: Record<string, string>;
  totalSpent: Record<string, number>;
  orderCount: Record<string, number>;
}> {
  await requireAdminAction();
  const lastActiveMap: Record<string, string> = {};
  const totalSpentMap: Record<string, number> = {};
  const orderCountMap: Record<string, number> = {};

    if (userIds.length === 0) {
    return { lastActive: lastActiveMap, totalSpent: totalSpentMap, orderCount: orderCountMap };
  }

  try {
    const supabase = await createSupabaseServiceRole();
    let spendIndex: PayingSpendIndex = emptySpendIndex();
    try {
      spendIndex = await getPayingStripeSpendIndex();
    } catch (spendError) {
      console.error("[CRM] Error loading Stripe spend index:", spendError);
    }
    Object.assign(lastActiveMap, await lastActiveByUserIds(supabase, userIds));

    const keys: CrmProfileSortKey[] = [];
    for (const chunk of chunkIds(userIds)) {
      const { data, error } = await supabase
        .from("profiles")
        .select(CRM_PROFILE_KEY_COLUMNS)
        .in("id", chunk);
      if (error) {
        console.error("Error fetching customer IDs:", error);
        return {
          lastActive: lastActiveMap,
          totalSpent: totalSpentMap,
          orderCount: orderCountMap,
        };
      }
      keys.push(...((data ?? []) as CrmProfileSortKey[]));
    }

    const freeOrders = await freeCheckoutOrderCountsByUserId(supabase, keys);
    for (const profile of keys) {
      const totalCents =
        spendIndex.spentCentsByUserId[profile.id] ??
        (profile.customer_id
          ? (spendIndex.spentCentsByCustomerId[profile.customer_id] ?? 0)
          : 0);
      totalSpentMap[profile.id] = totalCents / 100;
      const stripeOrd =
        spendIndex.orderCountByUserId[profile.id] ??
        (profile.customer_id
          ? (spendIndex.orderCountByCustomerId[profile.customer_id] ?? 0)
          : 0);
      orderCountMap[profile.id] = stripeOrd + (freeOrders[profile.id] ?? 0);
    }

    return { lastActive: lastActiveMap, totalSpent: totalSpentMap, orderCount: orderCountMap };
  } catch (error) {
    console.error("Error fetching additional user data:", error);
    return { lastActive: lastActiveMap, totalSpent: totalSpentMap, orderCount: orderCountMap };
  }
}

/**
 * Fetches monthly revenue trend data
 */
export async function getMonthlyRevenueTrend(months: number = 12): Promise<{
  labels: string[];
  data: number[];
}> {
  await requireAdminAction();
  try {
    const supabase = await createSupabaseServiceRole();

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      labels.push(
        date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      );

      // Get invoices for this month directly from Stripe API
      let invoiceRevenue = 0;
      try {
        const invoices = await stripe.invoices.list({
          created: {
            gte: Math.floor(monthStart.getTime() / 1000),
            lte: Math.floor(monthEnd.getTime() / 1000),
          },
          status: "paid",
          limit: 100, // Stripe API limit
        });

        invoiceRevenue = invoices.data.reduce(
          (sum, inv) => sum + (inv.amount_paid || 0),
          0
        );

        // Handle pagination if there are more than 100 invoices
        let hasMore = invoices.has_more;
        let lastInvoiceId = invoices.data[invoices.data.length - 1]?.id;
        while (hasMore && lastInvoiceId) {
          const nextPage = await stripe.invoices.list({
            created: {
              gte: Math.floor(monthStart.getTime() / 1000),
              lte: Math.floor(monthEnd.getTime() / 1000),
            },
            status: "paid",
            limit: 100,
            starting_after: lastInvoiceId,
          });

          invoiceRevenue += nextPage.data.reduce(
            (sum, inv) => sum + (inv.amount_paid || 0),
            0
          );

          hasMore = nextPage.has_more;
          lastInvoiceId = nextPage.data[nextPage.data.length - 1]?.id;
        }
      } catch (err) {
        console.error(
          `Error fetching invoices for month ${labels[labels.length - 1]}:`,
          err
        );
      }

      // Get payment intents for this month directly from Stripe API
      let paymentRevenue = 0;
      try {
        const paymentIntents = await stripe.paymentIntents.list({
          created: {
            gte: Math.floor(monthStart.getTime() / 1000),
            lte: Math.floor(monthEnd.getTime() / 1000),
          },
          limit: 100, // Stripe API limit
        });

        paymentRevenue = paymentIntents.data
          .filter((pi) => pi.status === "succeeded" && !(pi as Stripe.PaymentIntent & { refunded?: boolean }).refunded)
          .reduce((sum, pi) => sum + (pi.amount || 0), 0);

        // Handle pagination if there are more than 100 payment intents
        let hasMore = paymentIntents.has_more;
        let lastPaymentId =
          paymentIntents.data[paymentIntents.data.length - 1]?.id;
        while (hasMore && lastPaymentId) {
          const nextPage = await stripe.paymentIntents.list({
            created: {
              gte: Math.floor(monthStart.getTime() / 1000),
              lte: Math.floor(monthEnd.getTime() / 1000),
            },
            limit: 100,
            starting_after: lastPaymentId,
          });

          paymentRevenue += nextPage.data
            .filter((pi) => pi.status === "succeeded" && !(pi as Stripe.PaymentIntent & { refunded?: boolean }).refunded)
            .reduce((sum, pi) => sum + (pi.amount || 0), 0);

          hasMore = nextPage.has_more;
          lastPaymentId = nextPage.data[nextPage.data.length - 1]?.id;
        }
      } catch (err) {
        console.error(
          `Error fetching payment intents for month ${
            labels[labels.length - 1]
          }:`,
          err
        );
      }

      data.push((invoiceRevenue + paymentRevenue) / 100);
    }

    return { labels, data };
  } catch (error) {
    console.error("Error fetching monthly revenue trend:", error);
    return { labels: [], data: [] };
  }
}

/**
 * Fetches comprehensive analytics data over time
 * Returns data points for each day (for month view) or month (for year view)
 */
export async function getAnalyticsTimeSeries(
  timeRange: 'month' | 'year'
): Promise<Array<{
  date: string;
  users: number;
  subscriptions: number;
  revenue: number;
  mrr: number;
  churnRate: number;
  sevenDayTrials: number;
  fourteenDayTrials: number;
}>> {
  await requireAdminAction();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("STRIPE_SECRET_KEY not set, returning empty analytics data");
      return [];
    }

    const supabase = await createSupabaseServiceRole();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return [];
    }

    // Use Promise.all to fetch data in parallel for faster loading
    const [usersResult, profilesResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("subscription, trial_expiration"),
    ]);

    const data: Array<{
      date: string;
      users: number;
      subscriptions: number;
      revenue: number;
      mrr: number;
      churnRate: number;
      sevenDayTrials: number;
      fourteenDayTrials: number;
    }> = [];

    // Reduce periods for faster loading - use weekly/monthly aggregation
    const periods = timeRange === 'month' ? 7 : 12; // 7 days or 12 months
    
    const totalUsers = usersResult.count || 0;
    const allProfiles = profilesResult.data || [];
    
    // Fetch balance transactions and subscriptions in parallel
    const startDate = new Date();
    if (timeRange === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setMonth(startDate.getMonth() - 12);
    }
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(Date.now() / 1000);
    
    // Fetch both in parallel for faster loading
    const [transactionsResult, subscriptionsResult] = await Promise.allSettled([
      stripe.balanceTransactions.list({
        created: { gte: startTimestamp, lte: endTimestamp },
        limit: 500, // Reduced limit for faster loading
      }),
      stripe.subscriptions.list({
        status: "all",
        created: { lte: endTimestamp },
        limit: 500, // Reduced limit for faster loading
      }),
    ]);
    
    const allBalanceTransactions = transactionsResult.status === 'fulfilled' 
      ? transactionsResult.value.data 
      : [];
    const allSubscriptions = subscriptionsResult.status === 'fulfilled'
      ? subscriptionsResult.value.data
      : [];

    // Generate time periods (aggregated for faster loading)
    for (let i = periods - 1; i >= 0; i--) {
      const periodDate = new Date();
      if (timeRange === 'month') {
        // Group by ~4 days for 7 data points over 30 days
        periodDate.setDate(periodDate.getDate() - (i * 4));
      } else {
        periodDate.setMonth(periodDate.getMonth() - i);
        periodDate.setDate(1);
      }

      const periodStart = new Date(periodDate);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(periodStart);
      if (timeRange === 'month') {
        // 4-day periods
        periodEnd.setDate(periodEnd.getDate() + 4);
        periodEnd.setHours(23, 59, 59, 999);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0);
        periodEnd.setHours(23, 59, 59, 999);
      }

      const periodStartTimestamp = Math.floor(periodStart.getTime() / 1000);
      const periodEndTimestamp = Math.floor(periodEnd.getTime() / 1000);

      // Calculate metrics from pre-fetched data
      const usersCount = totalUsers || 0;

      const subscriptionsCount = allProfiles?.filter(p => 
        p.subscription === "monthly" || p.subscription === "annual"
      ).length || 0;

      // Calculate revenue from pre-fetched transactions
      const revenueRaw = allBalanceTransactions
        .filter(t => {
          const created = t.created;
          return created >= periodStartTimestamp && 
                 created <= periodEndTimestamp && 
                 t.type === "charge" && 
                 t.amount > 0;
        })
        .reduce((sum, t) => sum + t.amount, 0) / 100;
      // Round to nearest cent
      const revenue = Math.round(revenueRaw * 100) / 100;

      // Calculate MRR from pre-fetched subscriptions
      let mrrRaw = 0;
      const activeSubs = allSubscriptions.filter(s => {
        const created = s.created;
        return created <= periodEndTimestamp && 
               s.status === "active" && 
               !s.cancel_at_period_end;
      });
      
      for (const sub of activeSubs) {
        const item = sub.items.data[0];
        if (!item?.price) continue;
        const amount = (item.price.unit_amount || 0) / 100;
        const interval = item.price.recurring?.interval;
        if (interval === "month") {
          mrrRaw += amount;
        } else if (interval === "year") {
          mrrRaw += amount / 12;
        }
      }
      // Round to nearest cent
      const mrr = Math.round(mrrRaw * 100) / 100;

      // Calculate churn rate
      const periodSubs = allSubscriptions.filter(s => s.created <= periodEndTimestamp);
      const canceled = periodSubs.filter(s => 
        s.status === "canceled" || 
        s.status === "unpaid" || 
        (s.status === "active" && s.cancel_at_period_end)
      ).length;
      const churnRate = periodSubs.length > 0 ? (canceled / periodSubs.length) * 100 : 0;

      // Calculate trials
      const trialProfiles = allProfiles?.filter(p => 
        p.subscription === "none" && 
        p.trial_expiration &&
        new Date(p.trial_expiration) >= periodStart &&
        new Date(p.trial_expiration) <= periodEnd
      ) || [];
      
      const trialCount = trialProfiles.length;
      const sevenDayTrials = Math.floor(trialCount * 0.5);
      const fourteenDayTrials = trialCount - sevenDayTrials;

      data.push({
        date: timeRange === 'month'
          ? periodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : periodDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: usersCount,
        subscriptions: subscriptionsCount,
        revenue,
        mrr,
        churnRate: Math.round(churnRate * 10) / 10,
        sevenDayTrials,
        fourteenDayTrials,
      });
    }

    return data;
  } catch (error) {
    console.error("Error fetching analytics time series:", error);
    // Return empty array on error to prevent breaking the UI
    return [];
  }
}
