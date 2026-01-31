"use server";

import { SubscriptionType } from "@/utils/supabase/types";
import { invalidateUserProductCache } from "@/lib/product-cache";

/**
 * @fileoverview Product access refresh - invalidates cache after purchases
 * Product access is determined by utils/nnaudio-access/access.ts (product_grants + Stripe one-time purchases).
 * This module provides a thin wrapper for cache invalidation when purchases/grants occur.
 * @module utils/subscriptions/check-subscription
 */

export type AuthorizationSource = "stripe" | "none";

export interface AuthorizationResult {
  subscription: SubscriptionType;
  subscriptionExpiration: Date | null;
  source: AuthorizationSource;
  isAuthorized: boolean;
}

/**
 * @brief Invalidates product cache for user (call after purchase or grant)
 * Product access is fetched from Stripe payment intents + product_grants via access.ts.
 * @param userId - Supabase auth user ID
 * @returns Placeholder result for backward compat (subscription model removed)
 */
export async function updateUserProStatus(userId: string): Promise<{
  subscription: SubscriptionType;
  subscriptionExpiration: Date | null;
  source: "stripe" | "none";
}> {
  invalidateUserProductCache(userId);
  return {
    subscription: "none",
    subscriptionExpiration: null,
    source: "none",
  };
}

/**
 * @brief Returns placeholder subscription breakdown (subscription model removed)
 * Product access is determined by getAccessibleProductIds in utils/nnaudio-access/access.ts
 */
export async function getAllUserSubscriptions(
  userId: string,
  _email: string
): Promise<{
  nfr: null;
  stripe: null;
  ios: null;
  final: AuthorizationResult;
}> {
  invalidateUserProductCache(userId);
  return {
    nfr: null,
    stripe: null,
    ios: null,
    final: {
      subscription: "none",
      subscriptionExpiration: null,
      source: "none",
      isAuthorized: false,
    },
  };
}
