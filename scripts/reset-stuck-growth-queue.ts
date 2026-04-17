/**
 * @fileoverview Resets `growth_action_queue` rows stuck in `running` back to `pending`
 * so the processor can reclaim them after a deploy or crash.
 * @module scripts/reset-stuck-growth-queue
 * @note Uses `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`.
 * @example bun run scripts/reset-stuck-growth-queue.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

/**
 * @brief Loads required Supabase URL and service role key from the environment.
 * @returns Supabase URL and service role key.
 */
function requireSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  return { url, key };
}

/**
 * @brief Resets all `running` growth queue rows to `pending` and clears lock fields.
 * @returns Count of rows updated.
 */
async function resetStuckRunningRows(): Promise<number> {
  const { url, key } = requireSupabaseEnv();
  const client = createClient(url, key);
  const { data: stuck, error: selErr } = await client
    .from("growth_action_queue")
    .select("id")
    .eq("status", "running");
  if (selErr) {
    throw selErr;
  }
  const count = stuck?.length ?? 0;
  if (count === 0) {
    return 0;
  }
  const { error: updErr } = await client
    .from("growth_action_queue")
    .update({
      status: "pending",
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("status", "running");
  if (updErr) {
    throw updErr;
  }
  return count;
}

/**
 * @brief CLI entry: prints how many stuck rows were reset.
 * @returns void
 */
async function main(): Promise<void> {
  const n = await resetStuckRunningRows();
  console.log(
    n === 0
      ? "No growth_action_queue rows were in status=running."
      : `Reset ${n} growth_action_queue row(s) from running → pending.`
  );
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
