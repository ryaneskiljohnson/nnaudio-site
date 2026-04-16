/**
 * @fileoverview Prints growth automation env readiness and active AI guardrail values.
 * @module scripts/check-growth-readiness-env
 * @example bun run scripts/check-growth-readiness-env.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { logGrowthEnvStatus } from "../utils/env-check";
import { getGrowthGuardrailsFromEnv } from "../utils/growth/guardrails";

/**
 * @brief Prints active guardrail configuration for autonomous ad operations.
 * @returns void
 */
function printGuardrails(): void {
  const guardrails = getGrowthGuardrailsFromEnv();
  console.log("\nActive AI growth guardrails:");
  console.log(JSON.stringify(guardrails, null, 2));
}

logGrowthEnvStatus();
printGuardrails();
console.log(
  "\nGoal: start modest, scale only after positive ROAS/conversion feedback."
);

