/**
 * @fileoverview Records first-touch NNAudio Access installer download per OS for the logged-in user.
 * @module api/nnaudio-access/track-installer-download
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

/**
 * @brief POST — set installer timestamp if not already set for this platform.
 * @returns 200 { success }; 401 unauthenticated; 400 invalid body
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const platform = (body as { platform?: string })?.platform;
    if (platform !== "macos" && platform !== "windows") {
      return NextResponse.json(
        { error: 'platform must be "macos" or "windows"' },
        { status: 400 },
      );
    }

    const service = await createSupabaseServiceRole();
    const now = new Date().toISOString();
    const column =
      platform === "macos"
        ? "nnaudio_access_installer_macos_at"
        : "nnaudio_access_installer_windows_at";

    const { error } = await service
      .from("profiles")
      .update({ [column]: now })
      .eq("id", user.id)
      .is(column, null);

    if (error) {
      if (error.code === "42703" || error.message?.includes("column")) {
        console.error(
          "[track-installer-download] Missing columns — run migration:",
          error.message,
        );
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 },
        );
      }
      console.error("[track-installer-download]", error);
      return NextResponse.json(
        { error: "Failed to record download" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[track-installer-download]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
