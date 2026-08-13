/**
 * @fileoverview Resolves Stripe checkout identity from the session, never from
 * a client-supplied customer id. Guests may only provide an email.
 * @module utils/stripe/trusted-checkout-identity
 */

import { createClient } from "@/utils/supabase/server";

export type TrustedCheckoutIdentity = {
  userId?: string;
  email?: string;
  customerId?: string;
};

/**
 * @brief Pure picker used by checkout routes and tests. Logged-in sessions
 * ignore body.customerId; guests never receive a customer id from the client.
 */
export function pickTrustedCheckoutIdentity(
  session: {
    userId?: string;
    email?: string | null;
    customerId?: string | null;
  } | null,
  body: { email?: string; customerId?: string }
): TrustedCheckoutIdentity {
  const bodyEmail =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim()
      : undefined;

  if (session?.userId) {
    return {
      userId: session.userId,
      email: (session.email && session.email.trim()) || bodyEmail,
      customerId: session.customerId || undefined,
    };
  }

  return {
    email: bodyEmail,
    customerId: undefined,
  };
}

/**
 * @brief Loads the current auth user and profile.customer_id, then applies
 * {@link pickTrustedCheckoutIdentity}.
 */
export async function loadTrustedCheckoutIdentity(body: {
  email?: string;
  customerId?: string;
}): Promise<TrustedCheckoutIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return pickTrustedCheckoutIdentity(null, body);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id")
    .eq("id", user.id)
    .maybeSingle();

  return pickTrustedCheckoutIdentity(
    {
      userId: user.id,
      email: user.email,
      customerId: profile?.customer_id,
    },
    body
  );
}
