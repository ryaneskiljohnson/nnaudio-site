/**
 * @fileoverview Cron endpoint that sends due post-purchase review invite emails.
 * @module app/api/review-followups/process/route
 */

import { NextRequest, NextResponse } from "next/server";
import { sendDueReviewFollowups } from "@/utils/reviews/review-system";

/**
 * @brief Validates cron authorization for review follow-up processing.
 * @param request Incoming Next.js request.
 * @returns Boolean indicating whether the request is authorized.
 * @note Supports either Vercel Cron or a shared bearer secret.
 * @example
 * const authorized = isAuthorizedCronRequest(request);
 */
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecret = request.headers.get("x-vercel-cron-signature");
  const legacyVercelHeader = request.headers.get("x-vercel-cron");

  if (vercelCronSecret !== null || legacyVercelHeader !== null) {
    return true;
  }

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

/**
 * @brief Processes due review follow-up emails.
 * @param request Incoming Next.js request.
 * @returns JSON response with the number of processed rows.
 * @example
 * POST /api/review-followups/process
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const processed = await sendDueReviewFollowups(25);
    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("[ReviewFollowups] process route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process review followups",
      },
      { status: 500 }
    );
  }
}
