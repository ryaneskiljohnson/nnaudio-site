"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Format error response
function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

// Validate Supabase token
async function validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    if (!token) return { valid: false };

    // Create a client with the token in Authorization header
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll(_cookiesToSet) {},
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { valid: false };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("[Token Validation] Error:", error);
    return { valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const token = body.get("token")?.toString() || "";
    const serialKey = body.get("serial")?.toString() || "";

    if (!serialKey) {
      return new Response(
        formatError("Serial key is required"),
        { status: 400 }
      );
    }

    // Validate token
    const { valid, userId } = await validateToken(token);
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    // TODO: Implement serial key redemption logic
    // For now, return an error indicating it's not implemented
    // You'll need to create a serial_keys table and validation logic
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Serial key redemption not yet implemented in Supabase system",
      }),
      {
        status: 501, // Not Implemented
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[NNAudio Access Redeem] Error:", error);
    return new Response(formatError("Unable to handle serial key request"), {
      status: 500,
    });
  }
}

