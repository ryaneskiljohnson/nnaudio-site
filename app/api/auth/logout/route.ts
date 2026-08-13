"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/database.types";

type LogoutResponse = {
  success: boolean;
  error: { code: string; message: string } | null;
};

const ok = (): NextResponse<LogoutResponse> => {
  return NextResponse.json({
    success: true,
    error: null,
  });
};

const err = (code: string, message: string): NextResponse<LogoutResponse> => {
  return NextResponse.json({
    success: false,
    error: { code, message },
  });
};

/**
 * Per-request client. A module-level client plus `setSession` can leak
 * one caller's tokens into a concurrent logout.
 */
function createTokenClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setAll(_cookiesToSet) {},
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<LogoutResponse>> {
  try {
    const body = await request.formData();
    const access_token = body.get("access_token")?.toString();
    const refresh_token = body.get("refresh_token")?.toString();
    const scope = (body.get("scope")?.toString() || "local") as
      | "global"
      | "local"
      | "others";

    if (!access_token || !refresh_token)
      return err(
        "invalid_token",
        "access_token and refresh_token are required"
      );

    const supabase = createTokenClient();

    // Set the session in supabase first
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (setSessionError) {
      return err(setSessionError.code as string, setSessionError.message);
    }

    // Sign out with the specified scope
    const { error } = await supabase.auth.signOut({ scope });

    if (error) {
      return err(error.code as string, error.message);
    }

    return ok();
  } catch {
    return err("unexpected_failure", "An unexpected error occurred");
  }
}
