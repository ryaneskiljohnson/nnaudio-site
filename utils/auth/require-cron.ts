/**
 * @fileoverview Shared authorization for cron / scheduled API routes.
 * @module utils/auth/require-cron
 *
 * Vercel Cron invokes routes with `Authorization: Bearer ${CRON_SECRET}`.
 * We authorize ONLY on a constant-time match of that bearer secret. Presence of
 * `x-vercel-cron*` headers is NOT trusted (those headers are attacker-spoofable).
 * If `CRON_SECRET` is unset we fail closed.
 */

import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * @brief Constant-time string comparison that tolerates length differences.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * @brief Returns true only when the request carries the correct cron bearer secret.
 * @param request Incoming Next.js request.
 * @returns Whether the caller is an authorized cron invocation.
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Fail closed: never authorize when no secret is configured.
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  const expected = `Bearer ${cronSecret}`;
  return safeEqual(authorization, expected);
}
