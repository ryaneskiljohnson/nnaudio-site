/**
 * @fileoverview Admin Growth Ops readiness API.
 * Validates autonomous growth prerequisites and returns conservative guardrails.
 * @module app/api/admin/growth-ops-readiness/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  evaluateScaleEligibility,
  getGrowthGuardrailsFromEnv,
} from "@/utils/growth/guardrails";

interface ReadinessCheck {
  key: string;
  label: string;
  required: boolean;
  ok: boolean;
  detail: string;
}

/**
 * @brief Verifies request comes from an authenticated admin.
 * @returns Auth result with an optional error response.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: adminCheck } = await supabase
    .from("admins")
    .select("id")
    .eq("user", user.id)
    .single();

  if (!adminCheck) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

/**
 * @brief Builds environment and connectivity readiness checks.
 * @param request - Incoming request with cookies for connection checks.
 * @returns Full list of readiness checks.
 */
function buildReadinessChecks(request: NextRequest): ReadinessCheck[] {
  const facebookTokenCookie = Boolean(request.cookies.get("facebook_access_token")?.value);

  const checks: ReadinessCheck[] = [
    {
      key: "supabase_service_role",
      label: "Supabase service role key",
      required: true,
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: "Required for autonomous jobs that bypass user-session RLS constraints.",
    },
    {
      key: "cron_secret",
      label: "Cron secret",
      required: true,
      ok: Boolean(process.env.CRON_SECRET),
      detail: "Required to securely trigger internal schedulers and autonomous endpoints.",
    },
    {
      key: "facebook_app_credentials",
      label: "Facebook app credentials",
      required: true,
      ok: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      detail: "Required for stable Meta OAuth and campaign operations.",
    },
    {
      key: "facebook_ad_account_id",
      label: "Facebook ad account id",
      required: true,
      ok: Boolean(process.env.FACEBOOK_AD_ACCOUNT_ID),
      detail: "Defines the ad account AI is allowed to operate on.",
    },
    {
      key: "facebook_access_token_cookie",
      label: "Facebook access token cookie",
      required: true,
      ok: facebookTokenCookie,
      detail: "Must be present in the current admin session for live Meta actions.",
    },
    {
      key: "sendgrid_api_key",
      label: "SendGrid API key",
      required: true,
      ok: Boolean(process.env.SENDGRID_API_KEY),
      detail: "Required for lifecycle email execution and relaunch flows.",
    },
    {
      key: "meta_pixel",
      label: "Meta Pixel ID",
      required: false,
      ok: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
      detail: "Recommended to protect attribution quality before scaling.",
    },
    {
      key: "meta_capi",
      label: "Meta CAPI token",
      required: false,
      ok: Boolean(process.env.META_CONVERSIONS_API_TOKEN),
      detail: "Recommended as a server-side attribution backup.",
    },
    {
      key: "gtm",
      label: "GTM container",
      required: false,
      ok: Boolean(process.env.NEXT_PUBLIC_GTM_ID),
      detail: "Recommended for analytics instrumentation hygiene.",
    },
  ];

  return checks;
}

/**
 * @brief Returns Day-1 autonomous growth readiness and conservative operating guardrails.
 * @param request - Incoming HTTP request.
 * @returns JSON readiness report with blocking issues and scaling policy context.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const guardrails = getGrowthGuardrailsFromEnv();
    const checks = buildReadinessChecks(request);
    const blockingIssues = checks.filter((check) => check.required && !check.ok);
    const warnings = checks.filter((check) => !check.required && !check.ok);

    const scalingProbe = evaluateScaleEligibility(
      {
        roas: 0.9,
        conversions: 1,
        cpaUsd: 60,
        hoursSinceLastScale: 6,
      },
      guardrails
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      guardrails,
      summary: {
        readyForAutonomousExecution: blockingIssues.length === 0,
        blockingIssueCount: blockingIssues.length,
        warningCount: warnings.length,
        launchMode: "modest",
      },
      checks,
      policyNotes: [
        "Start with low daily budgets and only scale using positive performance feedback.",
        "Do not scale if required readiness gates are failing.",
        "Prefer one controlled change at a time (budget OR creative OR audience).",
      ],
      scaleSimulation: {
        scenario: "Weak early performance sample",
        eligibleToScale: scalingProbe.eligible,
        reasons: scalingProbe.reasons,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/growth-ops-readiness:", error);
    return NextResponse.json(
      { error: "Failed to evaluate growth ops readiness" },
      { status: 500 }
    );
  }
}

