/**
 * @fileoverview Growth action queue helpers for autonomous execution.
 * Defines supported action types, shared queue shapes, and execution handlers.
 * @module utils/growth/action-queue
 */

import { createFacebookAPI } from "@/utils/facebook/api";
import { createAdminClient } from "@/utils/supabase/service";
import {
  applyDailyBudgetGuardrails,
  evaluateScaleEligibility,
  getGrowthGuardrailsFromEnv,
} from "@/utils/growth/guardrails";
import { isFacebookAdsMockEnabled } from "@/utils/facebook/mock-mode";

/**
 * @brief Supported autonomous growth action types.
 */
export type GrowthActionType =
  | "email_process_scheduled"
  | "facebook_pause_campaign"
  | "facebook_resume_campaign"
  | "facebook_guardrail_sweep"
  | "facebook_scale_campaign_budget";

/**
 * @brief Queue action payload map by action type.
 */
export interface GrowthActionPayloadMap {
  email_process_scheduled: Record<string, never>;
  facebook_pause_campaign: {
    campaignId: string;
  };
  facebook_resume_campaign: {
    campaignId: string;
  };
  facebook_guardrail_sweep: {
    lookbackDays?: number;
    maxCampaigns?: number;
    queueActions?: boolean;
  };
  facebook_scale_campaign_budget: {
    campaignId: string;
    requestedDailyBudgetUsd: number;
    reason?: string;
  };
}

/**
 * @brief Queue row shape used by processing routes.
 */
export interface GrowthActionQueueRow {
  id: string;
  action_type: string;
  payload: unknown;
  attempt_count: number;
  max_attempts: number;
}

/**
 * @brief Execution result for a single queued action.
 */
export interface GrowthActionExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * @brief Optional execution-time overrides for Facebook auth/account context.
 */
export interface GrowthActionExecutionOptions {
  facebookTokenOverride?: string | null;
  facebookAdAccountIdOverride?: string | null;
}

/**
 * @brief Checks if a string is a supported queue action type.
 * @param value - Candidate action type.
 * @returns True when supported.
 */
export function isSupportedGrowthActionType(value: string): value is GrowthActionType {
  return (
    value === "email_process_scheduled" ||
    value === "facebook_pause_campaign" ||
    value === "facebook_resume_campaign" ||
    value === "facebook_guardrail_sweep" ||
    value === "facebook_scale_campaign_budget"
  );
}

/**
 * @brief Executes one autonomous growth action.
 * @param action - Queue action row.
 * @param siteBaseUrl - Public site URL used for internal endpoint calls.
 * @returns Execution status with output or error.
 */
export async function executeGrowthAction(
  action: GrowthActionQueueRow,
  siteBaseUrl: string,
  options?: GrowthActionExecutionOptions
): Promise<GrowthActionExecutionResult> {
  if (!isSupportedGrowthActionType(action.action_type)) {
    return {
      success: false,
      error: `Unsupported action type: ${action.action_type}`,
    };
  }

  try {
    switch (action.action_type) {
      case "email_process_scheduled":
        return executeEmailProcessScheduled(siteBaseUrl);
      case "facebook_pause_campaign":
        return executeFacebookCampaignStateChange(action, "pause", options);
      case "facebook_resume_campaign":
        return executeFacebookCampaignStateChange(action, "resume", options);
      case "facebook_guardrail_sweep":
        return executeFacebookGuardrailSweep(action, options);
      case "facebook_scale_campaign_budget":
        return executeFacebookScaleCampaignBudget(action, options);
      default:
        return {
          success: false,
          error: `Unsupported action type: ${action.action_type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown action execution error",
    };
  }
}

/**
 * @brief Executes scheduled email processing via existing endpoint.
 * @param siteBaseUrl - Site base URL for internal request.
 * @returns Execution result with processed count when successful.
 */
async function executeEmailProcessScheduled(
  siteBaseUrl: string
): Promise<GrowthActionExecutionResult> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return {
      success: false,
      error: "Missing CRON_SECRET for scheduled email processing",
    };
  }

  const response = await fetch(`${siteBaseUrl}/api/email-campaigns/process-scheduled`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
      "User-Agent": "GrowthActionQueueRunner/1.0",
    },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return {
      success: false,
      error: (body.error as string) || `email_process_scheduled failed (${response.status})`,
    };
  }

  return {
    success: true,
    output: {
      endpoint: "/api/email-campaigns/process-scheduled",
      response: body,
    },
  };
}

/**
 * @brief Parses an unknown value into a finite number with fallback.
 * @param value - Raw value to parse.
 * @param fallback - Fallback number when parsing fails.
 * @returns Parsed finite number.
 */
function parseFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

/**
 * @brief Builds a date range object for the given lookback period.
 * @param lookbackDays - Number of trailing days to include.
 * @returns Date range in YYYY-MM-DD format.
 */
function buildLookbackDateRange(lookbackDays: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - lookbackDays);
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
}

/**
 * @brief Enqueues a pause action with idempotency and duplicate suppression.
 * @param campaignId - Meta campaign id to pause.
 * @param reason - Human-readable pause reason.
 * @returns True when a new pause action was inserted.
 */
async function enqueuePauseAction(campaignId: string, reason: string): Promise<boolean> {
  const adminClient = await createAdminClient();
  const now = new Date();
  const hourKey = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
  ].join("");
  const idempotencyKey = `guardrail-pause-${campaignId}-${hourKey}`;

  const { data: existing } = await (adminClient as any)
    .from("growth_action_queue")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing?.id) {
    return false;
  }

  const { error } = await (adminClient as any).from("growth_action_queue").insert({
    action_type: "facebook_pause_campaign",
    payload: { campaignId, reason },
    status: "pending",
    priority: 40,
    max_attempts: 3,
    run_after: now.toISOString(),
    idempotency_key: idempotencyKey,
  });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate")) {
      return false;
    }
    throw error;
  }

  return true;
}

/**
 * @brief Loads hours since the most recent scale action for a campaign.
 * @param campaignId - Meta campaign id.
 * @returns Hours elapsed since latest pending/running/succeeded scale action.
 */
async function getHoursSinceLastScaleAction(campaignId: string): Promise<number> {
  const adminClient = await createAdminClient();
  const { data } = await (adminClient as any)
    .from("growth_action_queue")
    .select("created_at, completed_at, status")
    .eq("action_type", "facebook_scale_campaign_budget")
    .contains("payload", { campaignId })
    .in("status", ["pending", "running", "succeeded"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return Number.POSITIVE_INFINITY;
  }

  const reference = data.completed_at ?? data.created_at;
  if (!reference) {
    return Number.POSITIVE_INFINITY;
  }
  const referenceMs = new Date(reference).getTime();
  if (!Number.isFinite(referenceMs)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, (Date.now() - referenceMs) / (1000 * 60 * 60));
}

/**
 * @brief Enqueues a conservative budget scale action with idempotency.
 * @param campaignId - Meta campaign id to scale.
 * @param requestedDailyBudgetUsd - Requested next daily budget.
 * @param reason - Human-readable reason for scaling.
 * @returns True when a new scale action is inserted.
 */
async function enqueueScaleBudgetAction(
  campaignId: string,
  requestedDailyBudgetUsd: number,
  reason: string
): Promise<boolean> {
  const adminClient = await createAdminClient();
  const now = new Date();
  const hourKey = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
  ].join("");
  const idempotencyKey = `guardrail-scale-${campaignId}-${hourKey}`;

  const { data: existing } = await (adminClient as any)
    .from("growth_action_queue")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing?.id) {
    return false;
  }

  const { error } = await (adminClient as any).from("growth_action_queue").insert({
    action_type: "facebook_scale_campaign_budget",
    payload: {
      campaignId,
      requestedDailyBudgetUsd,
      reason,
    },
    status: "pending",
    priority: 80,
    max_attempts: 3,
    run_after: now.toISOString(),
    idempotency_key: idempotencyKey,
  });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate")) {
      return false;
    }
    throw error;
  }

  return true;
}

/**
 * @brief Converts Meta budget string (cents) to USD.
 * @param budgetInCentsString - Budget value returned by Meta API.
 * @returns Budget in USD.
 */
function parseMetaBudgetUsd(budgetInCentsString: unknown): number {
  const cents = parseFiniteNumber(budgetInCentsString, 0);
  return cents > 0 ? cents / 100 : 0;
}

/**
 * @brief Runs a conservative guardrail sweep across active Meta campaigns.
 * @param action - Queue action row with optional sweep settings.
 * @returns Sweep summary with evaluated campaigns and enqueued pause/scale actions.
 * @note Pause trigger is conservative: high spend without conversions OR CPA above cap.
 */
async function executeFacebookGuardrailSweep(
  action: GrowthActionQueueRow,
  options?: GrowthActionExecutionOptions
): Promise<GrowthActionExecutionResult> {
  const mockModeEnabled = isFacebookAdsMockEnabled();
  if (mockModeEnabled) {
    return executeFacebookGuardrailSweepMock(action);
  }

  const token = options?.facebookTokenOverride ?? process.env.FACEBOOK_SYSTEM_USER_TOKEN ?? null;
  const adAccountId =
    options?.facebookAdAccountIdOverride ?? process.env.FACEBOOK_AD_ACCOUNT_ID ?? null;
  const facebookApi = createFacebookAPI(adAccountId, () => token);
  if (!facebookApi) {
    return {
      success: false,
      error:
        "Facebook API not available for guardrail sweep. Set FACEBOOK_SYSTEM_USER_TOKEN and FACEBOOK_AD_ACCOUNT_ID.",
    };
  }

  const payload = (action.payload ?? {}) as GrowthActionPayloadMap["facebook_guardrail_sweep"];
  const lookbackDays = Math.max(1, Math.min(30, Math.floor(parseFiniteNumber(payload.lookbackDays, 7))));
  const maxCampaigns = Math.max(
    1,
    Math.min(100, Math.floor(parseFiniteNumber(payload.maxCampaigns, 25)))
  );
  const queueActions = payload.queueActions !== false;
  const dateRange = buildLookbackDateRange(lookbackDays);
  const guardrails = getGrowthGuardrailsFromEnv();
  const autoScaleEnabled = (process.env.AI_GROWTH_AUTO_ENQUEUE_SCALE ?? "true").toLowerCase() === "true";
  const pauseNoSignalSpendThreshold = guardrails.maxCpaUsd * guardrails.pauseSpendMultiplierNoSignal;

  const campaigns = await facebookApi.getCampaigns();
  const activeCampaigns = campaigns
    .filter((campaign) => String(campaign.status || "").toUpperCase() === "ACTIVE")
    .slice(0, maxCampaigns);

  let evaluated = 0;
  let pauseCandidates = 0;
  let enqueuedPauseActions = 0;
  let scaleCandidates = 0;
  let enqueuedScaleActions = 0;
  const decisions: Array<Record<string, unknown>> = [];

  for (const campaign of activeCampaigns) {
    const insights = await facebookApi.getInsights(campaign.id, "campaign", dateRange, [
      "spend",
      "conversions",
      "cost_per_conversion",
      "clicks",
      "impressions",
    ]);
    const summary = insights[0] ?? {};
    const spendUsd = parseFiniteNumber(summary.spend, 0);
    const conversions = parseFiniteNumber(summary.conversions, 0);
    const inferredCpa = conversions > 0 ? spendUsd / conversions : 0;
    const cpaUsd = parseFiniteNumber(summary.cost_per_conversion, inferredCpa);
    const roas = spendUsd > 0 ? conversions / spendUsd : 0;
    const currentDailyBudgetUsd = parseMetaBudgetUsd(campaign.daily_budget);
    const hoursSinceLastScale = queueActions
      ? await getHoursSinceLastScaleAction(campaign.id)
      : Number.POSITIVE_INFINITY;

    const noSignalOverspend = conversions < 1 && spendUsd >= pauseNoSignalSpendThreshold;
    const aboveCpaCap = conversions >= 1 && cpaUsd > guardrails.maxCpaUsd;
    const shouldPause = noSignalOverspend || aboveCpaCap;
    const scaleEligibility = evaluateScaleEligibility(
      {
        conversions,
        cpaUsd,
        roas,
        hoursSinceLastScale,
      },
      guardrails
    );
    evaluated += 1;

    if (shouldPause) {
      pauseCandidates += 1;
      const reason = noSignalOverspend
        ? `No-conversion spend ${spendUsd.toFixed(2)} exceeded threshold ${pauseNoSignalSpendThreshold.toFixed(2)}.`
        : `CPA ${cpaUsd.toFixed(2)} exceeded max allowed ${guardrails.maxCpaUsd.toFixed(2)}.`;
      const inserted = queueActions ? await enqueuePauseAction(campaign.id, reason) : false;
      if (inserted) {
        enqueuedPauseActions += 1;
      }
      decisions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        decision: "pause",
        spendUsd,
        conversions,
        cpaUsd,
        reason,
        enqueued: inserted,
      });
      continue;
    }

    const hasScaleHeadroom = currentDailyBudgetUsd < guardrails.maxDailyBudgetPerCampaignUsd;
    if (autoScaleEnabled && scaleEligibility.eligible && hasScaleHeadroom) {
      const requestedScaleBudgetUsd =
        (currentDailyBudgetUsd > 0
          ? currentDailyBudgetUsd
          : guardrails.launchDailyBudgetUsd) *
        (1 + guardrails.maxDailyBudgetIncreasePct / 100);
      const scaleReason = `Eligible to scale: conversions=${conversions.toFixed(2)}, roas=${roas.toFixed(
        2
      )}, cpa=${cpaUsd.toFixed(2)}, hours_since_last_scale=${hoursSinceLastScale.toFixed(1)}.`;
      const inserted = queueActions
        ? await enqueueScaleBudgetAction(
            campaign.id,
            Number(requestedScaleBudgetUsd.toFixed(2)),
            scaleReason
          )
        : false;
      scaleCandidates += 1;
      if (inserted) {
        enqueuedScaleActions += 1;
      }
      decisions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        decision: "scale",
        spendUsd,
        conversions,
        cpaUsd,
        roas,
        currentDailyBudgetUsd,
        requestedScaleBudgetUsd: Number(requestedScaleBudgetUsd.toFixed(2)),
        reason: scaleReason,
        enqueued: inserted,
      });
      continue;
    }

    decisions.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      decision: "hold",
      spendUsd,
      conversions,
      cpaUsd,
      roas,
      currentDailyBudgetUsd,
      autoScaleEnabled,
      scale_eligible: scaleEligibility.eligible,
      scale_blockers: scaleEligibility.reasons,
      hoursSinceLastScale,
      reason: hasScaleHeadroom
        ? "Guardrails did not trigger pause and scale criteria not fully met."
        : `Already at/above max daily budget cap (${guardrails.maxDailyBudgetPerCampaignUsd}).`,
    });
  }

  return {
    success: true,
    output: {
      lookback_days: lookbackDays,
      max_campaigns: maxCampaigns,
      queue_actions: queueActions,
      evaluated_campaigns: evaluated,
      pause_candidates: pauseCandidates,
      enqueued_pause_actions: enqueuedPauseActions,
      scale_candidates: scaleCandidates,
      enqueued_scale_actions: enqueuedScaleActions,
      decisions,
    },
  };
}

/**
 * @brief Runs guardrail sweep using deterministic mock campaign data.
 * @param action - Queue action row with optional sweep settings.
 * @returns Sweep result that exercises pause/scale queue paths in local tests.
 * @note Enabled only when `FACEBOOK_MOCK_CONNECTION=true` and not in production.
 */
async function executeFacebookGuardrailSweepMock(
  action: GrowthActionQueueRow
): Promise<GrowthActionExecutionResult> {
  const payload = (action.payload ?? {}) as GrowthActionPayloadMap["facebook_guardrail_sweep"];
  const lookbackDays = Math.max(1, Math.min(30, Math.floor(parseFiniteNumber(payload.lookbackDays, 7))));
  const maxCampaigns = Math.max(
    1,
    Math.min(100, Math.floor(parseFiniteNumber(payload.maxCampaigns, 25)))
  );
  const queueActions = payload.queueActions !== false;
  const guardrails = getGrowthGuardrailsFromEnv();
  const pauseNoSignalSpendThreshold = guardrails.maxCpaUsd * guardrails.pauseSpendMultiplierNoSignal;
  const mockCampaigns = [
    {
      id: "mock-campaign-pause",
      name: "Mock Campaign Pause Candidate",
      dailyBudgetUsd: 20,
      spendUsd: pauseNoSignalSpendThreshold + 15,
      conversions: 0,
    },
    {
      id: "mock-campaign-scale",
      name: "Mock Campaign Scale Candidate",
      dailyBudgetUsd: 20,
      spendUsd: 50,
      conversions: 6,
    },
  ].slice(0, maxCampaigns);

  let pauseCandidates = 0;
  let enqueuedPauseActions = 0;
  let scaleCandidates = 0;
  let enqueuedScaleActions = 0;
  const decisions: Array<Record<string, unknown>> = [];
  const autoScaleEnabled = (process.env.AI_GROWTH_AUTO_ENQUEUE_SCALE ?? "true").toLowerCase() === "true";

  for (const campaign of mockCampaigns) {
    const spendUsd = campaign.spendUsd;
    const conversions = campaign.conversions;
    const inferredCpa = conversions > 0 ? spendUsd / conversions : 0;
    const cpaUsd = inferredCpa;
    const roas = spendUsd > 0 ? conversions / spendUsd : 0;
    const hoursSinceLastScale = queueActions
      ? await getHoursSinceLastScaleAction(campaign.id)
      : Number.POSITIVE_INFINITY;
    const scaleEligibility = evaluateScaleEligibility(
      { conversions, cpaUsd, roas, hoursSinceLastScale },
      guardrails
    );

    const noSignalOverspend = conversions < 1 && spendUsd >= pauseNoSignalSpendThreshold;
    if (noSignalOverspend) {
      pauseCandidates += 1;
      const reason = `Mock mode: no-conversion spend ${spendUsd.toFixed(2)} exceeded threshold ${pauseNoSignalSpendThreshold.toFixed(2)}.`;
      const inserted = queueActions ? await enqueuePauseAction(campaign.id, reason) : false;
      if (inserted) {
        enqueuedPauseActions += 1;
      }
      decisions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        decision: "pause",
        spendUsd,
        conversions,
        cpaUsd,
        roas,
        reason,
        enqueued: inserted,
      });
      continue;
    }

    if (
      autoScaleEnabled &&
      scaleEligibility.eligible &&
      campaign.dailyBudgetUsd < guardrails.maxDailyBudgetPerCampaignUsd
    ) {
      const requestedScaleBudgetUsd =
        campaign.dailyBudgetUsd * (1 + guardrails.maxDailyBudgetIncreasePct / 100);
      const reason = `Mock mode: eligible to scale with conversions=${conversions}, roas=${roas.toFixed(2)}.`;
      const inserted = queueActions
        ? await enqueueScaleBudgetAction(
            campaign.id,
            Number(requestedScaleBudgetUsd.toFixed(2)),
            reason
          )
        : false;
      scaleCandidates += 1;
      if (inserted) {
        enqueuedScaleActions += 1;
      }
      decisions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        decision: "scale",
        spendUsd,
        conversions,
        cpaUsd,
        roas,
        currentDailyBudgetUsd: campaign.dailyBudgetUsd,
        requestedScaleBudgetUsd: Number(requestedScaleBudgetUsd.toFixed(2)),
        reason,
        enqueued: inserted,
      });
      continue;
    }

    decisions.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      decision: "hold",
      spendUsd,
      conversions,
      cpaUsd,
      roas,
      currentDailyBudgetUsd: campaign.dailyBudgetUsd,
      reason: "Mock mode: hold.",
    });
  }

  return {
    success: true,
    output: {
      mock_mode: true,
      lookback_days: lookbackDays,
      max_campaigns: maxCampaigns,
      queue_actions: queueActions,
      evaluated_campaigns: mockCampaigns.length,
      pause_candidates: pauseCandidates,
      enqueued_pause_actions: enqueuedPauseActions,
      scale_candidates: scaleCandidates,
      enqueued_scale_actions: enqueuedScaleActions,
      decisions,
    },
  };
}

/**
 * @brief Executes a campaign budget scale action with guardrail enforcement.
 * @param action - Queue action row containing campaign and requested budget.
 * @returns Scale execution result and applied guardrail adjustments.
 */
async function executeFacebookScaleCampaignBudget(
  action: GrowthActionQueueRow,
  options?: GrowthActionExecutionOptions
): Promise<GrowthActionExecutionResult> {
  const mockModeEnabled = isFacebookAdsMockEnabled();
  if (mockModeEnabled) {
    return executeFacebookScaleCampaignBudgetMock(action);
  }

  const token = options?.facebookTokenOverride ?? process.env.FACEBOOK_SYSTEM_USER_TOKEN ?? null;
  const adAccountId =
    options?.facebookAdAccountIdOverride ?? process.env.FACEBOOK_AD_ACCOUNT_ID ?? null;
  const facebookApi = createFacebookAPI(adAccountId, () => token);
  if (!facebookApi) {
    return {
      success: false,
      error:
        "Facebook API not available for scale runner. Set FACEBOOK_SYSTEM_USER_TOKEN and FACEBOOK_AD_ACCOUNT_ID.",
    };
  }

  const payload = action.payload as GrowthActionPayloadMap["facebook_scale_campaign_budget"] | null;
  const campaignId = payload?.campaignId;
  if (!campaignId) {
    return {
      success: false,
      error: "Missing payload.campaignId",
    };
  }

  const campaign = await facebookApi.getCampaign(campaignId);
  if (!campaign) {
    return {
      success: false,
      error: `Campaign ${campaignId} not found.`,
    };
  }

  const currentDailyBudgetUsd = parseMetaBudgetUsd(campaign.daily_budget);
  const guardrails = getGrowthGuardrailsFromEnv();
  const requestedDailyBudgetUsd = parseFiniteNumber(
    payload?.requestedDailyBudgetUsd,
    currentDailyBudgetUsd > 0 ? currentDailyBudgetUsd : guardrails.launchDailyBudgetUsd
  );
  const guardedBudget = applyDailyBudgetGuardrails(requestedDailyBudgetUsd, guardrails, {
    mode: "update",
    previousDailyBudgetUsd: currentDailyBudgetUsd > 0 ? currentDailyBudgetUsd : null,
  });

  if (
    currentDailyBudgetUsd > 0 &&
    Math.abs(guardedBudget.appliedUsd - currentDailyBudgetUsd) < 0.0001
  ) {
    return {
      success: true,
      output: {
        campaignId,
        skipped: true,
        reason: "Guardrailed budget matched current budget; no update sent.",
        currentDailyBudgetUsd,
        requestedDailyBudgetUsd,
        appliedDailyBudgetUsd: guardedBudget.appliedUsd,
        guardrailAdjustments: guardedBudget,
      },
    };
  }

  await facebookApi.updateCampaign(campaignId, {
    daily_budget: guardedBudget.appliedUsd,
  });

  return {
    success: true,
    output: {
      campaignId,
      currentDailyBudgetUsd,
      requestedDailyBudgetUsd,
      appliedDailyBudgetUsd: guardedBudget.appliedUsd,
      reason: payload?.reason ?? "Autonomous guardrail sweep scale action.",
      guardrailAdjustments: guardedBudget,
    },
  };
}

/**
 * @brief Executes campaign scale action in deterministic mock mode.
 * @param action - Queue action with campaign id and requested budget.
 * @returns Successful mock execution with applied guardrails.
 */
async function executeFacebookScaleCampaignBudgetMock(
  action: GrowthActionQueueRow
): Promise<GrowthActionExecutionResult> {
  const payload = action.payload as GrowthActionPayloadMap["facebook_scale_campaign_budget"] | null;
  const campaignId = payload?.campaignId;
  if (!campaignId) {
    return {
      success: false,
      error: "Missing payload.campaignId",
    };
  }
  const guardrails = getGrowthGuardrailsFromEnv();
  const currentDailyBudgetUsd = guardrails.launchDailyBudgetUsd;
  const requestedDailyBudgetUsd = parseFiniteNumber(
    payload?.requestedDailyBudgetUsd,
    currentDailyBudgetUsd
  );
  const guardedBudget = applyDailyBudgetGuardrails(requestedDailyBudgetUsd, guardrails, {
    mode: "update",
    previousDailyBudgetUsd: currentDailyBudgetUsd,
  });

  return {
    success: true,
    output: {
      mock_mode: true,
      campaignId,
      currentDailyBudgetUsd,
      requestedDailyBudgetUsd,
      appliedDailyBudgetUsd: guardedBudget.appliedUsd,
      reason: payload?.reason ?? "Mock mode autonomous scale action.",
      guardrailAdjustments: guardedBudget,
    },
  };
}

/**
 * @brief Executes a pause/resume action for a Meta campaign.
 * @param action - Queue action row containing campaign id in payload.
 * @param operation - Pause or resume operation.
 * @returns Action execution status.
 * @note Requires `FACEBOOK_SYSTEM_USER_TOKEN` and `FACEBOOK_AD_ACCOUNT_ID` env vars.
 */
async function executeFacebookCampaignStateChange(
  action: GrowthActionQueueRow,
  operation: "pause" | "resume",
  options?: GrowthActionExecutionOptions
): Promise<GrowthActionExecutionResult> {
  if (isFacebookAdsMockEnabled()) {
    const mockPayload = action.payload as { campaignId?: string } | null;
    if (!mockPayload?.campaignId) {
      return {
        success: false,
        error: "Missing payload.campaignId",
      };
    }
    return {
      success: true,
      output: {
        mock_mode: true,
        campaignId: mockPayload.campaignId,
        operation,
      },
    };
  }

  const token = options?.facebookTokenOverride ?? process.env.FACEBOOK_SYSTEM_USER_TOKEN ?? null;
  const adAccountId =
    options?.facebookAdAccountIdOverride ?? process.env.FACEBOOK_AD_ACCOUNT_ID ?? null;
  const facebookApi = createFacebookAPI(adAccountId, () => token);

  if (!facebookApi) {
    return {
      success: false,
      error:
        "Facebook API not available for queue runner. Set FACEBOOK_SYSTEM_USER_TOKEN and FACEBOOK_AD_ACCOUNT_ID.",
    };
  }

  const payload = action.payload as { campaignId?: string } | null;
  const campaignId = payload?.campaignId;
  if (!campaignId) {
    return {
      success: false,
      error: "Missing payload.campaignId",
    };
  }

  if (operation === "pause") {
    await facebookApi.pauseCampaign(campaignId);
  } else {
    await facebookApi.resumeCampaign(campaignId);
  }

  return {
    success: true,
    output: {
      campaignId,
      operation,
    },
  };
}

