"use server";

import { type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/database.types";

/**
 * @fileoverview Token refresh endpoint for NNAudio Access desktop app
 * @module nnaudio-access/token/refresh
 *
 * Refreshes session using both access_token and refresh_token. Supabase requires
 * both for session refresh. Uses setSession first; falls back to refreshSession
 * if setSession fails (e.g. access token expired).
 * Response format matches login for C++ compatibility.
 */

function formatError(code: string, message: string): string {
  return JSON.stringify({ code, message });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = (body as { access_token?: string }).access_token;
    const refreshToken = (body as { refresh_token?: string }).refresh_token;

    if (!accessToken || typeof accessToken !== "string") {
      return new Response(
        formatError("invalid_token", "access_token is required"),
        { status: 400 }
      );
    }
    if (!refreshToken || typeof refreshToken !== "string") {
      return new Response(
        formatError("invalid_token", "refresh_token is required"),
        { status: 400 }
      );
    }

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll(_cookiesToSet) {},
        },
      }
    );

    // Try setSession first (Supabase requires both tokens)
    const { data: setSessionData, error: setSessionError } =
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

    let user = setSessionData?.user;
    let session = setSessionData?.session;
    let error = setSessionError;

    // If setSession failed (e.g. access token expired), fall back to refreshSession
    if (error || !user || !session) {
      const refreshResult = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      user = refreshResult.data.user;
      session = refreshResult.data.session;
      error = refreshResult.error;
    }

    if (error || !user || !session) {
      return new Response(
        formatError(
          error?.code || "invalid_token",
          error?.message || "Token refresh failed"
        ),
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const userNicename =
      profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : user.email?.split("@")[0] || "user";

    const response = {
      token: session.access_token,
      refresh_token: session.refresh_token ?? "",
      user_email: user.email || "",
      user_nicename: userNicename,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[NNAudio Access Token Refresh] Error:", err);
    return new Response(
      formatError("server_error", "Unable to refresh token"),
      { status: 500 }
    );
  }
}
