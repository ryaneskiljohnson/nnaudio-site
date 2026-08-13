/**
 * @fileoverview DISABLED legacy cart checkout endpoint.
 * @module app/api/stripe/cart-checkout/route
 *
 * This route previously created Stripe Checkout Sessions using client-supplied
 * prices (`price_data.unit_amount` from the request body), which allowed
 * payment manipulation. It has no in-app callers — the storefront uses
 * `/api/payment-intent`, which reprices every line from the database
 * server-side. The endpoint is disabled (410 Gone) to remove the unsafe
 * payment surface rather than leaving it live.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "This endpoint is no longer available." },
    { status: 410 }
  );
}
