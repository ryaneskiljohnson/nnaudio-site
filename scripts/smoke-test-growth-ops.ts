/**
 * @fileoverview Lightweight smoke test for autonomous growth queue action handlers.
 * Runs mock-mode pause/sweep/scale actions without queue side effects.
 * @module scripts/smoke-test-growth-ops
 * @example bun run scripts/smoke-test-growth-ops.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  executeGrowthAction,
  type GrowthActionQueueRow,
} from "../utils/growth/action-queue";

/**
 * @brief Builds a minimal queue row for direct handler execution.
 * @param actionType - Growth action type.
 * @param payload - Action payload.
 * @returns Queue row shape accepted by executeGrowthAction.
 */
function buildAction(
  actionType: GrowthActionQueueRow["action_type"],
  payload: unknown
): GrowthActionQueueRow {
  return {
    id: `smoke-${actionType}-${Date.now()}`,
    action_type: actionType,
    payload,
    attempt_count: 0,
    max_attempts: 3,
  };
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    process.env.FACEBOOK_MOCK_CONNECTION = "true";
  }

  const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const actions: GrowthActionQueueRow[] = [
    buildAction("facebook_pause_campaign", { campaignId: "mock-campaign-pause" }),
    buildAction("facebook_guardrail_sweep", {
      lookbackDays: 7,
      maxCampaigns: 2,
      queueActions: false,
    }),
    buildAction("facebook_scale_campaign_budget", {
      campaignId: "mock-campaign-scale",
      requestedDailyBudgetUsd: 23,
      reason: "Smoke test scale action",
    }),
  ];

  const results = [];
  for (const action of actions) {
    const result = await executeGrowthAction(action, siteBaseUrl);
    results.push({
      id: action.id,
      action_type: action.action_type,
      success: result.success,
      error: result.error ?? null,
      output: result.output ?? null,
    });
  }

  const failed = results.filter((entry) => !entry.success);
  console.log("Growth ops smoke test results:");
  console.log(JSON.stringify(results, null, 2));

  if (failed.length > 0) {
    console.error(`Smoke test failed for ${failed.length} action(s).`);
    process.exit(1);
  }

  console.log("Smoke test passed for pause/sweep/scale handlers.");
}

void main();

