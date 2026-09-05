/**
 * @fileoverview Resolves every Stripe customer id that belongs to a CRM profile.
 * Used by admin orders, total-spent, and payment-method checks so email-only
 * spenders match the users table.
 * @module utils/stripe/profile-customers
 */

import { stripe } from "@/utils/stripe/client";
import {
  isPaidStripeCharge,
  stripeCustomerIdFromCharge,
} from "@/utils/stripe/paid-charge";

/**
 * @brief Collects Stripe customer ids from the profile link and Stripe email search.
 * @param profile Profile customer id and email.
 * @returns Deduped customer ids (empty when neither is present).
 * @example
 * await stripeCustomerIdsForProfile({
 *   customer_id: "cus_stale",
 *   email: "a@x.com",
 * });
 */
export async function stripeCustomerIdsForProfile(profile: {
  customer_id?: string | null;
  email?: string | null;
}): Promise<string[]> {
  const ids = new Set<string>();
  if (profile.customer_id) {
    ids.add(profile.customer_id);
  }
  const email = profile.email?.trim();
  if (email) {
    try {
      const listed = await stripe.customers.list({
        email,
        limit: 100,
      });
      for (const customer of listed.data) {
        if (customer.id) ids.add(customer.id);
      }
    } catch (error) {
      console.error("[CRM] Error listing Stripe customers by email:", error);
    }
  }
  return Array.from(ids);
}

/**
 * @brief Sums remaining paid charge cents across one or more Stripe customers.
 * @param customerIds Stripe customer ids.
 * @returns Net paid cents (refunds subtracted).
 * @note Walks every charge page per customer so totals match the CRM index.
 * @example
 * await sumPaidChargeCentsForCustomerIds(["cus_1"]); // 1995
 */
export async function sumPaidChargeCentsForCustomerIds(
  customerIds: string[]
): Promise<number> {
  let total = 0;
  const seen = new Set<string>();
  for (const customerId of customerIds) {
    let startingAfter: string | undefined;
    for (let page = 0; page < 50; page++) {
      const list = await stripe.charges.list({
        customer: customerId,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const charge of list.data) {
        if (seen.has(charge.id)) continue;
        seen.add(charge.id);
        if (!isPaidStripeCharge(charge)) continue;
        total += charge.amount - (charge.amount_refunded ?? 0);
      }
      if (!list.has_more || list.data.length === 0) break;
      startingAfter = list.data[list.data.length - 1]?.id;
      if (!startingAfter) break;
    }
  }
  return total;
}

/**
 * @brief True when any of the customers has a payment method or default source.
 * @param customerIds Stripe customer ids.
 * @returns Whether at least one customer can be charged.
 * @example
 * await anyCustomerHasPaymentMethod(["cus_1"]);
 */
export async function anyCustomerHasPaymentMethod(
  customerIds: string[]
): Promise<boolean> {
  for (const customerId of customerIds) {
    try {
      const [methods, customer] = await Promise.all([
        stripe.paymentMethods.list({ customer: customerId, limit: 1 }),
        stripe.customers.retrieve(customerId),
      ]);
      const hasDefault =
        !customer.deleted &&
        Boolean(customer.invoice_settings?.default_payment_method);
      if (methods.data.length > 0 || hasDefault) {
        return true;
      }
    } catch (error) {
      console.error(
        "[CRM] Error checking payment method for customer:",
        error
      );
    }
  }
  return false;
}
