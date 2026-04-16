/**
 * @fileoverview Admin Growth Ops decision feed API.
 * Returns normalized pause/hold/scale decisions produced by guardrail sweeps.
 * @module app/api/admin/growth-ops/decisions/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/service";

type DecisionKind = "pause" | "hold" | "scale";

interface GuardrailDecision {
  campaignId: string;
  campaignName?: string;
  decision: DecisionKind;
  reason?: string;
  enqueued?: boolean;
  spendUsd?: number;
  conversions?: number;
  cpaUsd?: number;
  roas?: number;
  currentDailyBudgetUsd?: number;
  requestedScaleBudgetUsd?: number;
}

/**
 * @brief Validates authenticated admin access.
 * @returns Admin auth result with optional error response.
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
 * @brief Parses and validates decision filter value from query params.
 * @param value - Raw query string value.
 * @returns Supported decision kind or null when unspecified/invalid.
 */
function parseDecisionFilter(value: string | null): DecisionKind | null {
  if (value === "pause" || value === "hold" || value === "scale") {
    return value;
  }
  return null;
}

/**
 * @brief Normalizes a raw decision payload from JSONB result storage.
 * @param raw - Raw decision value from a sweep result.
 * @returns Sanitized decision object, or null when required fields are missing.
 */
function normalizeDecision(raw: unknown): GuardrailDecision | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const campaignId = typeof item.campaignId === "string" ? item.campaignId.trim() : "";
  const decision = parseDecisionFilter(
    typeof item.decision === "string" ? item.decision.trim().toLowerCase() : null
  );
  if (!campaignId || !decision) {
    return null;
  }

  return {
    campaignId,
    campaignName: typeof item.campaignName === "string" ? item.campaignName : undefined,
    decision,
    reason: typeof item.reason === "string" ? item.reason : undefined,
    enqueued: typeof item.enqueued === "boolean" ? item.enqueued : undefined,
    spendUsd: typeof item.spendUsd === "number" ? item.spendUsd : undefined,
    conversions: typeof item.conversions === "number" ? item.conversions : undefined,
    cpaUsd: typeof item.cpaUsd === "number" ? item.cpaUsd : undefined,
    roas: typeof item.roas === "number" ? item.roas : undefined,
    currentDailyBudgetUsd:
      typeof item.currentDailyBudgetUsd === "number" ? item.currentDailyBudgetUsd : undefined,
    requestedScaleBudgetUsd:
      typeof item.requestedScaleBudgetUsd === "number" ? item.requestedScaleBudgetUsd : undefined,
  };
}

/**
 * @brief Returns recent normalized guardrail decisions for operators.
 * @param request - Incoming request with optional `limit` and `decision` query params.
 * @returns Decision feed and aggregate counts.
 * @note Pulls from succeeded `facebook_guardrail_sweep` queue results to keep one audit source.
 * @example
 * GET /api/admin/growth-ops/decisions?limit=100&decision=scale
 *
 * 200 response:
 * {
 *   "success": true,
 *   "filters": { "limit": 100, "decision": "scale" },
 *   "summary": { "total": 14, "pause": 5, "hold": 2, "scale": 7 },
 *   "decisions": [
 *     {
 *       "sweep_action_id": "uuid",
 *       "sweep_completed_at": "2026-04-16T12:00:00.000Z",
 *       "campaignId": "120000000000",
 *       "decision": "scale",
 *       "reason": "Eligible to scale ..."
 *     }
 *   ]
 * }
 *
 * 401 response:
 * { "error": "Unauthorized" }
 *
 * 403 response:
 * { "error": "Forbidden" }
 *
 * 500 response:
 * { "error": "Failed to load growth decisions" }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") || 100);
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 100, 500));
    const decisionFilter = parseDecisionFilter(url.searchParams.get("decision"));

    const adminClient = await createAdminClient();
    const { data, error } = await (adminClient as any)
      .from("growth_action_queue")
      .select("id, completed_at, created_at, result")
      .eq("action_type", "facebook_guardrail_sweep")
      .eq("status", "succeeded")
      .order("completed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(75);

    if (error) {
      throw error;
    }

    const feed: Array<Record<string, unknown>> = [];
    let pauseCount = 0;
    let holdCount = 0;
    let scaleCount = 0;

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      if (feed.length >= limit) {
        break;
      }

      const rawResult =
        row.result && typeof row.result === "object"
          ? (row.result as Record<string, unknown>)
          : null;
      const rawDecisions = Array.isArray(rawResult?.decisions)
        ? (rawResult?.decisions as unknown[])
        : [];
      for (const rawDecision of rawDecisions) {
        if (feed.length >= limit) {
          break;
        }
        const normalized = normalizeDecision(rawDecision);
        if (!normalized) {
          continue;
        }
        if (decisionFilter && normalized.decision !== decisionFilter) {
          continue;
        }

        if (normalized.decision === "pause") {
          pauseCount += 1;
        } else if (normalized.decision === "hold") {
          holdCount += 1;
        } else {
          scaleCount += 1;
        }

        feed.push({
          sweep_action_id: row.id,
          sweep_completed_at: row.completed_at ?? row.created_at ?? null,
          ...normalized,
        });
      }
    }

    return NextResponse.json({
      success: true,
      filters: {
        limit,
        decision: decisionFilter,
      },
      summary: {
        total: feed.length,
        pause: pauseCount,
        hold: holdCount,
        scale: scaleCount,
      },
      decisions: feed,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/growth-ops/decisions:", error);
    return NextResponse.json(
      { error: "Failed to load growth decisions" },
      { status: 500 }
    );
  }
}

