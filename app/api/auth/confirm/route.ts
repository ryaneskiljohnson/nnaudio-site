"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/** Types that should go to reset-password; everything else goes to dashboard. */
const RESET_TYPES = ["recovery", "invite"];

/**
 * Handles Supabase email confirmation when tokens are in query (PKCE).
 * If tokens are in fragment, returns HTML that redirects client-side to dashboard with hash.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (RESET_TYPES.includes(type)) {
        redirect("/reset-password");
      }
      redirect("/dashboard");
    }
  }

  // Supabase often redirects with tokens in the fragment (hash). Server never sees the hash.
  // Return a page that reads the hash and redirects to dashboard (or reset-password) so the app can establish the session.
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confirming...</title></head><body>
<script>
(function() {
  var hash = window.location.hash && window.location.hash.substring(1);
  var params = new URLSearchParams(hash);
  var type = params.get("type");
  var accessToken = params.get("access_token");
  var refreshToken = params.get("refresh_token");
  var goReset = type === "recovery" || type === "invite";
  var path = goReset ? "/reset-password" : "/dashboard";
  if (accessToken && refreshToken) {
    window.location.replace(window.location.origin + path + (hash ? "#" + hash : ""));
  } else {
    window.location.replace(window.location.origin + "/error");
  }
})();
</script>
<p>Confirming your email&hellip;</p>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
