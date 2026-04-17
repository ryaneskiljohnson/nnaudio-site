/**
 * @fileoverview Conservative growth guardrails for AI-operated ad execution.
 * Provides safe defaults plus env-driven overrides and scale-eligibility checks.
 * @module utils/growth/guardrails
 */

/**
 * @brief Runtime guardrails used by autonomous growth operators.
 */
export interface GrowthGuardrails {
  launchDailyBudgetUsd: number;
  maxDailyBudgetPerCampaignUsd: number;
  maxDailyBudgetIncreasePct: number;
  minHoursBetweenScaleActions: number;
  minConversionsBeforeScale: number;
  minRoasBeforeScale: number;
  maxCpaUsd: number;
  pauseSpendMultiplierNoSignal: number;
  maxNewCampaignsPerDay: number;
  requireReadinessGates: boolean;
}

/**
 * @brief Input signals used to decide if a campaign is eligible to scale.
 */
export interface ScaleEligibilityInput {
  roas?: number | null;
  cpaUsd?: number | null;
  conversions?: number | null;
  hoursSinceLastScale?: number | null;
}

/**
 * @brief Result of evaluating whether AI is allowed to increase spend.
 */
export interface ScaleEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

/**
 * @brief Result of applying budget guardrails.
 */
export interface BudgetGuardrailResult {
  requestedUsd: number;
  appliedUsd: number;
  changed: boolean;
  reasons: string[];
}

const DEFAULT_GUARDRAILS: GrowthGuardrails = {
  launchDailyBudgetUsd: 20,
  maxDailyBudgetPerCampaignUsd: 75,
  maxDailyBudgetIncreasePct: 15,
  minHoursBetweenScaleActions: 48,
  minConversionsBeforeScale: 3,
  minRoasBeforeScale: 1.3,
  maxCpaUsd: 40,
  pauseSpendMultiplierNoSignal: 1.75,
  maxNewCampaignsPerDay: 1,
  requireReadinessGates: true,
};

/**
 * @brief Parses a numeric env var with optional min/max clamps.
 * @param name - Environment variable name.
 * @param fallback - Value to use when env var is missing/invalid.
 * @param options - Optional min/max constraints.
 * @returns Parsed and clamped numeric value.
 */
function parseNumberEnv(
  name: string,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  let value = parsed;
  if (options?.min != null) {
    value = Math.max(options.min, value);
  }
  if (options?.max != null) {
    value = Math.min(options.max, value);
  }

  return value;
}

/**
 * @brief Parses a boolean env var.
 * @param name - Environment variable name.
 * @param fallback - Value to use when env var is missing.
 * @returns Parsed boolean value.
 */
function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  return raw.toLowerCase() === "true";
}

/**
 * @brief Loads growth guardrails from environment variables with conservative fallbacks.
 * @returns Guardrails used by autonomous ad execution.
 * @note Env prefixes use `AI_GROWTH_*` to separate autonomous controls from general app config.
 */
export function getGrowthGuardrailsFromEnv(): GrowthGuardrails {
  return {
    launchDailyBudgetUsd: parseNumberEnv(
      "AI_GROWTH_LAUNCH_DAILY_BUDGET_USD",
      DEFAULT_GUARDRAILS.launchDailyBudgetUsd,
      { min: 1, max: 200 }
    ),
    maxDailyBudgetPerCampaignUsd: parseNumberEnv(
      "AI_GROWTH_MAX_DAILY_BUDGET_PER_CAMPAIGN_USD",
      DEFAULT_GUARDRAILS.maxDailyBudgetPerCampaignUsd,
      { min: 5, max: 2000 }
    ),
    maxDailyBudgetIncreasePct: parseNumberEnv(
      "AI_GROWTH_MAX_DAILY_BUDGET_INCREASE_PCT",
      DEFAULT_GUARDRAILS.maxDailyBudgetIncreasePct,
      { min: 1, max: 100 }
    ),
    minHoursBetweenScaleActions: parseNumberEnv(
      "AI_GROWTH_MIN_HOURS_BETWEEN_SCALE_ACTIONS",
      DEFAULT_GUARDRAILS.minHoursBetweenScaleActions,
      { min: 1, max: 168 }
    ),
    minConversionsBeforeScale: parseNumberEnv(
      "AI_GROWTH_MIN_CONVERSIONS_BEFORE_SCALE",
      DEFAULT_GUARDRAILS.minConversionsBeforeScale,
      { min: 1, max: 200 }
    ),
    minRoasBeforeScale: parseNumberEnv(
      "AI_GROWTH_MIN_ROAS_BEFORE_SCALE",
      DEFAULT_GUARDRAILS.minRoasBeforeScale,
      { min: 0.1, max: 20 }
    ),
    maxCpaUsd: parseNumberEnv(
      "AI_GROWTH_MAX_CPA_USD",
      DEFAULT_GUARDRAILS.maxCpaUsd,
      { min: 1, max: 500 }
    ),
    pauseSpendMultiplierNoSignal: parseNumberEnv(
      "AI_GROWTH_PAUSE_SPEND_MULTIPLIER_NO_SIGNAL",
      DEFAULT_GUARDRAILS.pauseSpendMultiplierNoSignal,
      { min: 1, max: 10 }
    ),
    maxNewCampaignsPerDay: parseNumberEnv(
      "AI_GROWTH_MAX_NEW_CAMPAIGNS_PER_DAY",
      DEFAULT_GUARDRAILS.maxNewCampaignsPerDay,
      { min: 1, max: 20 }
    ),
    requireReadinessGates: parseBooleanEnv(
      "AI_GROWTH_REQUIRE_READINESS_GATES",
      DEFAULT_GUARDRAILS.requireReadinessGates
    ),
  };
}

/**
 * @brief Evaluates whether campaign performance is strong enough to allow scaling.
 * @param input - Current campaign performance signals.
 * @param guardrails - Guardrails to evaluate against.
 * @returns Eligibility result with blocking reasons.
 */
export function evaluateScaleEligibility(
  input: ScaleEligibilityInput,
  guardrails: GrowthGuardrails
): ScaleEligibilityResult {
  const reasons: string[] = [];

  if ((input.conversions ?? 0) < guardrails.minConversionsBeforeScale) {
    reasons.push(
      `Need at least ${guardrails.minConversionsBeforeScale} conversions before scaling.`
    );
  }

  if ((input.roas ?? 0) < guardrails.minRoasBeforeScale) {
    reasons.push(`Need ROAS >= ${guardrails.minRoasBeforeScale.toFixed(2)} before scaling.`);
  }

  if ((input.hoursSinceLastScale ?? 0) < guardrails.minHoursBetweenScaleActions) {
    reasons.push(
      `Wait ${guardrails.minHoursBetweenScaleActions}h between scale actions to avoid noisy decisions.`
    );
  }

  if (input.cpaUsd != null && input.cpaUsd > guardrails.maxCpaUsd) {
    reasons.push(`CPA ${input.cpaUsd.toFixed(2)} exceeds max allowed CPA ${guardrails.maxCpaUsd}.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * @brief Applies conservative launch/update guardrails to a daily budget value.
 * @param requestedUsd - Desired daily budget in USD.
 * @param guardrails - Active automation guardrails.
 * @param context - Budget-change context.
 * @returns Guardrailed budget result with any adjustment reasons.
 * @note On launch, budgets are capped at launchDailyBudgetUsd.
 */
export function applyDailyBudgetGuardrails(
  requestedUsd: number,
  guardrails: GrowthGuardrails,
  context: {
    mode: "launch" | "update";
    previousDailyBudgetUsd?: number | null;
  }
): BudgetGuardrailResult {
  const reasons: string[] = [];
  const safeRequested = Number.isFinite(requestedUsd) && requestedUsd > 0 ? requestedUsd : guardrails.launchDailyBudgetUsd;
  let applied = safeRequested;

  if (context.mode === "launch" && applied > guardrails.launchDailyBudgetUsd) {
    applied = guardrails.launchDailyBudgetUsd;
    reasons.push(
      `Launch mode caps daily budget at ${guardrails.launchDailyBudgetUsd} USD.`
    );
  }

  const previous = context.previousDailyBudgetUsd ?? null;
  if (
    context.mode === "update" &&
    previous != null &&
    Number.isFinite(previous) &&
    previous > 0 &&
    applied > previous
  ) {
    const maxStep = previous * (1 + guardrails.maxDailyBudgetIncreasePct / 100);
    if (applied > maxStep) {
      applied = maxStep;
      reasons.push(
        `Single update increase limited to +${guardrails.maxDailyBudgetIncreasePct}% from prior budget.`
      );
    }
  }

  if (applied > guardrails.maxDailyBudgetPerCampaignUsd) {
    applied = guardrails.maxDailyBudgetPerCampaignUsd;
    reasons.push(
      `Daily budget capped at ${guardrails.maxDailyBudgetPerCampaignUsd} USD max per campaign.`
    );
  }

  if (applied < 1) {
    applied = 1;
    reasons.push("Daily budget raised to minimum of 1 USD.");
  }

  return {
    requestedUsd: safeRequested,
    appliedUsd: Number(applied.toFixed(2)),
    changed: Math.abs(applied - safeRequested) > 0.0001,
    reasons,
  };
}

