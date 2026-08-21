/**
 * @fileoverview Public heartbeat for anonymous live-site presence.
 * Upserts or removes a visitor row used by the admin live-count UI.
 * @module api/presence
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";
import {
  isExcludedPresenceIp,
  isPresenceVisitorId,
  PRESENCE_STALE_AFTER_MS,
  sanitizePresencePath,
} from "@/utils/presence";

/**
 * @brief Records or clears a visitor heartbeat.
 * POST /api/presence
 * @returns 204 on success; 400 invalid body; 429 rate limited; 500 on error
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  if (!checkRateLimit(`presence:${clientIp}`, 60, 60)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { visitorId, path, left } = body as {
    visitorId?: unknown;
    path?: unknown;
    left?: unknown;
  };

  if (!isPresenceVisitorId(visitorId)) {
    return NextResponse.json({ error: "Invalid visitorId" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServiceRole();
    const userSupabase = await createClient();
    const ignoreVisitor =
      isExcludedPresenceIp(clientIp) || (await checkAdmin(userSupabase));

    if (left === true || ignoreVisitor) {
      const { error } = await supabase
        .from("site_presence")
        .delete()
        .eq("visitor_id", visitorId);

      if (error) {
        console.error("[presence] leave failed:", error.message);
        return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
      }

      return new NextResponse(null, { status: 204 });
    }

    const sanitizedPath = sanitizePresencePath(path);
    const now = new Date().toISOString();

    const { error } = await supabase.from("site_presence").upsert(
      {
        visitor_id: visitorId,
        path: sanitizedPath,
        last_seen: now,
      },
      { onConflict: "visitor_id" },
    );

    if (error) {
      console.error("[presence] upsert failed:", error.message);
      return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
    }

    if (Math.random() < 0.05) {
      const staleCutoff = new Date(Date.now() - PRESENCE_STALE_AFTER_MS).toISOString();
      const { error: cleanupError } = await supabase
        .from("site_presence")
        .delete()
        .lt("last_seen", staleCutoff);

      if (cleanupError) {
        console.error("[presence] cleanup failed:", cleanupError.message);
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[presence] Error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
