/**
 * @fileoverview Print email-related env var status (set/missing) for comparing local vs Vercel.
 * @module scripts/check-email-env
 * @example bun run scripts/check-email-env.ts  # or: bun run env:email
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { logEmailEnvStatus } from "../utils/env-check";

logEmailEnvStatus();
console.log("\nEnsure the same variables are set in Vercel (Production). See docs/VERCEL_EMAIL_ENV.md");
