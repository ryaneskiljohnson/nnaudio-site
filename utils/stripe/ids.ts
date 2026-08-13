/**
 * @fileoverview Stripe object-id format checks. Reject anything that is not a
 * plausible cs_/pi_ id before interpolating into Stripe search queries or
 * hitting the API with attacker-controlled strings.
 * @module utils/stripe/ids
 */

const MAX_STRIPE_ID_LENGTH = 255;

/** Checkout Session ids: cs_test_… / cs_live_… / cs_… */
const CHECKOUT_SESSION_ID_RE = /^cs_(?:test_|live_)?[A-Za-z0-9]{8,}$/;

/** PaymentIntent ids: pi_… */
const PAYMENT_INTENT_ID_RE = /^pi_[A-Za-z0-9]{8,}$/;

/**
 * @brief True when `id` is a Stripe Checkout Session id.
 */
export function isStripeCheckoutSessionId(id: string): boolean {
  return (
    id.length > 0 &&
    id.length <= MAX_STRIPE_ID_LENGTH &&
    CHECKOUT_SESSION_ID_RE.test(id)
  );
}

/**
 * @brief True when `id` is a Stripe PaymentIntent id.
 */
export function isStripePaymentIntentId(id: string): boolean {
  return (
    id.length > 0 &&
    id.length <= MAX_STRIPE_ID_LENGTH &&
    PAYMENT_INTENT_ID_RE.test(id)
  );
}

/**
 * @brief True when `id` is a session or payment-intent id accepted by
 * `/api/checkout-session-details` and the checkout-success refresh action.
 */
export function isStripeCheckoutLookupId(id: string): boolean {
  return isStripeCheckoutSessionId(id) || isStripePaymentIntentId(id);
}
