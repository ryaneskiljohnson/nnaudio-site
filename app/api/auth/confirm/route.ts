"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Add a small delay to ensure the session is fully established
      // This prevents race conditions where the client gets SIGNED_IN event
      // before the session is completely ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect based on the type of OTP verification (signup/email confirmation -> dashboard)
      if (type === "recovery") {
        redirect("/reset-password");
      }
      redirect("/dashboard");
    }
  }

  // redirect the user to an error page with some instructions
  redirect("/error");
}
