/**
 * @fileoverview Keeps Stripe customer email aligned with Supabase auth email.
 * @module utils/stripe/sync-customer-email
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { stripe } from "@/utils/stripe/client";

/**
 * @brief Updates Stripe customer email when the linked profile has a Stripe customer id.
 * @param supabase - Client that can read `profiles` for `userId` (user session or service role).
 * @param userId - Supabase auth user id
 * @param email - Target email (typically `auth.users.email` after verification).
 * @returns Resolves when Stripe call completes or is skipped; logs warnings on failure.
 */
export async function syncStripeCustomerEmailFromProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string
): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.customer_id) {
    return;
  }

  try {
    await stripe.customers.update(profile.customer_id, { email: trimmed });
  } catch (err) {
    console.warn(
      "[syncStripeCustomerEmailFromProfile] Could not update Stripe customer email:",
      err
    );
  }
}
