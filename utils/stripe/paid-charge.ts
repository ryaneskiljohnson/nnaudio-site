/**
 * @fileoverview Helpers for treating a Stripe charge as a paid order.
 * Used by CRM spend totals and the paying-customers filter.
 * @module utils/stripe/paid-charge
 */

/**
 * @brief True when a charge has a remaining paid amount (not fully refunded).
 * @param charge Stripe charge fields used for paid-order detection.
 * @returns Whether this charge counts as at least one paid order.
 * @note Matches CRM `totalSpent`: paid, not fully refunded, net amount above zero.
 * @example
 * ```ts
 * isPaidStripeCharge({ paid: true, refunded: false, amount: 1995, amount_refunded: 0 });
 * // true
 * ```
 */
export function isPaidStripeCharge(charge: {
  paid: boolean;
  refunded: boolean;
  amount: number;
  amount_refunded?: number | null;
}): boolean {
  if (!charge.paid || charge.refunded) return false;
  return charge.amount - (charge.amount_refunded ?? 0) > 0;
}

/**
 * @brief Reads the Stripe customer id from a charge's customer field.
 * @param charge Charge with string or expanded customer.
 * @returns Customer id, or null when the charge has no customer.
 * @example
 * ```ts
 * stripeCustomerIdFromCharge({ customer: "cus_123" }); // "cus_123"
 * ```
 */
export function stripeCustomerIdFromCharge(charge: {
  customer?: string | { id?: string } | null;
}): string | null {
  if (!charge.customer) return null;
  if (typeof charge.customer === "string") return charge.customer;
  return charge.customer.id ?? null;
}

/**
 * @brief Reads a normalized email from a Stripe charge.
 * @param charge Charge with receipt or billing email.
 * @returns Lowercased trimmed email, or null.
 * @example
 * emailFromStripeCharge({ receipt_email: "A@x.com" }); // "a@x.com"
 */
export function emailFromStripeCharge(charge: {
  receipt_email?: string | null;
  billing_details?: { email?: string | null } | null;
}): string | null {
  const raw = charge.receipt_email || charge.billing_details?.email || null;
  const email = raw?.toLowerCase().trim();
  return email || null;
}
