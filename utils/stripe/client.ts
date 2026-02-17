/**
 * @fileoverview Central Stripe client for the application.
 * @module utils/stripe/client
 *
 * Single place to create and configure the Stripe SDK client. Ensures
 * consistent API version and configuration across app, API routes, and utils.
 * Scripts that need a custom key can use getStripeClient(secretKey).
 */

import Stripe from "stripe";

/** API version pinned to match Stripe SDK types (see stripe.types.apiVersion). */
const STRIPE_API_VERSION = "2026-01-28.clover" as const;

/**
 * Default Stripe client using STRIPE_SECRET_KEY from env.
 * Use this in app code, API routes, and server actions.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

/**
 * Returns a Stripe client for the given secret key.
 * Use in scripts or when a key other than env STRIPE_SECRET_KEY is needed.
 *
 * @param secretKey - Stripe secret key (sk_...)
 * @returns Stripe client instance
 */
export function getStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

export { stripe };
export type { Stripe };
