/**
 * @fileoverview Sends a one-off admin APNs test alert to every registered device.
 * @module scripts/send-admin-test-push
 *
 * Loads `.env.local` and uses the same sender as paid-order / ticket hooks.
 *
 * @example
 * bun run scripts/send-admin-test-push.ts
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { sendAdminPush } from "../lib/admin-push";

config({ path: resolve(process.cwd(), ".env.local") });

/**
 * @brief Fan-out a visible test payload so we can confirm banners and tap-to-open.
 * @returns Promise that resolves after sendAdminPush finishes
 */
async function main(): Promise<void> {
  const missing = ["APNS_KEY_ID", "APNS_TEAM_ID", "APNS_KEY_P8"].filter(
    (key) => !process.env[key]?.trim()
  );
  if (missing.length) {
    throw new Error(`Missing ${missing.join(", ")} in .env.local`);
  }

  await sendAdminPush({
    title: "Paid order",
    body: "$49.00 — Reiya (live test)",
    path: "/admin/orders",
  });
  console.log("Test push sent to registered admin devices");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
