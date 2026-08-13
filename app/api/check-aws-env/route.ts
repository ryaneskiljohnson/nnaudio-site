import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/utils/auth/require-cron";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return only presence booleans — never any portion of credential material.
  return NextResponse.json({
    message: "AWS Environment Variables Check",
    environment: {
      hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      regionSet: !!process.env.AWS_REGION,
      nodeEnv: process.env.NODE_ENV,
      cronSecretSet: !!process.env.CRON_SECRET,
    },
  });
}
