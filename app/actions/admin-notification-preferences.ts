/**
 * @fileoverview Admin notification preferences: get and update toggles for order email copies.
 * @module actions/admin-notification-preferences
 *
 * Used by the admin notifications page. Preferences are stored in
 * admin_notification_preferences. Free-order copies are never sent.
 */

"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * @brief Shape of admin notification preferences (order email toggles)
 */
export interface AdminNotificationPreferences {
  notify_on_paid_order: boolean;
}

/**
 * @brief Fetches the current user's admin notification preferences.
 * @returns Preferences or null if not found; creates a row with defaults on first read for admins.
 * @note Caller must ensure user is admin; RLS restricts to admins and own row only.
 */
export async function getAdminNotificationPreferences(): Promise<{
  success: boolean;
  preferences: AdminNotificationPreferences | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, preferences: null, error: "Unauthorized" };
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user")
      .eq("user", user.id)
      .single();

    if (!adminRow) {
      return { success: false, preferences: null, error: "Forbidden" };
    }

    const { data: prefs, error } = await supabase
      .from("admin_notification_preferences")
      .select("notify_on_paid_order")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[AdminNotificationPreferences] get error:", error);
      return { success: false, preferences: null, error: error.message };
    }

    if (prefs) {
      return {
        success: true,
        preferences: {
          notify_on_paid_order: prefs.notify_on_paid_order ?? false,
        },
      };
    }

    // First time: no row yet; return defaults (row created on first update)
    return {
      success: true,
      preferences: {
        notify_on_paid_order: false,
      },
    };
  } catch (e) {
    console.error("[AdminNotificationPreferences] get exception:", e);
    return {
      success: false,
      preferences: null,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * @brief Updates the current admin's notification preferences.
 * @param preferences - New values for notify_on_paid_order
 * @returns Success and optional error message.
 * @note notify_on_free_order is always persisted as false; free orders never notify admins.
 */
export async function updateAdminNotificationPreferences(
  preferences: AdminNotificationPreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user")
      .eq("user", user.id)
      .single();

    if (!adminRow) {
      return { success: false, error: "Forbidden" };
    }

    const { error } = await supabase
      .from("admin_notification_preferences")
      .upsert(
        {
          user_id: user.id,
          notify_on_paid_order: preferences.notify_on_paid_order,
          notify_on_free_order: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[AdminNotificationPreferences] update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error("[AdminNotificationPreferences] update exception:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
