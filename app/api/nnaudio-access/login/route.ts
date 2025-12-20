"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/database.types";

// Format error response to match WordPress JWT format expected by desktop app
function formatError(code: string, message: string): string {
  return JSON.stringify({ code, message });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const username = body.get("username")?.toString() || "";
    const password = body.get("password")?.toString() || "";

    if (!username || !password) {
      return new Response(
        formatError("invalid_credentials", "Username and password are required"),
        {
          status: 400,
        }
      );
    }

    // Create Supabase client without cookies (for API usage)
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

    // Try to sign in (username can be email)
    const {
      data: { user, session },
      error,
    } = await supabase.auth.signInWithPassword({
      email: username, // Supabase uses email for auth
      password,
    });

    if (error || !user || !session) {
      return new Response(
        formatError(
          error?.code || "invalid_credentials",
          error?.message || "Invalid credentials"
        ),
        { status: 401 }
      );
    }

    // Get user profile for username
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    // Format response to match WordPress JWT format expected by desktop app
    const response = {
      token: session.access_token, // Use Supabase access token as JWT
      user_email: user.email || "",
      user_nicename:
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : user.email?.split("@")[0] || "user",
      user_display_name:
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : user.email?.split("@")[0] || "user",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[NNAudio Access Login] Error:", error);
    return new Response(
      formatError("server_error", "Unable to login"),
      { status: 500 }
    );
  }
}

