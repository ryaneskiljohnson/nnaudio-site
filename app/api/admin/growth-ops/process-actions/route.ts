/**
 * @fileoverview Growth action queue processor API.
 * Runs pending autonomous actions with retry and dead-letter semantics.
 * @module app/api/admin/growth-ops/process-actions/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/service";
import { isAuthorizedCronRequest } from "@/utils/auth/require-cron";
import { executeGrowthAction, type GrowthActionQueueRow } from "@/utils/growth/action-queue";
import {
  FACEBOOK_AD_ACCOUNT_COOKIE_NAME,
  FACEBOOK_TOKEN_COOKIE_NAME,
} from "@/utils/facebook/api";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const DEFAULT_AUTO_ENQUEUE_BASELINE = true;
const DEFAULT_AUTO_ENQUEUE_GUARDRAIL_SWEEP = true;
const DEFAULT_GUARDRAIL_SWEEP_INTERVAL_MINUTES = 15;
/** Stuck `running` rows older than this are returned to `pending`. */
const STALE_RUNNING_LEASE_MS = 15 * 60 * 1000;

/**
 * @brief Checks if request is authorized (admin session OR cron secret).
 * @param request - Incoming request.
 * @returns Authorization result and mode.
 */
async function authorizeProcessor(request: NextRequest) {
  // Cron path: only a constant-time match of the bearer secret (Vercel Cron sends it).
  if (isAuthorizedCronRequest(request)) {
    return { ok: true as const, mode: "cron" as const };
  }

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

  return { ok: true as const, mode: "admin" as const };
}

/**
 * @brief Resolves site URL for internal queue-triggered API calls (e.g. email cron).
 * @returns Absolute base URL without trailing slash.
 * @note On Vercel production, prefers `NEXT_PUBLIC_SITE_URL` so nested `fetch` hits the same
 *   canonical host as operators (custom domain), avoiding deployment-host-only edge cases.
 */
function resolveSiteBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (process.env.VERCEL_ENV === "production" && site) {
    return site;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (site) {
    return site;
  }
  return "http://localhost:3000";
}

/**
 * @brief Returns current UTC minute key for idempotent baseline actions.
 * @returns Key in YYYYMMDDHHmm format.
 */
function getUtcMinuteKey(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
}

/**
 * @brief Builds a UTC bucket key aligned to a minute interval.
 * @param now - Current timestamp.
 * @param intervalMinutes - Bucket interval in minutes.
 * @returns Key in YYYYMMDDHHmm format.
 */
function getUtcBucketMinuteKey(now: Date, intervalMinutes: number): string {
  const safeInterval = Math.max(1, Math.min(60, Math.floor(intervalMinutes)));
  const flooredMinute = Math.floor(now.getUTCMinutes() / safeInterval) * safeInterval;
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(flooredMinute).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
}

/**
 * @brief Conditionally enqueues baseline growth actions for autonomous operation.
 * @returns Number of new baseline actions inserted.
 * @note Uses idempotency keys so multiple workers do not duplicate inserts.
 */
async function enqueueBaselineActionsIfEnabled(): Promise<number> {
  const autoEnqueueEnabled =
    (process.env.AI_GROWTH_AUTO_ENQUEUE_BASELINE ?? String(DEFAULT_AUTO_ENQUEUE_BASELINE))
      .toLowerCase() === "true";
  if (!autoEnqueueEnabled) {
    return 0;
  }

  const now = new Date();
  const minuteKey = getUtcMinuteKey(now);
  const idempotencyKey = `baseline-email-process-${minuteKey}`;
  const adminClient = await createAdminClient();
  let insertedCount = 0;

  const { data: existing } = await (adminClient as any)
    .from("growth_action_queue")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (!existing?.id) {
    const { error } = await (adminClient as any).from("growth_action_queue").insert({
      action_type: "email_process_scheduled",
      payload: {},
      status: "pending",
      priority: 120,
      max_attempts: 3,
      run_after: now.toISOString(),
      idempotency_key: idempotencyKey,
    });

    if (error) {
      // Safe to ignore duplicate conflicts from racing workers.
      if (!String(error.message || "").toLowerCase().includes("duplicate")) {
        throw error;
      }
    } else {
      insertedCount += 1;
    }
  }

  const autoSweepEnabled =
    (process.env.AI_GROWTH_AUTO_ENQUEUE_GUARDRAIL_SWEEP ??
      String(DEFAULT_AUTO_ENQUEUE_GUARDRAIL_SWEEP)).toLowerCase() === "true";
  if (autoSweepEnabled) {
    const parsedSweepIntervalMinutes = Number(
      process.env.AI_GROWTH_GUARDRAIL_SWEEP_INTERVAL_MINUTES ??
        DEFAULT_GUARDRAIL_SWEEP_INTERVAL_MINUTES
    );
    const sweepIntervalMinutes = Number.isFinite(parsedSweepIntervalMinutes)
      ? parsedSweepIntervalMinutes
      : DEFAULT_GUARDRAIL_SWEEP_INTERVAL_MINUTES;
    const sweepBucketKey = getUtcBucketMinuteKey(now, sweepIntervalMinutes);
    const sweepIdempotencyKey = `baseline-facebook-guardrail-sweep-${sweepBucketKey}`;
    const { data: existingSweep } = await (adminClient as any)
      .from("growth_action_queue")
      .select("id")
      .eq("idempotency_key", sweepIdempotencyKey)
      .maybeSingle();
    if (!existingSweep?.id) {
      const { error: sweepError } = await (adminClient as any).from("growth_action_queue").insert({
        action_type: "facebook_guardrail_sweep",
        payload: {},
        status: "pending",
        priority: 60,
        max_attempts: 3,
        run_after: now.toISOString(),
        idempotency_key: sweepIdempotencyKey,
      });
      if (sweepError) {
        if (!String(sweepError.message || "").toLowerCase().includes("duplicate")) {
          throw sweepError;
        }
      } else {
        insertedCount += 1;
      }
    }
  }

  return insertedCount;
}

/**
 * @brief Returns stuck `running` rows to `pending` after the lease expires.
 * @returns Number of rows reclaimed.
 */
async function reclaimStaleRunningActions(): Promise<number> {
  const adminClient = await createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_RUNNING_LEASE_MS).toISOString();
  const { data, error } = await (adminClient as any)
    .from("growth_action_queue")
    .update({
      status: "pending",
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("locked_at", staleBefore)
    .select("id");

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.length : 0;
}

/**
 * @brief Picks ready pending or retryable-failed queue actions.
 * @param batchSize - Max actions to fetch.
 * @returns Pending queue rows.
 */
async function fetchReadyActions(batchSize: number): Promise<GrowthActionQueueRow[]> {
  const adminClient = await createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await (adminClient as any)
    .from("growth_action_queue")
    .select("id, action_type, payload, attempt_count, max_attempts")
    .in("status", ["pending", "failed"])
    .lte("run_after", now)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    throw error;
  }

  return (data ?? []) as GrowthActionQueueRow[];
}

/**
 * @brief Attempts to claim a queue action for processing.
 * @param actionId - Queue action id.
 * @returns True when claim succeeds.
 */
async function claimAction(actionId: string): Promise<boolean> {
  const adminClient = await createAdminClient();
  const { data, error } = await (adminClient as any)
    .from("growth_action_queue")
    .update({
      status: "running",
      locked_at: new Date().toISOString(),
      locked_by: "growth-action-processor",
      updated_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .in("status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

/**
 * @brief Marks a queue action as successfully completed.
 * @param actionId - Queue action id.
 * @param output - Action execution output payload.
 * @returns void
 */
async function markActionSucceeded(
  actionId: string,
  output: Record<string, unknown> | undefined
): Promise<void> {
  const adminClient = await createAdminClient();
  const { error } = await (adminClient as any)
    .from("growth_action_queue")
    .update({
      status: "succeeded",
      result: output ?? {},
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq("id", actionId);
  if (error) {
    throw error;
  }
}

/**
 * @brief Marks action failure and schedules retry or dead-letter transition.
 * @param action - Queue action row.
 * @param errorMessage - Failure error details.
 * @returns Final status after failure handling.
 */
async function markActionFailedWithRetry(
  action: GrowthActionQueueRow,
  errorMessage: string
): Promise<"failed" | "dead_letter"> {
  const nextAttemptCount = action.attempt_count + 1;
  const finalStatus =
    nextAttemptCount >= action.max_attempts ? "dead_letter" : "failed";
  const retryDelayMs = Math.min(60000 * Math.pow(2, Math.max(0, action.attempt_count)), 3600000);
  const runAfter = new Date(Date.now() + retryDelayMs).toISOString();

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as any)
    .from("growth_action_queue")
    .update({
      status: finalStatus,
      attempt_count: nextAttemptCount,
      last_error: errorMessage,
      run_after: finalStatus === "failed" ? runAfter : new Date().toISOString(),
      completed_at: finalStatus === "dead_letter" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq("id", action.id);
  if (error) {
    throw error;
  }

  return finalStatus;
}

/**
 * @brief Processes pending growth queue actions.
 * @param request - Incoming request, supports `batch_size` in JSON body.
 * @returns Processing summary including per-action outcomes.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeProcessor(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = (await request.json().catch(() => ({}))) as {
      batch_size?: number;
      seed_baseline?: boolean;
    };
    const requestedBatchSize = Number(body.batch_size ?? DEFAULT_BATCH_SIZE);
    const batchSize = Math.max(1, Math.min(requestedBatchSize, MAX_BATCH_SIZE));
    const seedBaseline = body.seed_baseline !== false;
    const siteBaseUrl = resolveSiteBaseUrl();
    const baselineEnqueued = seedBaseline ? await enqueueBaselineActionsIfEnabled() : 0;
    const vercelCronSignature = request.headers.get("x-vercel-cron-signature");
    const facebookTokenOverride =
      auth.mode === "admin"
        ? request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null
        : null;
    const facebookAdAccountIdOverride =
      auth.mode === "admin"
        ? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ??
          process.env.FACEBOOK_AD_ACCOUNT_ID ??
          null
        : null;

    const growthExecutionOptions = {
      facebookTokenOverride,
      facebookAdAccountIdOverride,
      vercelCronSignature,
    };

    await reclaimStaleRunningActions();
    const readyActions = await fetchReadyActions(batchSize);
    if (readyActions.length === 0) {
      return NextResponse.json({
        success: true,
        mode: auth.mode,
        seed_baseline: seedBaseline,
        baseline_enqueued: baselineEnqueued,
        processed: 0,
        message: "No pending growth actions ready to process.",
      });
    }

    const outcomes: Array<{
      id: string;
      action_type: string;
      status: "succeeded" | "failed" | "dead_letter" | "skipped";
      error?: string;
    }> = [];

    for (const action of readyActions) {
      const claimed = await claimAction(action.id);
      if (!claimed) {
        outcomes.push({
          id: action.id,
          action_type: action.action_type,
          status: "skipped",
          error: "Action was claimed by another processor.",
        });
        continue;
      }

      const execution = await executeGrowthAction(
        action,
        siteBaseUrl,
        growthExecutionOptions
      );
      if (execution.success) {
        await markActionSucceeded(action.id, execution.output);
        outcomes.push({
          id: action.id,
          action_type: action.action_type,
          status: "succeeded",
        });
      } else {
        const finalStatus = await markActionFailedWithRetry(
          action,
          execution.error ?? "Unknown action failure"
        );
        outcomes.push({
          id: action.id,
          action_type: action.action_type,
          status: finalStatus,
          error: execution.error ?? "Unknown action failure",
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode: auth.mode,
      seed_baseline: seedBaseline,
      baseline_enqueued: baselineEnqueued,
      requested_batch_size: batchSize,
      processed: outcomes.length,
      outcomes,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/growth-ops/process-actions:", error);
    return NextResponse.json(
      { error: "Failed to process growth actions" },
      { status: 500 }
    );
  }
}

/**
 * @brief Vercel Cron invokes scheduled routes via GET; delegate to POST logic.
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

