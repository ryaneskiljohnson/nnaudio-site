/**
 * @fileoverview Central Stripe client for the application.
 * @module utils/stripe/client
 *
 * Single place to create and configure the Stripe SDK client. Ensures
 * consistent API version and configuration across app, API routes, and utils.
 * Client is lazy-initialized so build (e.g. Vercel) can run without STRIPE_SECRET_KEY.
 * Scripts that need a custom key can use getStripeClient(secretKey).
 */

import Stripe from "stripe";

/** API version pinned to match Stripe SDK types (see stripe.types.apiVersion). */
const STRIPE_API_VERSION = "2026-01-28.clover" as const;

let _stripe: Stripe | null = null;

/**
 * Returns the default Stripe client (STRIPE_SECRET_KEY from env).
 * Lazy-initialized so importing this module does not throw when the key is
 * missing at build time (e.g. Vercel collecting page data).
 *
 * @throws If STRIPE_SECRET_KEY is missing when first used at runtime
 */
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Set it in .env.local (local) or Vercel project env (production)."
    );
  }
  _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return _stripe;
}

/**
 * Default Stripe client. Use in app code, API routes, and server actions.
 * Created on first use so build can complete without env.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
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

export type { Stripe };
