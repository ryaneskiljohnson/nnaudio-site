/**
 * @fileoverview Clears the Facebook access token and ad account httpOnly cookies (disconnect).
 * @module app/api/facebook-ads/disconnect/route
 */

import { NextResponse } from "next/server";
import { FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from "@/utils/facebook/api";
import { requireAdminResponse } from "@/utils/auth/require-admin";

/**
 * POST /api/facebook-ads/disconnect
 * Clears the Facebook token and ad account cookies so user can reconnect with a different account.
 */
export async function POST() {
  const authError = await requireAdminResponse();
  if (authError) {
    return authError;
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(FACEBOOK_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(FACEBOOK_AD_ACCOUNT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
