import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (type === "recovery" || type === "invite") {
        redirect("/reset-password");
      }
      redirect("/dashboard");
    }
  }

  if (access_token && refresh_token && type) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (type === "recovery" || type === "invite") {
        redirect("/reset-password");
      }
      redirect("/dashboard");
    }
  }

  // Tokens in fragment (hash): server never sees them. Return HTML that reads hash and redirects.
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
    window.location.replace(window.location.origin + "/login?error=verification");
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
