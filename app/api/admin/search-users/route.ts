import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const exact = searchParams.get("exact") === "true"; // For exact email matching

    if (!query || query.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const supabase = await createSupabaseServiceRole();
    const normalizedQuery = query.trim().toLowerCase();
    const usersMap = new Map<string, { id: string; email: string }>();

    // Search in auth.users directly (most reliable source)
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: exact ? 5000 : 1000, // Get more users for exact match
      });

      if (authError) {
        console.error("[search-users] auth.users error:", authError);
      } else if (authUsers?.users) {
        console.log(`[search-users] Searching through ${authUsers.users.length} users from auth.users`);
        authUsers.users.forEach((user) => {
          if (user.email) {
            const userEmailLower = user.email.toLowerCase();
            // For exact match, check exact equality; for search, check contains
            const matches = exact 
              ? userEmailLower === normalizedQuery
              : userEmailLower.includes(normalizedQuery);
            
            if (matches) {
              console.log(`[search-users] Match found: ${user.email} (query: ${normalizedQuery})`);
              usersMap.set(user.id, { id: user.id, email: user.email });
            }
          }
        });
      } else {
        console.log("[search-users] No users returned from auth.users");
      }
    } catch (authErr: any) {
      console.error("[search-users] Exception searching auth.users:", authErr?.message || authErr);
    }

    // Also search in profiles table as backup (in case auth.users search fails)
    if (usersMap.size === 0 || !exact) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .not("email", "is", null)
        .ilike("email", exact ? normalizedQuery : `%${normalizedQuery}%`)
        .limit(exact ? 1 : 20);

      if (profilesError) {
        console.error("[search-users] profiles error:", profilesError);
      }

      if (!profilesError && profiles) {
        console.log(`[search-users] Found ${profiles.length} profiles`);
        profiles.forEach((p) => {
          if (p.email) {
            const profileEmailLower = p.email.toLowerCase();
            const matches = exact
              ? profileEmailLower === normalizedQuery
              : profileEmailLower.includes(normalizedQuery);
            
            if (matches && !usersMap.has(p.id)) {
              console.log(`[search-users] Profile match found: ${p.email}`);
              usersMap.set(p.id, { id: p.id, email: p.email });
            }
          }
        });
      }
    }

    console.log(`[search-users] Final result: ${usersMap.size} users found for query "${query}"`);

    // Convert map to array, sort by email, and limit to 20 (or 1 for exact)
    const users = Array.from(usersMap.values())
      .sort((a, b) => a.email.localeCompare(b.email))
      .slice(0, exact ? 1 : 20);

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error in search-users API:", error);
    return NextResponse.json(
      { users: [], error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
