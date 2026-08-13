import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "Not authenticated",
      },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, full_name, username, website, avatar_url, subscription, subscription_expiration, subscription_source"
    )
    .eq("id", user.id)
    .single();

  const { data: adminCheck, error: adminError } = await supabase
    .from("admins")
    .select("id")
    .eq("user", user.id)
    .maybeSingle();

  const isAdmin =
    adminError && adminError.code === "PGRST116" ? false : !!adminCheck;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      profile,
      isAdmin,
    },
  });
}
