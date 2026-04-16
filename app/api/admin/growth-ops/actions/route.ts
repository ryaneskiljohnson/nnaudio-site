/**
 * @fileoverview Admin Growth Ops action queue management API.
 * Supports listing and enqueuing autonomous growth actions with idempotency.
 * @module app/api/admin/growth-ops/actions/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/service";
import { isSupportedGrowthActionType } from "@/utils/growth/action-queue";

/**
 * @brief Validates authenticated admin access.
 * @returns Admin auth result with optional HTTP response.
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

  return {
    ok: true as const,
    userId: user.id,
  };
}

/**
 * @brief Lists recent growth queue actions for operators.
 * @param request - Incoming request with optional status and limit query params.
 * @returns Queue rows sorted by newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    const adminClient = await createAdminClient();
    let query = (adminClient as any)
      .from("growth_action_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      actions: data ?? [],
    });
  } catch (error) {
    console.error("Error in GET /api/admin/growth-ops/actions:", error);
    return NextResponse.json(
      { error: "Failed to load growth actions" },
      { status: 500 }
    );
  }
}

/**
 * @brief Enqueues an autonomous growth action.
 * @param request - Incoming request with action_type, payload, optional priority/idempotency_key.
 * @returns The inserted (or deduplicated existing) queue action row.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const body = (await request.json()) as {
      action_type?: string;
      payload?: Record<string, unknown>;
      priority?: number;
      max_attempts?: number;
      run_after?: string;
      idempotency_key?: string;
    };

    if (!body.action_type || !isSupportedGrowthActionType(body.action_type)) {
      return NextResponse.json(
        {
          error:
            "Invalid action_type. Supported: email_process_scheduled, facebook_pause_campaign, facebook_resume_campaign, facebook_guardrail_sweep, facebook_scale_campaign_budget.",
        },
        { status: 400 }
      );
    }

    const priority = Number.isFinite(body.priority) ? Number(body.priority) : 100;
    const maxAttempts = Number.isFinite(body.max_attempts) ? Number(body.max_attempts) : 3;
    const runAfter = body.run_after ? new Date(body.run_after).toISOString() : new Date().toISOString();
    const idempotencyKey = body.idempotency_key?.trim() || null;

    const adminClient = await createAdminClient();

    if (idempotencyKey) {
      const { data: existing } = await (adminClient as any)
        .from("growth_action_queue")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({
          success: true,
          deduplicated: true,
          action: existing,
        });
      }
    }

    const insertPayload = {
      action_type: body.action_type,
      payload: body.payload ?? {},
      priority,
      max_attempts: Math.max(1, Math.min(maxAttempts, 10)),
      run_after: runAfter,
      idempotency_key: idempotencyKey,
      created_by: auth.userId,
    };

    const { data, error } = await (adminClient as any)
      .from("growth_action_queue")
      .insert(insertPayload)
      .select("*")
      .single();
    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      action: data,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/growth-ops/actions:", error);
    return NextResponse.json(
      { error: "Failed to enqueue growth action" },
      { status: 500 }
    );
  }
}

