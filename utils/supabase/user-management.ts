"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

export interface UserManagementRecord {
  id: string;
  user_id?: string | null;
  user_email: string | null;
  pro: boolean;
  notes: string | null;
  active?: boolean;
}

/**
 * @brief Check if a user has pro status via user_management, keyed by auth user id.
 * @param userId - Supabase auth.users id
 */
export async function checkUserManagementProByUserId(
  userId: string
): Promise<{
  rowExists: boolean;
  hasPro: boolean;
  notes: string | null;
  error: Error | null;
}> {
  try {
    const supabase = await createSupabaseServiceRole();

    const { data, error } = await supabase
      .from("user_management")
      .select("pro, notes")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          rowExists: false,
          hasPro: false,
          notes: null,
          error: null,
        };
      }
      return {
        rowExists: false,
        hasPro: false,
        notes: null,
        error: error as Error,
      };
    }

    return {
      rowExists: true,
      hasPro: data?.pro ?? false,
      notes: data?.notes ?? null,
      error: null,
    };
  } catch (error) {
    return {
      rowExists: false,
      hasPro: false,
      notes: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Check if a user has pro status via user_management table
 */
export async function checkUserManagementPro(
  email: string
): Promise<{ hasPro: boolean; notes: string | null; error: Error | null }> {
  try {
    const supabase = await createSupabaseServiceRole();

    const normalized = email.trim().toLowerCase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();

    if (profile?.id) {
      const byId = await checkUserManagementProByUserId(profile.id);
      if (byId.error) {
        return { hasPro: false, notes: null, error: byId.error };
      }
      if (byId.rowExists) {
        return {
          hasPro: byId.hasPro,
          notes: byId.notes,
          error: null,
        };
      }
    }

    const { data, error } = await supabase
      .from("user_management")
      .select("pro, notes")
      .eq("user_email", normalized)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        return { hasPro: false, notes: null, error: null };
      }
      return { hasPro: false, notes: null, error: error as Error };
    }

    return {
      hasPro: data?.pro ?? false,
      notes: data?.notes ?? null,
      error: null,
    };
  } catch (error) {
    return {
      hasPro: false,
      notes: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get all user_management records (admin only)
 */
export async function getAllUserManagementRecords(): Promise<{
  data: UserManagementRecord[] | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_management")
      .select("*")
      .order("user_email", { ascending: true });

    if (error) {
      return {
        data: null,
        error: error as Error,
      };
    }

    return {
      data: data as UserManagementRecord[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
