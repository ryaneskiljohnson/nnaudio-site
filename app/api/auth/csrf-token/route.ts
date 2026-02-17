/**
 * @fileoverview Returns a CSRF token and sets it in an httpOnly cookie for form submissions.
 * @module app/api/auth/csrf-token/route
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { CSRF_COOKIE_NAME } from "@/utils/csrf";
const MAX_AGE = 60 * 60; // 1 hour

/**
 * GET /api/auth/csrf-token
 * Returns a new CSRF token and sets it in a cookie. Call before rendering login/signup forms.
 */
export async function GET() {
  const token = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return response;
}
