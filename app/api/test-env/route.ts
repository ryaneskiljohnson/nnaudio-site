import { NextResponse } from "next/server";

/**
 * Debug endpoint. Disabled entirely in production to avoid leaking
 * environment metadata (service-key presence/length, project URL, env names).
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
