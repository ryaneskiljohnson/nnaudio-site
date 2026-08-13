/**
 * @fileoverview Cron endpoint that sends due post-purchase review invite emails.
 * @module app/api/review-followups/process/route
 */

import { NextRequest, NextResponse } from "next/server";
import { sendDueReviewFollowups } from "@/utils/reviews/review-system";
import { isAuthorizedCronRequest } from "@/utils/auth/require-cron";

/**
 * @brief Processes due review follow-up emails.
 * @param request Incoming Next.js request.
 * @returns JSON response with the number of processed rows.
 * @note Authorized only via `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends this).
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await sendDueReviewFollowups(25);
    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("[ReviewFollowups] process route error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process review followups" },
      { status: 500 }
    );
  }
}

// Vercel Cron invokes via GET; keep POST for manual/back-compat triggers.
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
