/**
 * @fileoverview Registers APNs device tokens from the NNAudio admin iOS wrapper.
 * @module api/admin/push-devices
 *
 * Authenticated by the existing WAF bypass header plus a shared app secret.
 * Tokens are upserted so reinstalls refresh sandbox/production and updated_at.
 */

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { isApnsDeviceToken } from "@/lib/admin-push";

const APP_BYPASS_HEADER = "x-nnaudio-app";
const APP_PUSH_SECRET_HEADER = "x-nnaudio-app-push-secret";

/**
 * @brief Compares two strings in constant time.
 * @param provided Header value from the app
 * @param expected Server secret
 * @returns Whether the values match
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * @brief Upserts an APNs device token for admin push alerts.
 * POST /api/admin/push-devices
 * @param request JSON `{ token, sandbox }` plus `X-NNAudio-App` and `X-NNAudio-App-Push-Secret`
 * @returns 200 `{ ok: true }` on success
 * @returns 400 `{ error }` when the token is missing or malformed
 * @returns 401 `{ error }` when the app headers/secret are invalid
 * @returns 503 `{ error }` when `NNAUDIO_APP_PUSH_SECRET` is not configured
 * @returns 500 `{ error }` on database failure
 * @example
 * ```json
 * { "ok": true }
 * ```
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.NNAUDIO_APP_PUSH_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Push registration is not configured" },
      { status: 503 }
    );
  }

  const appHeader = request.headers.get(APP_BYPASS_HEADER);
  const providedSecret = request.headers.get(APP_PUSH_SECRET_HEADER) ?? "";
  if (appHeader !== "1" || !secretsMatch(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: unknown; sandbox?: unknown };
  try {
    body = (await request.json()) as { token?: unknown; sandbox?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!isApnsDeviceToken(token)) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }

  const sandbox = body.sandbox === true;

  try {
    const supabase = await createSupabaseServiceRole();
    const { error } = await supabase.from("admin_push_devices").upsert(
      {
        device_token: token,
        sandbox,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_token" }
    );

    if (error) {
      console.error("[admin push-devices] upsert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to register device" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin push-devices] exception:", error);
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }
}
