/**
 * @fileoverview Billing-period helpers for Stripe API 2025+ (clover).
 * @module utils/stripe/subscription-period
 *
 * Stripe moved `current_period_start` / `current_period_end` from Subscription
 * onto SubscriptionItem. Older code still reads them on the subscription.
 */

export type PeriodUnix = {
  current_period_start: number | undefined;
  current_period_end: number | undefined;
};

type PeriodFields = {
  current_period_start?: number;
  current_period_end?: number;
};

type ItemLike = PeriodFields;

type SubscriptionLike = PeriodFields & {
  items?: { data?: ItemLike[] } | ItemLike[];
};

function firstItem(sub: SubscriptionLike): ItemLike | undefined {
  const items = sub.items;
  if (!items) return undefined;
  if (Array.isArray(items)) return items[0];
  return items.data?.[0];
}

/**
 * Unix seconds for the current billing period, from the subscription (legacy)
 * or the first subscription item (current Stripe API).
 */
export function subscriptionPeriodUnix(sub: SubscriptionLike): PeriodUnix {
  const item = firstItem(sub);
  const start = sub.current_period_start ?? item?.current_period_start;
  const end = sub.current_period_end ?? item?.current_period_end;
  return {
    current_period_start: typeof start === "number" ? start : undefined,
    current_period_end: typeof end === "number" ? end : undefined,
  };
}
