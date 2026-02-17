/**
 * @fileoverview Clears the Facebook access token httpOnly cookie (disconnect).
 * @module app/api/facebook-ads/disconnect/route
 */

import { NextResponse } from "next/server";
import { FACEBOOK_TOKEN_COOKIE_NAME } from "@/utils/facebook/api";

/**
 * POST /api/facebook-ads/disconnect
 * Clears the Facebook token cookie. Call from client when user disconnects.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(FACEBOOK_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
