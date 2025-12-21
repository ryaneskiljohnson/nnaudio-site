"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import {
  getAllUsersForCRM,
  getUsersForCRMCount,
  getAdditionalUserData,
} from "@/utils/stripe/admin-analytics";
import { fetchProfile } from "@/utils/supabase/actions";
import { sendEmail } from "@/utils/email";

export interface UserManagementRecord {
  user_email: string;
  pro: boolean;
  notes: string | null;
  active: boolean;
}

// Helper to check if user is admin
export async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: adminCheck, error: adminError } = await supabase
    .from("admins")
    .select("*")
    .eq("user", user.id)
    .single();

  return adminError?.code !== "PGRST116" && !!adminCheck;
}

/**
 * Get all user_management records (admin only)
 */
export async function getUserManagementRecords(): Promise<{
  data: UserManagementRecord[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("user_management")
      .select("*")
      .order("user_email", { ascending: true });

    if (error) {
      console.error("Error fetching user_management records:", error);
      return { data: null, error: "Failed to fetch records" };
    }

    return { data: data as UserManagementRecord[], error: null };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      data: null,
      error: "Internal server error",
    };
  }
}

/**
 * Create new user_management record (admin only)
 */
export async function createUserManagementRecord(
  user_email: string,
  pro: boolean,
  notes?: string | null,
  active?: boolean
): Promise<{
  data: UserManagementRecord | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    // Validate email format
    if (!user_email || typeof user_email !== "string") {
      return { data: null, error: "Valid email is required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return { data: null, error: "Invalid email format" };
    }

    // Validate pro is boolean
    if (typeof pro !== "boolean") {
      return { data: null, error: "pro must be a boolean" };
    }

    const { data, error } = await supabase
      .from("user_management")
      .insert([
        {
          user_email,
          pro,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      // Handle duplicate email (primary key constraint)
      if (error.code === "23505") {
        return {
          data: null,
          error: "User with this email already exists",
        };
      }

      console.error("Error creating user_management record:", error);
      return { data: null, error: "Failed to create record" };
    }

    // If pro status is true, also update the user's profile subscription
    if (pro) {
      try {
        // Find user by email in auth.users
        const serviceSupabase = await createSupabaseServiceRole();
        const { data: authUser } = await serviceSupabase.auth.admin.listUsers();
        const matchingUser = authUser?.users.find(
          (u) =>
            u.email?.toLowerCase().trim() === user_email.toLowerCase().trim()
        );

        if (matchingUser) {
          // Use centralized function to update the profile
          // This will check user_management, Stripe, and iOS subscriptions
          const { updateUserProStatus } = await import(
            "@/utils/subscriptions/check-subscription"
          );
          await updateUserProStatus(matchingUser.id);
        }
      } catch (profileUpdateError) {
        // Log but don't fail the user_management creation
        console.error(
          "Error updating profile after NFR creation:",
          profileUpdateError
        );
      }
    }

    return { data: data as UserManagementRecord, error: null };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      data: null,
      error: "Internal server error",
    };
  }
}

/**
 * Update existing user_management record (admin only)
 */
export async function updateUserManagementRecord(
  user_email: string,
  updates: {
    pro?: boolean;
    notes?: string | null;
    active?: boolean;
  }
): Promise<{
  data: UserManagementRecord | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    if (!user_email || typeof user_email !== "string") {
      return { data: null, error: "Valid email is required" };
    }

    // Build update object
    const updateData: { pro?: boolean; notes?: string | null } = {};

    if (typeof updates.pro === "boolean") {
      updateData.pro = updates.pro;
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes || null;
    }

    if (Object.keys(updateData).length === 0) {
      return { data: null, error: "No fields to update" };
    }

    const { data, error } = await supabase
      .from("user_management")
      .update(updateData)
      .eq("user_email", user_email)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: "Record not found" };
      }

      console.error("Error updating user_management record:", error);
      return { data: null, error: "Failed to update record" };
    }

    // If pro status was updated, also update the user's profile subscription
    if (typeof updates.pro === "boolean") {
      try {
        // Find user by email in auth.users
        const serviceSupabase = await createSupabaseServiceRole();
        const { data: authUser } = await serviceSupabase.auth.admin.listUsers();
        const matchingUser = authUser?.users.find(
          (u) =>
            u.email?.toLowerCase().trim() === user_email.toLowerCase().trim()
        );

        if (matchingUser) {
          // Use centralized function to update the profile
          // This will check user_management, Stripe, and iOS subscriptions
          const { updateUserProStatus } = await import(
            "@/utils/subscriptions/check-subscription"
          );
          await updateUserProStatus(matchingUser.id);
        }
      } catch (profileUpdateError) {
        // Log but don't fail the user_management update
        console.error(
          "Error updating profile after NFR change:",
          profileUpdateError
        );
      }
    }

    return { data: data as UserManagementRecord, error: null };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      data: null,
      error: "Internal server error",
    };
  }
}

/**
 * Create user_management record and send Supabase invite (admin only)
 */
export async function createUserManagementWithInvite(
  user_email: string,
  pro: boolean,
  notes?: string | null,
  first_name?: string | null,
  last_name?: string | null,
  active?: boolean
): Promise<{
  data: UserManagementRecord | null;
  warning?: string;
  inviteError?: string;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { data: null, error: "Unauthorized" };
    }

    // Validate email format
    if (!user_email || typeof user_email !== "string") {
      return { data: null, error: "Valid email is required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return { data: null, error: "Invalid email format" };
    }

    // Validate pro is boolean
    if (typeof pro !== "boolean") {
      return { data: null, error: "pro must be a boolean" };
    }

    // Step 1: Create user_management record first
    const { data: userManagementData, error: insertError } = await supabase
      .from("user_management")
      .insert([
        {
          user_email,
          pro,
          notes: notes || null,
          active: active !== undefined ? active : true,
        },
      ])
      .select()
      .single();

    if (insertError) {
      // Handle duplicate email (primary key constraint)
      if (insertError.code === "23505") {
        return {
          data: null,
          error: "User with this email already exists",
        };
      }

      console.error("Error creating user_management record:", insertError);
      return { data: null, error: "Failed to create user_management record" };
    }

    // Step 2: Send Supabase invite using service role client
    try {
      const serviceSupabase = await createSupabaseServiceRole();

      // Construct the redirect URL to reset password page
      const baseUrl = "https://cymasphere.com";
      const redirectTo = `${baseUrl}/reset-password`;

      // Build user metadata with name if provided
      const userMetadata: {
        invited_by: string;
        first_name?: string;
        last_name?: string;
      } = {
        invited_by: "admin",
      };

      if (first_name) {
        userMetadata.first_name = first_name;
      }

      if (last_name) {
        userMetadata.last_name = last_name;
      }

      const { data: inviteData, error: inviteError } =
        await serviceSupabase.auth.admin.inviteUserByEmail(user_email, {
          data: userMetadata,
          redirectTo: redirectTo,
        });

      if (inviteError) {
        console.error("Error sending invite:", inviteError);
        // Note: We still return success for the user_management creation
        // but include a warning about the invite
        return {
          data: userManagementData as UserManagementRecord,
          warning: "User_management record created, but invite failed",
          inviteError: inviteError.message,
          error: null,
        };
      }

      return {
        data: userManagementData as UserManagementRecord,
        error: null,
      };
    } catch (inviteError) {
      console.error("Unexpected error sending invite:", inviteError);
      // Still return success for user_management creation
      return {
        data: userManagementData as UserManagementRecord,
        warning: "User_management record created, but invite failed",
        error: null,
      };
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      data: null,
      error: "Internal server error",
    };
  }
}

/**
 * Delete user_management record (admin only)
 */
export async function deleteUserManagementRecord(user_email: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    if (!user_email || typeof user_email !== "string") {
      return { success: false, error: "Valid email is required" };
    }

    const { error } = await supabase
      .from("user_management")
      .delete()
      .eq("user_email", user_email);

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Record not found" };
      }

      console.error("Error deleting user_management record:", error);
      return { success: false, error: "Failed to delete record" };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

/**
 * Get all users for CRM with admin check (admin only)
 * Wrapper around getAllUsersForCRM that adds admin authorization
 */
export async function getAllUsersForCRMAdmin(
  page: number = 1,
  limit: number = 50,
  searchTerm?: string,
  subscriptionFilter?: string,
  sortField?: string,
  sortDirection?: "asc" | "desc"
): Promise<{
  users: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscription: string;
    customerId?: string;
    subscriptionExpiration?: string;
    trialExpiration?: string;
    createdAt: string;
    lastActive?: string;
    totalSpent: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { users: [], error: "Unauthorized" };
    }

    const result = await getAllUsersForCRM(
      page,
      limit,
      searchTerm,
      subscriptionFilter,
      sortField,
      sortDirection
    );

    return { users: result.users };
  } catch (error) {
    console.error("Error in getAllUsersForCRMAdmin:", error);
    return {
      users: [],
      error: error instanceof Error ? error.message : "Failed to fetch users",
    };
  }
}

/**
 * Get a single user by ID for CRM (admin only)
 */
export async function getUserByIdAdmin(userId: string): Promise<{
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscription: string;
    customerId?: string;
    subscriptionExpiration?: string;
    trialExpiration?: string;
    createdAt: string;
    lastActive?: string;
    totalSpent: number;
    hasNfr?: boolean;
  } | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { user: null, error: "Unauthorized" };
    }

    const serviceSupabase = await createSupabaseServiceRole();

    // Get user from auth
    const {
      data: { user: authUser },
      error: authError,
    } = await serviceSupabase.auth.admin.getUserById(userId);
    if (authError || !authUser) {
      return { user: null, error: "User not found" };
    }

    // Get profile
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { user: null, error: "Profile not found" };
    }

    // Check for NFR
    let hasNfr = false;
    if (authUser.email) {
      const normalizedEmail = authUser.email.toLowerCase().trim();
      const { data: nfrRecord } = await serviceSupabase
        .from("user_management")
        .select("pro")
        .eq("user_email", normalizedEmail)
        .maybeSingle();
      hasNfr = nfrRecord?.pro ?? false;
    }

    // Get last active from user_sessions
    const { data: lastSession } = await serviceSupabase
      .from("user_sessions")
      .select("refreshed_at, updated_at, created_at")
      .eq("user_id", userId)
      .order("refreshed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActive =
      lastSession?.refreshed_at ||
      lastSession?.updated_at ||
      lastSession?.created_at ||
      null;

    // Get total spent (simplified - just get from additional data function)
    const { totalSpent } = await getAdditionalUserDataAdmin([userId]);

    const userData = {
      id: userId,
      email: authUser.email || "",
      firstName: profile.first_name || undefined,
      lastName: profile.last_name || undefined,
      subscription: profile.subscription || "none",
      customerId: profile.customer_id || undefined,
      subscriptionExpiration: profile.subscription_expiration || undefined,
      trialExpiration: profile.trial_expiration || undefined,
      createdAt: profile.created_at || new Date().toISOString(),
      lastActive: lastActive || undefined,
      totalSpent: totalSpent[userId] || 0,
      hasNfr,
    };

    return { user: userData };
  } catch (error) {
    console.error("Error in getUserByIdAdmin:", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Failed to fetch user",
    };
  }
}

/**
 * Get user count for CRM with admin check (admin only)
 * Wrapper around getUsersForCRMCount that adds admin authorization
 */
export async function getUsersForCRMCountAdmin(
  searchTerm?: string,
  subscriptionFilter?: string
): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { count: 0, error: "Unauthorized" };
    }

    const count = await getUsersForCRMCount(searchTerm, subscriptionFilter);
    return { count };
  } catch (error) {
    console.error("Error in getUsersForCRMCountAdmin:", error);
    return {
      count: 0,
      error:
        error instanceof Error ? error.message : "Failed to fetch user count",
    };
  }
}

/**
 * Update user profile from Stripe by email (admin only)
 * Finds the user by email and updates their profile
 * @param userEmail The user email to update
 * @returns Object indicating success and any errors
 */
export async function updateUserProfileFromStripeByEmail(
  userEmail: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    if (!userEmail || typeof userEmail !== "string") {
      return { success: false, error: "Valid email is required" };
    }

    // Find user by email using service role
    const serviceSupabase = await createSupabaseServiceRole();
    const { data: authUser } = await serviceSupabase.auth.admin.listUsers();
    const matchingUser = authUser?.users.find(
      (u) => u.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
    );

    if (!matchingUser) {
      return { success: false, error: "User not found" };
    }

    // Use centralized function to update the profile
    const { updateUserProStatus } = await import(
      "@/utils/subscriptions/check-subscription"
    );
    await updateUserProStatus(matchingUser.id);
    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error updating user profile by email:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

/**
 * Update user profile pro status (admin only)
 * Uses the centralized updateUserProStatus function that handles NFR, Stripe, and iOS subscriptions
 * @param userId The user ID to update
 * @returns Object indicating success and any errors
 */
export async function updateUserProfileFromStripe(userId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    if (!userId || typeof userId !== "string") {
      return { success: false, error: "Valid user ID is required" };
    }

    // Use centralized function that handles all subscription sources
    const { updateUserProStatus } = await import(
      "@/utils/subscriptions/check-subscription"
    );
    await updateUserProStatus(userId);

    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error updating user pro status:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

/**
 * Get additional user data (lastActive, totalSpent) with admin check (admin only)
 * This is called separately after users are displayed to improve perceived performance
 */
export async function getAdditionalUserDataAdmin(userIds: string[]): Promise<{
  lastActive: Record<string, string>;
  totalSpent: Record<string, number>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { lastActive: {}, totalSpent: {}, error: "Unauthorized" };
    }

    const result = await getAdditionalUserData(userIds);
    return result;
  } catch (error) {
    console.error("Error in getAdditionalUserDataAdmin:", error);
    return {
      lastActive: {},
      totalSpent: {},
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch additional data",
    };
  }
}

/**
 * Get support tickets for a user with admin check (admin only)
 */
export async function getUserSupportTicketsAdmin(userId: string): Promise<{
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { tickets: [], error: "Unauthorized" };
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ticketsError) {
      // If table doesn't exist (42P01), return empty tickets silently
      // This allows the UI to work even if the migration hasn't been run yet
      if (ticketsError.code === "42P01") {
        return { tickets: [] };
      }
      console.error("Error fetching support tickets:", ticketsError);
      return {
        tickets: [],
        error: ticketsError.message || "Failed to fetch support tickets",
      };
    }

    return { tickets: tickets || [] };
  } catch (error) {
    console.error("Error in getUserSupportTicketsAdmin:", error);
    return {
      tickets: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch support tickets",
    };
  }
}

export async function createSupportTicketAdmin(data: {
  subject: string;
  description: string;
  userId: string;
}): Promise<{
  success: boolean;
  ticket?: {
    id: string;
    ticket_number: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate required fields
    if (!data.subject || !data.description || !data.userId) {
      return {
        success: false,
        error: "All fields are required",
      };
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        subject: data.subject,
        description: data.description,
        user_id: data.userId,
        status: "open",
      })
      .select("id, ticket_number")
      .single();

    if (ticketError) {
      // If table doesn't exist (42P01), return error
      if (ticketError.code === "42P01") {
        return {
          success: false,
          error:
            "Support tickets table does not exist. Please run the migration.",
        };
      }
      console.error("Error creating support ticket:", ticketError);
      return {
        success: false,
        error: ticketError.message || "Failed to create support ticket",
      };
    }

    // Create the initial message
    if (ticket) {
      const { error: messageError } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          user_id: data.userId,
          content: data.description,
          is_admin: true, // Admin creates it
        });

      if (messageError) {
        console.error("Error creating initial message:", messageError);
        // Ticket was created but message failed - still return success
        // as the ticket exists
      }
    }

    return {
      success: true,
      ticket: ticket
        ? {
            id: ticket.id,
            ticket_number: ticket.ticket_number,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error in createSupportTicketAdmin:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create support ticket",
    };
  }
}

export async function updateSupportTicketStatusAdmin(
  ticketId: string,
  status: "open" | "in_progress" | "resolved" | "closed"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate status
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: "Invalid status",
      };
    }

    // Update the ticket status
    const { error: updateError } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId);

    if (updateError) {
      // If table doesn't exist (42P01), return error
      if (updateError.code === "42P01") {
        return {
          success: false,
          error:
            "Support tickets table does not exist. Please run the migration.",
        };
      }
      console.error("Error updating support ticket status:", updateError);
      return {
        success: false,
        error: updateError.message || "Failed to update ticket status",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateSupportTicketStatusAdmin:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update ticket status",
    };
  }
}

/**
 * Get all support tickets with user info (admin only)
 */
export async function getSupportTicketsAdmin(): Promise<{
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    description: string | null;
    status: string;
    user_id: string;
    user_email: string | null;
    user_first_name: string | null;
    user_last_name: string | null;
    user_subscription?: string;
    user_has_nfr?: boolean;
    last_reply_is_admin?: boolean;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    closed_at: string | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { tickets: [], error: "Unauthorized" };
    }

    // Get tickets with user email from auth.users
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select(
        `
        id,
        ticket_number,
        subject,
        description,
        status,
        user_id,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      `
      )
      .order("created_at", { ascending: false });

    if (ticketsError) {
      console.error("Error fetching support tickets:", ticketsError);
      return { tickets: [], error: ticketsError.message };
    }

    // Get the last message for each ticket to determine if admin was last to reply
    // Use a more efficient approach: fetch all messages and find the last one per ticket
    const ticketIds = tickets?.map((t) => t.id) || [];
    const lastMessageMap = new Map<string, boolean>();

    if (ticketIds.length > 0) {
      // Fetch all messages for all tickets in one query, ordered by created_at desc
      // Then we'll process them to get the last message per ticket
      const { data: allMessages, error: messagesError } = await supabase
        .from("support_messages")
        .select("ticket_id, is_admin, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false });

      if (!messagesError && allMessages) {
        // Process messages to get the last one per ticket
        const seenTickets = new Set<string>();
        for (const message of allMessages) {
          if (!seenTickets.has(message.ticket_id)) {
            lastMessageMap.set(message.ticket_id, message.is_admin);
            seenTickets.add(message.ticket_id);
          }
        }
      }

      // For tickets with no messages, default to false
      for (const ticketId of ticketIds) {
        if (!lastMessageMap.has(ticketId)) {
          lastMessageMap.set(ticketId, false);
        }
      }
    }

    // Get user emails, names, and subscription data for all tickets using service role client
    const serviceSupabase = await createSupabaseServiceRole();
    const userIds = [...new Set(tickets?.map((t) => t.user_id) || [])];
    const userEmailsMap = new Map<string, string | null>();
    const userNamesMap = new Map<
      string,
      { firstName: string | null; lastName: string | null }
    >();
    const userSubscriptionMap = new Map<
      string,
      { subscription: string; hasNfr: boolean }
    >();

    for (const userId of userIds) {
      try {
        const {
          data: { user },
        } = await serviceSupabase.auth.admin.getUserById(userId);
        const email = user?.email || null;
        userEmailsMap.set(userId, email);

        // Get subscription and name from profiles table
        const { data: profile } = await serviceSupabase
          .from("profiles")
          .select("subscription, first_name, last_name")
          .eq("id", userId)
          .single();

        // Store user name
        userNamesMap.set(userId, {
          firstName: profile?.first_name || null,
          lastName: profile?.last_name || null,
        });

        // Check NFR status if email exists
        let hasNfr = false;
        if (email) {
          const normalizedEmail = email.toLowerCase().trim();
          const { data: nfrRecord } = await serviceSupabase
            .from("user_management")
            .select("pro")
            .eq("user_email", normalizedEmail)
            .maybeSingle();
          hasNfr = nfrRecord?.pro ?? false;
        }

        userSubscriptionMap.set(userId, {
          subscription: profile?.subscription || "none",
          hasNfr,
        });
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        userEmailsMap.set(userId, null);
        userNamesMap.set(userId, { firstName: null, lastName: null });
        userSubscriptionMap.set(userId, {
          subscription: "none",
          hasNfr: false,
        });
      }
    }

    const ticketsWithUsers = (tickets || []).map((ticket) => {
      const subscriptionData = userSubscriptionMap.get(ticket.user_id) || {
        subscription: "none",
        hasNfr: false,
      };
      const userNameData = userNamesMap.get(ticket.user_id) || {
        firstName: null,
        lastName: null,
      };
      return {
        ...ticket,
        user_email: userEmailsMap.get(ticket.user_id) || null,
        user_first_name: userNameData.firstName,
        user_last_name: userNameData.lastName,
        user_subscription: subscriptionData.subscription,
        user_has_nfr: subscriptionData.hasNfr,
        last_reply_is_admin: lastMessageMap.get(ticket.id) ?? false,
      };
    });

    return { tickets: ticketsWithUsers };
  } catch (error) {
    console.error("Error in getSupportTicketsAdmin:", error);
    return {
      tickets: [],
      error: error instanceof Error ? error.message : "Failed to fetch tickets",
    };
  }
}

/**
 * Get a single support ticket with messages and attachments (admin only)
 */
export async function getSupportTicketAdmin(ticketId: string): Promise<{
  ticket: {
    id: string;
    ticket_number: string;
    subject: string;
    description: string | null;
    status: string;
    user_id: string;
    user_email: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    closed_at: string | null;
    messages: Array<{
      id: string;
      content: string;
      is_admin: boolean;
      user_id: string;
      user_email: string | null;
      created_at: string;
      updated_at: string;
      edited_at: string | null;
      attachments: Array<{
        id: string;
        file_name: string;
        file_size: number;
        file_type: string;
        attachment_type: string;
        url: string | null;
        created_at: string;
      }>;
    }>;
  } | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { ticket: null, error: "Unauthorized" };
    }

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return {
        ticket: null,
        error: ticketError?.message || "Ticket not found",
      };
    }

    // Get user email using service role client
    const serviceSupabase = await createSupabaseServiceRole();
    let userEmail = null;
    try {
      const {
        data: { user },
      } = await serviceSupabase.auth.admin.getUserById(ticket.user_id);
      userEmail = user?.email || null;
    } catch (error) {
      console.error(`Error fetching user ${ticket.user_id}:`, error);
    }

    // Get messages with attachments
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        `
        id,
        content,
        is_admin,
        user_id,
        created_at,
        updated_at,
        edited_at
      `
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
    }

    // Get attachments for all messages
    const messageIds = messages?.map((m) => m.id) || [];
    const { data: attachments, error: attachmentsError } = await supabase
      .from("support_attachments")
      .select("*")
      .in("message_id", messageIds);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }

    // Get user emails for messages using service role client
    const messageUserIds = [...new Set(messages?.map((m) => m.user_id) || [])];
    const messageUserEmailsMap = new Map<string, string | null>();

    for (const userId of messageUserIds) {
      try {
        const {
          data: { user },
        } = await serviceSupabase.auth.admin.getUserById(userId);
        messageUserEmailsMap.set(userId, user?.email || null);
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        messageUserEmailsMap.set(userId, null);
      }
    }

    // Generate signed URLs for attachments that don't have valid URLs
    const bucketName = "support-attachments";
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (att) => {
        let url = att.url;
        // If no URL or URL looks invalid, generate a signed URL
        if (!url || !url.includes("supabase.co")) {
          try {
            const { data: signedUrlData, error: signedUrlError } =
              await supabase.storage
                .from(bucketName)
                .createSignedUrl(att.storage_path, 31536000); // 1 year expiry

            if (!signedUrlError && signedUrlData) {
              url = signedUrlData.signedUrl;
            }
          } catch (error) {
            console.error(
              `Error generating signed URL for attachment ${att.id}:`,
              error
            );
          }
        }
        return { ...att, url };
      })
    );

    // Combine messages with attachments
    const messagesWithAttachments = (messages || []).map((message) => ({
      ...message,
      user_email: messageUserEmailsMap.get(message.user_id) || null,
      attachments: attachmentsWithUrls
        .filter((att) => att.message_id === message.id)
        .map((att) => ({
          id: att.id,
          file_name: att.file_name,
          file_size: att.file_size,
          file_type: att.file_type,
          attachment_type: att.attachment_type,
          url: att.url,
          created_at: att.created_at,
        })),
    }));

    return {
      ticket: {
        ...ticket,
        user_email: userEmail,
        messages: messagesWithAttachments,
      },
    };
  } catch (error) {
    console.error("Error in getSupportTicketAdmin:", error);
    return {
      ticket: null,
      error: error instanceof Error ? error.message : "Failed to fetch ticket",
    };
  }
}

/**
 * Delete a support ticket (admin only)
 */
export async function deleteSupportTicketAdmin(ticketId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    // Delete the ticket (cascade will delete messages and attachments)
    const { error: deleteError } = await supabase
      .from("support_tickets")
      .delete()
      .eq("id", ticketId);

    if (deleteError) {
      console.error("Error deleting support ticket:", deleteError);
      return {
        success: false,
        error: deleteError.message || "Failed to delete ticket",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteSupportTicketAdmin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete ticket",
    };
  }
}

/**
 * Get recent support ticket messages from users (non-admin messages) for notifications (admin only)
 * Groups messages by user and returns the most recent message from each user with message count
 */
export async function getRecentSupportTicketMessagesAdmin(
  limit: number = 10
): Promise<{
  messages: Array<{
    id: string;
    ticket_id: string;
    ticket_number: string;
    ticket_subject: string;
    ticket_status: string;
    content: string;
    user_id: string;
    user_email: string | null;
    created_at: string;
    message_count: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { messages: [], error: "Unauthorized" };
    }

    // Get recent non-admin messages (user messages only) - get more to allow grouping
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        `
        id,
        ticket_id,
        content,
        user_id,
        created_at
      `
      )
      .eq("is_admin", false)
      .order("created_at", { ascending: false })
      .limit(limit * 5); // Get more messages to allow grouping

    if (messagesError) {
      console.error("Error fetching recent messages:", messagesError);
      return { messages: [], error: messagesError.message };
    }

    if (!messages || messages.length === 0) {
      return { messages: [] };
    }

    // Get ticket info for each message
    const ticketIds = [...new Set(messages.map((m) => m.ticket_id))];
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, status")
      .in("id", ticketIds);

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      return { messages: [], error: ticketsError.message };
    }

    const ticketsMap = new Map(
      (tickets || []).map((t) => [
        t.id,
        {
          ticket_number: t.ticket_number,
          subject: t.subject,
          status: t.status,
        },
      ])
    );

    // Get user emails using service role client
    const serviceSupabase = await createSupabaseServiceRole();
    const userIds = [...new Set(messages.map((m) => m.user_id))];
    const userEmailsMap = new Map<string, string | null>();

    for (const userId of userIds) {
      try {
        const {
          data: { user },
        } = await serviceSupabase.auth.admin.getUserById(userId);
        userEmailsMap.set(userId, user?.email || null);
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        userEmailsMap.set(userId, null);
      }
    }

    // Group messages by user_id
    const messagesByUser = new Map<string, typeof messages>();
    for (const message of messages) {
      const userId = message.user_id;
      if (!messagesByUser.has(userId)) {
        messagesByUser.set(userId, []);
      }
      messagesByUser.get(userId)!.push(message);
    }

    // Get the most recent message from each user and count total messages
    const groupedMessages: Array<{
      id: string;
      ticket_id: string;
      ticket_number: string;
      ticket_subject: string;
      ticket_status: string;
      content: string;
      user_id: string;
      user_email: string | null;
      created_at: string;
      message_count: number;
    }> = [];

    for (const [userId, userMessages] of messagesByUser.entries()) {
      // Sort by created_at descending to get most recent
      const sortedMessages = [...userMessages].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const mostRecentMessage = sortedMessages[0];
      const ticket = ticketsMap.get(mostRecentMessage.ticket_id);

      groupedMessages.push({
        id: mostRecentMessage.id,
        ticket_id: mostRecentMessage.ticket_id,
        ticket_number: ticket?.ticket_number || "Unknown",
        ticket_subject: ticket?.subject || "Unknown",
        ticket_status: ticket?.status || "unknown",
        content: mostRecentMessage.content,
        user_id: userId,
        user_email: userEmailsMap.get(userId) || null,
        created_at: mostRecentMessage.created_at,
        message_count: userMessages.length,
      });
    }

    // Sort grouped messages by most recent and limit
    groupedMessages.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { messages: groupedMessages.slice(0, limit) };
  } catch (error) {
    console.error("Error in getRecentSupportTicketMessagesAdmin:", error);
    return {
      messages: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch recent messages",
    };
  }
}

/**
 * Add a message to a support ticket (admin only)
 */
export async function addSupportTicketMessageAdmin(
  ticketId: string,
  content: string,
  isAdmin: boolean = true
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        content: content.trim(),
        is_admin: isAdmin,
      })
      .select("id")
      .single();

    if (messageError) {
      console.error("Error adding message:", messageError);
      return {
        success: false,
        error: messageError.message || "Failed to add message",
      };
    }

    // If this is an admin message, send email notification to the ticket owner
    if (isAdmin && message) {
      try {
        await sendSupportTicketEmailNotification(ticketId, message.id);
      } catch (emailError) {
        // Don't fail the message creation if email fails
        console.error(
          "Error sending support ticket email notification:",
          emailError
        );
      }
    }

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error("Error in addSupportTicketMessageAdmin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add message",
    };
  }
}

/**
 * Send email notification to ticket owner when admin sends a message
 */
async function sendSupportTicketEmailNotification(
  ticketId: string,
  messageId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const serviceSupabase = await createSupabaseServiceRole();

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_id, status")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Error fetching ticket for email:", ticketError);
      return;
    }

    // Get user email
    let userEmail: string | null = null;
    let userName: string | null = null;
    try {
      const {
        data: { user },
      } = await serviceSupabase.auth.admin.getUserById(ticket.user_id);
      userEmail = user?.email || null;

      // Get user name from profile
      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", ticket.user_id)
        .single();

      if (profile?.first_name || profile?.last_name) {
        userName =
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          null;
      }
    } catch (error) {
      console.error("Error fetching user for email:", error);
      return;
    }

    if (!userEmail) {
      console.error("No email found for ticket owner");
      return;
    }

    // Get all messages for the ticket
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        `
        id,
        content,
        is_admin,
        created_at,
        user_id
      `
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages for email:", messagesError);
      return;
    }

    // Get attachments for all messages
    const messageIds = messages?.map((m) => m.id) || [];
    const { data: attachments, error: attachmentsError } = await supabase
      .from("support_attachments")
      .select("*")
      .in("message_id", messageIds);

    if (attachmentsError) {
      console.error("Error fetching attachments for email:", attachmentsError);
    } else {
      console.log(
        `[Email] Fetched ${attachments?.length || 0} attachments for ${
          messageIds.length
        } messages`
      );
      if (attachments && attachments.length > 0) {
        attachments.forEach((att) => {
          console.log(
            `[Email] Attachment: ${att.file_name}, type: ${att.attachment_type}, storage_path: ${att.storage_path}`
          );
        });
      }
    }

    // Get user emails for all messages
    const userIds = [...new Set(messages?.map((m) => m.user_id) || [])];
    const userEmailsMap = new Map<string, string | null>();

    for (const userId of userIds) {
      try {
        const {
          data: { user },
        } = await serviceSupabase.auth.admin.getUserById(userId);
        userEmailsMap.set(userId, user?.email || null);
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        userEmailsMap.set(userId, null);
      }
    }

    // Helper function to download and convert image to base64
    const getImageBase64 = async (
      storagePath: string,
      fileType: string
    ): Promise<string | null> => {
      try {
        const bucketName = "support-attachments";

        // Remove bucket prefix if present in storage_path
        let downloadPath = storagePath;
        if (storagePath.startsWith("support-attachments/")) {
          downloadPath = storagePath.replace("support-attachments/", "");
        }

        console.log(`[Email] Downloading image from path: ${downloadPath}`);

        const { data, error } = await serviceSupabase.storage
          .from(bucketName)
          .download(downloadPath);

        if (error || !data) {
          console.error(`Error downloading image ${downloadPath}:`, error);
          return null;
        }

        const arrayBuffer = await data.arrayBuffer();
        // Convert ArrayBuffer to base64 using Buffer (available in Node.js)
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        const contentType = fileType || "image/png";
        const dataUri = `data:${contentType};base64,${base64}`;

        console.log(
          `[Email] Successfully converted image to base64 (${base64.length} chars)`
        );
        return dataUri;
      } catch (error) {
        console.error(
          `Error converting image to base64 ${storagePath}:`,
          error
        );
        return null;
      }
    };

    // Build message chain HTML with embedded images
    const messageChainHtml = await Promise.all(
      (messages || []).map(async (msg, index) => {
        const senderEmail = userEmailsMap.get(msg.user_id) || "Unknown";
        const isAdmin = msg.is_admin;
        const senderName = isAdmin ? "Support Team" : userName || senderEmail;
        const messageDate = new Date(msg.created_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        // Get attachments for this message
        const messageAttachments = (attachments || []).filter(
          (att) => att.message_id === msg.id
        );

        // Build image HTML for embedded images
        let imagesHtml = "";
        for (const att of messageAttachments) {
          if (att.attachment_type === "image" && att.storage_path) {
            console.log(
              `[Email] Processing image attachment: ${att.file_name}, storage_path: ${att.storage_path}`
            );
            const base64Image = await getImageBase64(
              att.storage_path,
              att.file_type || "image/png"
            );
            if (base64Image) {
              imagesHtml += `
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <img src="${base64Image}" alt="${att.file_name}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; display: block;" />
                </div>
              `;
              console.log(
                `[Email] Successfully embedded image: ${att.file_name}`
              );
            } else {
              console.error(`[Email] Failed to embed image: ${att.file_name}`);
            }
          }
        }

        return `
          <div style="margin-bottom: 20px; padding: 15px; background-color: ${
            isAdmin ? "#f0f7ff" : "#f9f9f9"
          }; border-left: 3px solid ${
          isAdmin ? "#4a90e2" : "#ccc"
        }; border-radius: 4px;">
            <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
              ${senderName} ${
          isAdmin
            ? '<span style="color: #4a90e2; font-size: 0.85em;">(Support)</span>'
            : ""
        }
            </div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 10px;">
              ${messageDate}
            </div>
            <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">
              ${msg.content.replace(/\n/g, "<br>")}
            </div>
            ${imagesHtml}
          </div>
        `;
      })
    );

    const messageChainHtmlString = messageChainHtml.join("");

    // Generate ticket view URL - always use production URL for emails
    const baseUrl = "https://www.cymasphere.com";
    const ticketUrl = `${baseUrl}/dashboard/support?ticket=${ticketId}`;

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Response to Your Support Ticket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%); padding: 30px 24px; text-align: center;">
                            <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/logos//cymasphere-logo.png" alt="Cymasphere" style="max-width: 220px; height: auto; display: block; margin: 0 auto;" />
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 24px;">
                            <h1 style="font-size: 1.5rem; color: #333; margin: 0 0 20px 0; font-weight: 600;">
                                New Response to Your Support Ticket
                            </h1>
                            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName || "there"},
                            </p>
                            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                                You have received a new response to your support ticket <strong>${
                                  ticket.ticket_number
                                }</strong>: "${ticket.subject}".
                            </p>
                            
                            <!-- Message Chain -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                <h2 style="font-size: 1.1rem; color: #333; margin: 0 0 20px 0; font-weight: 600;">
                                    Conversation History
                                </h2>
                                ${messageChainHtmlString}
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 1rem;">
                                    View & Respond to Ticket
                                </a>
                            </div>
                            
                            <p style="color: #666; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.9em;">
                                You can also copy and paste this link into your browser:<br>
                                <a href="${ticketUrl}" style="color: #6c63ff; word-break: break-all;">${ticketUrl}</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 24px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; font-size: 0.85em; color: #666;">
                            <p style="margin: 0 0 10px 0;">
                                This is an automated notification from Cymasphere Support.
                            </p>
                            <p style="margin: 0;">
                                <a href="${baseUrl}" style="color: #6c63ff; text-decoration: none;">Visit our website</a> | 
                                <a href="${baseUrl}/dashboard/support" style="color: #6c63ff; text-decoration: none;">View all tickets</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    // Create plain text version
    const emailText = `
New Response to Your Support Ticket

Hi ${userName || "there"},

You have received a new response to your support ticket ${
      ticket.ticket_number
    }: "${ticket.subject}".

Conversation History:
${
  messages
    ?.map((msg, index) => {
      const senderEmail = userEmailsMap.get(msg.user_id) || "Unknown";
      const isAdmin = msg.is_admin;
      const senderName = isAdmin ? "Support Team" : userName || senderEmail;
      const messageDate = new Date(msg.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `\n${senderName}${isAdmin ? " (Support)" : ""} - ${messageDate}\n${
        msg.content
      }\n`;
    })
    .join("\n---\n") || ""
}

View and respond to your ticket:
${ticketUrl}

This is an automated notification from Cymasphere Support.
    `;

    // Send email
    const emailResult = await sendEmail({
      to: userEmail,
      subject: `New Response: ${ticket.ticket_number} - ${ticket.subject}`,
      html: emailHtml,
      text: emailText,
      from: "Cymasphere Support <support@cymasphere.com>",
      replyTo: "support@cymasphere.com",
    });

    if (emailResult.success) {
      console.log(
        `✅ Support ticket email notification sent to ${userEmail} for ticket ${ticket.ticket_number}`
      );
    } else {
      console.error(
        `❌ Failed to send support ticket email notification: ${emailResult.error}`
      );
    }
  } catch (error) {
    console.error("Error in sendSupportTicketEmailNotification:", error);
    // Don't throw - email failure shouldn't break message creation
  }
}

/**
 * Send email notification to admin when user sends a message
 */
async function sendSupportTicketEmailNotificationToAdmin(
  ticketId: string,
  messageId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const serviceSupabase = await createSupabaseServiceRole();

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_id, status")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Error fetching ticket for email:", ticketError);
      return;
    }

    // Get user email and name
    let userEmail: string | null = null;
    let userName: string | null = null;
    try {
      const {
        data: { user },
      } = await serviceSupabase.auth.admin.getUserById(ticket.user_id);
      userEmail = user?.email || null;

      // Get user name from profile
      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", ticket.user_id)
        .single();

      if (profile?.first_name || profile?.last_name) {
        userName =
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          null;
      }
    } catch (error) {
      console.error("Error fetching user for email:", error);
      return;
    }

    if (!userEmail) {
      console.error("No email found for ticket owner");
      return;
    }

    // Get all messages for the ticket
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        `
        id,
        content,
        is_admin,
        created_at,
        user_id
      `
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages for email:", messagesError);
      return;
    }

    // Get attachments for all messages
    const messageIds = messages?.map((m) => m.id) || [];
    const { data: attachments, error: attachmentsError } = await supabase
      .from("support_attachments")
      .select("*")
      .in("message_id", messageIds);

    if (attachmentsError) {
      console.error("Error fetching attachments for email:", attachmentsError);
    }

    // Get user emails for all messages
    const userIds = [...new Set(messages?.map((m) => m.user_id) || [])];
    const userEmailsMap = new Map<string, string | null>();

    for (const userId of userIds) {
      try {
        const {
          data: { user },
        } = await serviceSupabase.auth.admin.getUserById(userId);
        userEmailsMap.set(userId, user?.email || null);
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        userEmailsMap.set(userId, null);
      }
    }

    // Helper function to download and convert image to base64
    const getImageBase64 = async (
      storagePath: string,
      fileType: string
    ): Promise<string | null> => {
      try {
        const bucketName = "support-attachments";

        // Remove bucket prefix if present in storage_path
        let downloadPath = storagePath;
        if (storagePath.startsWith("support-attachments/")) {
          downloadPath = storagePath.replace("support-attachments/", "");
        }

        const { data, error } = await serviceSupabase.storage
          .from(bucketName)
          .download(downloadPath);

        if (error || !data) {
          console.error(`Error downloading image ${downloadPath}:`, error);
          return null;
        }

        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        const contentType = fileType || "image/png";
        const dataUri = `data:${contentType};base64,${base64}`;

        return dataUri;
      } catch (error) {
        console.error(
          `Error converting image to base64 ${storagePath}:`,
          error
        );
        return null;
      }
    };

    // Build message chain HTML with embedded images
    const messageChainHtml = await Promise.all(
      (messages || []).map(async (msg, index) => {
        const senderEmail = userEmailsMap.get(msg.user_id) || "Unknown";
        const isAdmin = msg.is_admin;
        const senderName = isAdmin ? "Support Team" : userName || senderEmail;
        const messageDate = new Date(msg.created_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        // Get attachments for this message
        const messageAttachments = (attachments || []).filter(
          (att) => att.message_id === msg.id
        );

        // Build image HTML for embedded images
        let imagesHtml = "";
        for (const att of messageAttachments) {
          if (att.attachment_type === "image" && att.storage_path) {
            const base64Image = await getImageBase64(
              att.storage_path,
              att.file_type || "image/png"
            );
            if (base64Image) {
              imagesHtml += `
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <img src="${base64Image}" alt="${att.file_name}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; display: block;" />
                </div>
              `;
            }
          }
        }

        return `
          <div style="margin-bottom: 20px; padding: 15px; background-color: ${
            isAdmin ? "#f0f7ff" : "#f9f9f9"
          }; border-left: 3px solid ${
          isAdmin ? "#4a90e2" : "#ccc"
        }; border-radius: 4px;">
            <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
              ${senderName} ${
          isAdmin
            ? '<span style="color: #4a90e2; font-size: 0.85em;">(Support)</span>'
            : ""
        }
            </div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 10px;">
              ${messageDate}
            </div>
            <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">
              ${msg.content.replace(/\n/g, "<br>")}
            </div>
            ${imagesHtml}
          </div>
        `;
      })
    );

    const messageChainHtmlString = messageChainHtml.join("");

    // Generate admin ticket view URL - opens ticket modal
    const baseUrl = "https://www.cymasphere.com";
    const ticketUrl = `${baseUrl}/admin/support-tickets?ticket=${ticketId}`;

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Response to Support Ticket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%); padding: 30px 24px; text-align: center;">
                            <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/logos//cymasphere-logo.png" alt="Cymasphere" style="max-width: 220px; height: auto; display: block; margin: 0 auto;" />
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 24px;">
                            <h1 style="font-size: 1.5rem; color: #333; margin: 0 0 20px 0; font-weight: 600;">
                                New Response to Support Ticket
                            </h1>
                            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                                A user has responded to support ticket <strong>${
                                  ticket.ticket_number
                                }</strong>: "${ticket.subject}".
                            </p>
                            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>User:</strong> ${
                                  userName || userEmail
                                }<br>
                                <strong>Email:</strong> ${userEmail}<br>
                                <strong>Status:</strong> ${ticket.status}
                            </p>
                            
                            <!-- Message Chain -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                <h2 style="font-size: 1.1rem; color: #333; margin: 0 0 20px 0; font-weight: 600;">
                                    Conversation History
                                </h2>
                                ${messageChainHtmlString}
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 1rem;">
                                    View & Respond to Ticket
                                </a>
                            </div>
                            
                            <p style="color: #666; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.9em;">
                                You can also copy and paste this link into your browser:<br>
                                <a href="${ticketUrl}" style="color: #6c63ff; word-break: break-all;">${ticketUrl}</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 24px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; font-size: 0.85em; color: #666;">
                            <p style="margin: 0 0 10px 0;">
                                This is an automated notification from Cymasphere Support.
                            </p>
                            <p style="margin: 0;">
                                <a href="${baseUrl}" style="color: #6c63ff; text-decoration: none;">Visit our website</a> | 
                                <a href="${baseUrl}/admin/support-tickets" style="color: #6c63ff; text-decoration: none;">View all tickets</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    // Create plain text version
    const emailText = `
New Response to Support Ticket

A user has responded to support ticket ${ticket.ticket_number}: "${
      ticket.subject
    }".

User: ${userName || userEmail}
Email: ${userEmail}
Status: ${ticket.status}

Conversation History:
${
  messages
    ?.map((msg, index) => {
      const senderEmail = userEmailsMap.get(msg.user_id) || "Unknown";
      const isAdmin = msg.is_admin;
      const senderName = isAdmin ? "Support Team" : userName || senderEmail;
      const messageDate = new Date(msg.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `\n${senderName}${isAdmin ? " (Support)" : ""} - ${messageDate}\n${
        msg.content
      }\n`;
    })
    .join("\n---\n") || ""
}

View and respond to the ticket:
${ticketUrl}

This is an automated notification from Cymasphere Support.
    `;

    // Send email to admin
    const emailResult = await sendEmail({
      to: "support@cymasphere.com",
      subject: `New User Response: ${ticket.ticket_number} - ${ticket.subject}`,
      html: emailHtml,
      text: emailText,
      from: "Cymasphere Support <support@cymasphere.com>",
      replyTo: userEmail,
    });

    if (emailResult.success) {
      console.log(
        `✅ Support ticket email notification sent to admin for ticket ${ticket.ticket_number}`
      );
    } else {
      console.error(
        `❌ Failed to send support ticket email notification to admin: ${emailResult.error}`
      );
    }
  } catch (error) {
    console.error("Error in sendSupportTicketEmailNotificationToAdmin:", error);
    // Don't throw - email failure shouldn't break message creation
  }
}

/**
 * Delete a support ticket message (admin only)
 */
export async function deleteSupportTicketMessageAdmin(
  messageId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    // Delete the message (cascade will delete attachments)
    const { error: deleteError } = await supabase
      .from("support_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return {
        success: false,
        error: deleteError.message || "Failed to delete message",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteSupportTicketMessageAdmin:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete message",
    };
  }
}

// ==================== CUSTOMER-FACING SUPPORT TICKET FUNCTIONS ====================

/**
 * Get all support tickets for the current user
 */
export async function getUserSupportTickets(): Promise<{
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    description: string | null;
    status: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    closed_at: string | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { tickets: [], error: "Not authenticated" };
    }

    // Get tickets for this user
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select(
        `
        id,
        ticket_number,
        subject,
        description,
        status,
        user_id,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ticketsError) {
      console.error("Error fetching support tickets:", ticketsError);
      return { tickets: [], error: ticketsError.message };
    }

    return { tickets: tickets || [] };
  } catch (error) {
    console.error("Error in getUserSupportTickets:", error);
    return {
      tickets: [],
      error: error instanceof Error ? error.message : "Failed to fetch tickets",
    };
  }
}

/**
 * Get a single support ticket with messages and attachments (user's own tickets only)
 */
export async function getUserSupportTicket(ticketId: string): Promise<{
  ticket: {
    id: string;
    ticket_number: string;
    subject: string;
    description: string | null;
    status: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    closed_at: string | null;
    messages: Array<{
      id: string;
      content: string;
      is_admin: boolean;
      user_id: string;
      user_email: string | null;
      created_at: string;
      updated_at: string;
      edited_at: string | null;
      attachments: Array<{
        id: string;
        file_name: string;
        file_size: number;
        file_type: string;
        attachment_type: string;
        url: string | null;
        created_at: string;
      }>;
    }>;
  } | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ticket: null, error: "Not authenticated" };
    }

    // Get ticket (RLS will ensure user can only see their own tickets)
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .single();

    if (ticketError || !ticket) {
      return {
        ticket: null,
        error: ticketError?.message || "Ticket not found",
      };
    }

    // Get messages with attachments
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        `
        id,
        content,
        is_admin,
        user_id,
        created_at,
        updated_at,
        edited_at
      `
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
    }

    // Get attachments for all messages
    const messageIds = messages?.map((m) => m.id) || [];
    const { data: attachments, error: attachmentsError } = await supabase
      .from("support_attachments")
      .select("*")
      .in("message_id", messageIds);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }

    // Get user emails for messages using service role client
    const serviceSupabase = await createSupabaseServiceRole();
    const messageUserIds = [...new Set(messages?.map((m) => m.user_id) || [])];
    const messageUserEmailsMap = new Map<string, string | null>();

    for (const userId of messageUserIds) {
      try {
        const {
          data: { user },
        } = await serviceSupabase.auth.admin.getUserById(userId);
        messageUserEmailsMap.set(userId, user?.email || null);
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        messageUserEmailsMap.set(userId, null);
      }
    }

    // Generate signed URLs for attachments that don't have valid URLs
    const bucketName = "support-attachments";
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (att) => {
        let url = att.url;
        // If no URL or URL looks invalid, generate a signed URL
        if (!url || !url.includes("supabase.co")) {
          try {
            const { data: signedUrlData, error: signedUrlError } =
              await supabase.storage
                .from(bucketName)
                .createSignedUrl(att.storage_path, 31536000); // 1 year expiry

            if (!signedUrlError && signedUrlData) {
              url = signedUrlData.signedUrl;
            }
          } catch (error) {
            console.error(
              `Error generating signed URL for attachment ${att.id}:`,
              error
            );
          }
        }
        return { ...att, url };
      })
    );

    // Combine messages with attachments
    const messagesWithAttachments = (messages || []).map((message) => ({
      ...message,
      user_email: messageUserEmailsMap.get(message.user_id) || null,
      attachments: attachmentsWithUrls
        .filter((att) => att.message_id === message.id)
        .map((att) => ({
          id: att.id,
          file_name: att.file_name,
          file_size: att.file_size,
          file_type: att.file_type,
          attachment_type: att.attachment_type,
          url: att.url,
          created_at: att.created_at,
        })),
    }));

    return {
      ticket: {
        ...ticket,
        messages: messagesWithAttachments,
      },
    };
  } catch (error) {
    console.error("Error in getUserSupportTicket:", error);
    return {
      ticket: null,
      error: error instanceof Error ? error.message : "Failed to fetch ticket",
    };
  }
}

/**
 * Create a support ticket (for current user)
 */
export async function createSupportTicket(data: {
  subject: string;
  description: string;
}): Promise<{
  success: boolean;
  ticket?: {
    id: string;
    ticket_number: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate required fields
    if (!data.subject || !data.description) {
      return {
        success: false,
        error: "All fields are required",
      };
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        subject: data.subject,
        description: data.description,
        user_id: user.id,
        status: "open",
      })
      .select("id, ticket_number")
      .single();

    if (ticketError) {
      if (ticketError.code === "42P01") {
        return {
          success: false,
          error:
            "Support tickets table does not exist. Please run the migration.",
        };
      }
      console.error("Error creating support ticket:", ticketError);
      return {
        success: false,
        error: ticketError.message || "Failed to create support ticket",
      };
    }

    // Create the initial message
    if (ticket) {
      const { error: messageError } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          content: data.description,
          is_admin: false, // User creates it
        });

      if (messageError) {
        console.error("Error creating initial message:", messageError);
        // Ticket was created but message failed - still return success
        // as the ticket exists
      }
    }

    return {
      success: true,
      ticket: ticket
        ? {
            id: ticket.id,
            ticket_number: ticket.ticket_number,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error in createSupportTicket:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create support ticket",
    };
  }
}

/**
 * Add a message to a support ticket (user's own tickets only)
 */
export async function addSupportTicketMessage(
  ticketId: string,
  content: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the ticket belongs to the user
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, user_id")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .single();

    if (ticketError || !ticket) {
      return { success: false, error: "Ticket not found or unauthorized" };
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        content: content.trim(),
        is_admin: false, // User messages are not admin
      })
      .select("id")
      .single();

    if (messageError) {
      console.error("Error adding message:", messageError);
      return {
        success: false,
        error: messageError.message || "Failed to add message",
      };
    }

    // If this is a user message (not admin), send email notification to admin
    if (message && !messageError) {
      try {
        await sendSupportTicketEmailNotificationToAdmin(ticketId, message.id);
      } catch (emailError) {
        // Don't fail the message creation if email fails
        console.error(
          "Error sending support ticket email notification to admin:",
          emailError
        );
      }
    }

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error("Error in addSupportTicketMessage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add message",
    };
  }
}

/**
 * Upload attachment for a support ticket message
 */
export async function uploadSupportTicketAttachment(
  ticketId: string,
  messageId: string,
  file: File
): Promise<{
  success: boolean;
  attachmentId?: string;
  error?: string;
}> {
  console.log("[Attachment Upload] === START ===");
  console.log("[Attachment Upload] Ticket ID:", ticketId);
  console.log("[Attachment Upload] Message ID:", messageId);
  console.log("[Attachment Upload] File name:", file.name);
  console.log("[Attachment Upload] File size:", file.size);
  console.log("[Attachment Upload] File type:", file.type);

  try {
    const supabase = await createClient();
    console.log("[Attachment Upload] Created Supabase client");

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("[Attachment Upload] User:", user?.id || "NOT AUTHENTICATED");
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the ticket belongs to the user (for customer) or user is admin
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return { success: false, error: "Ticket not found" };
    }

    // Check if user owns ticket or is admin
    const isAdmin = await checkAdmin(supabase);
    if (ticket.user_id !== user.id && !isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { success: false, error: "File too large. Maximum size is 10MB" };
    }

    // Determine attachment type
    let attachmentType: "image" | "video" | "document" | "audio" | "other" =
      "other";
    if (file.type.startsWith("image/")) {
      attachmentType = "image";
    } else if (file.type.startsWith("video/")) {
      attachmentType = "video";
    } else if (file.type.startsWith("audio/")) {
      attachmentType = "audio";
    } else if (
      file.type.includes("pdf") ||
      file.type.includes("document") ||
      file.type.includes("text") ||
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".doc") ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".txt")
    ) {
      attachmentType = "document";
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "bin";
    const fileName = `support-${ticketId}-${messageId}-${timestamp}-${randomString}.${fileExtension}`;
    const storagePath = `support-attachments/${fileName}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(fileBuffer);

    // Upload to Supabase storage (ensure bucket exists)
    const bucketName = "support-attachments";
    console.log(
      "[Attachment Upload] Starting storage upload to bucket:",
      bucketName
    );
    console.log("[Attachment Upload] Storage path:", storagePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Attachment Upload] Storage upload error:", uploadError);
      console.error("[Attachment Upload] Error code:", uploadError.statusCode);
      console.error("[Attachment Upload] Error message:", uploadError.message);

      // If bucket doesn't exist, try to create it
      if (uploadError.message.includes("Bucket not found")) {
        console.log(
          "[Attachment Upload] Bucket not found, attempting to create..."
        );
        const { error: createError } = await supabase.storage.createBucket(
          bucketName,
          {
            public: false,
            fileSizeLimit: `${maxSize}`,
          }
        );
        if (createError) {
          console.error(
            "[Attachment Upload] Error creating bucket:",
            createError
          );
          return { success: false, error: "Failed to create storage bucket" };
        }
        console.log("[Attachment Upload] Bucket created, retrying upload...");
        // Retry upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, buffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          });
        if (retryError) {
          console.error("[Attachment Upload] Retry upload error:", retryError);
          return {
            success: false,
            error: retryError.message || "Failed to upload file",
          };
        }
        console.log("[Attachment Upload] Retry upload successful");
      } else {
        console.error(
          "[Attachment Upload] Storage upload failed (not bucket issue):",
          uploadError
        );
        return {
          success: false,
          error: uploadError.message || "Failed to upload file",
        };
      }
    } else {
      console.log("[Attachment Upload] Storage upload successful");
    }

    // Generate signed URL for private bucket (valid for 1 year)
    let signedUrl: string | null = null;
    try {
      console.log("[Attachment Upload] Generating signed URL...");
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from(bucketName)
          .createSignedUrl(storagePath, 31536000); // 1 year expiry

      if (!signedUrlError && signedUrlData) {
        signedUrl = signedUrlData.signedUrl;
        console.log("[Attachment Upload] Signed URL generated successfully");
      } else {
        console.error(
          "[Attachment Upload] Error generating signed URL:",
          signedUrlError
        );
        // Fallback: try public URL (won't work for private bucket, but won't break)
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
        signedUrl = urlData?.publicUrl || null;
      }
    } catch (urlError) {
      console.error("[Attachment Upload] Error generating URL:", urlError);
      // Fallback: try public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);
      signedUrl = urlData?.publicUrl || null;
    }

    // Create attachment record using service role client
    // We've already validated all permissions above (user owns ticket or is admin)
    // The service role client bypasses RLS, which is safe since we've verified permissions

    // Create attachment record
    // Try with regular client first (uses RLS policy with function)
    // If that fails with RLS error, fall back to service role client
    let attachment;
    let attachmentError;

    console.log(
      "[Attachment Upload] Attempting insert with regular client first"
    );
    const { data: attachmentData, error: attachmentErrorData } = await supabase
      .from("support_attachments")
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        attachment_type: attachmentType,
        storage_path: storagePath,
        url: signedUrl,
      })
      .select("id")
      .single();

    attachment = attachmentData;
    attachmentError = attachmentErrorData;

    // If RLS blocks it, try with service role client
    if (
      attachmentError &&
      (attachmentError.message?.includes("row-level security") ||
        attachmentError.code === "42501")
    ) {
      console.log(
        "[Attachment Upload] RLS blocked insert, trying with service role client..."
      );

      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error(
          "[Attachment Upload] SUPABASE_SERVICE_ROLE_KEY is not set! Cannot use service role fallback."
        );
        await supabase.storage.from(bucketName).remove([storagePath]);
        return {
          success: false,
          error: "Server configuration error: Service role key not available",
        };
      }

      try {
        const serviceSupabase = await createSupabaseServiceRole();

        if (!serviceSupabase) {
          throw new Error("Failed to create service role client");
        }

        console.log("[Attachment Upload] Using service role client");
        const { data: serviceAttachment, error: serviceError } =
          await serviceSupabase
            .from("support_attachments")
            .insert({
              message_id: messageId,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              attachment_type: attachmentType,
              storage_path: storagePath,
              url: publicUrl,
            })
            .select("id")
            .single();

        attachment = serviceAttachment;
        attachmentError = serviceError;

        if (attachmentError) {
          console.error(
            "[Attachment Upload] Service role client also failed:",
            attachmentError
          );
        }
      } catch (serviceErr) {
        console.error(
          "[Attachment Upload] Service role client error:",
          serviceErr
        );
        attachmentError = serviceErr as any;
      }
    }

    if (attachmentError) {
      console.error("[Attachment Upload] Final error:", attachmentError);
      // Try to delete uploaded file
      await supabase.storage.from(bucketName).remove([storagePath]);
      return {
        success: false,
        error: attachmentError.message || "Failed to create attachment record",
      };
    }

    return { success: true, attachmentId: attachment!.id };
  } catch (error) {
    console.error("[Attachment Upload] Unexpected error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upload attachment",
    };
  }
}

/**
 * Get Stripe payment intents (purchases) for a customer with admin check (admin only)
 */
export async function getCustomerPurchasesAdmin(customerId: string): Promise<{
  purchases: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    description: string;
    metadata?: Record<string, string>;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { purchases: [], error: "Unauthorized" };
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
      expand: ["data.invoice"],
    });

    // Get all invoices to check which payment intents are linked to subscriptions
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    // Create a map of payment intent IDs to their invoices
    const piToInvoiceMap = new Map<string, Stripe.Invoice>();
    invoices.data.forEach((inv) => {
      if (inv.payment_intent && typeof inv.payment_intent === "string") {
        piToInvoiceMap.set(inv.payment_intent, inv);
      }
    });

    const purchases = paymentIntents.data.map((pi) => {
      // Determine description from metadata, invoice, or amount
      let description = "One-time purchase";

      // Check if this is a lifetime purchase
      if (pi.metadata?.purchase_type === "lifetime") {
        description = "Lifetime Access Purchase";
      }
      // Check if this payment intent is linked to an invoice (subscription payment)
      else if (piToInvoiceMap.has(pi.id)) {
        const invoice = piToInvoiceMap.get(pi.id)!;
        if (invoice.subscription) {
          // It's a subscription payment
          description = "Subscription payment";
        } else {
          description = "One-time purchase";
        }
      }
      // Check if payment intent has invoice in expanded data
      else if (
        pi.invoice &&
        typeof pi.invoice === "object" &&
        "subscription" in pi.invoice
      ) {
        description = "Subscription payment";
      } else if (pi.amount === 0) {
        description = "Free purchase";
      }

      return {
        id: pi.id,
        amount: pi.amount / 100, // Convert cents to dollars
        status: pi.status,
        createdAt: new Date(pi.created * 1000).toISOString(),
        description,
        metadata: pi.metadata || {},
      };
    });

    return { purchases };
  } catch (error) {
    console.error("Error in getCustomerPurchasesAdmin:", error);
    return {
      purchases: [],
      error:
        error instanceof Error ? error.message : "Failed to fetch purchases",
    };
  }
}

/**
 * Get Stripe invoices for a customer with admin check (admin only)
 */
export async function getCustomerInvoicesAdmin(customerId: string): Promise<{
  invoices: Array<{
    id: string;
    number: string | null;
    amount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    dueDate: string | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { invoices: [], error: "Unauthorized" };
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    const formattedInvoices = invoices.data.map((inv) => {
      return {
        id: inv.id,
        number: inv.number,
        amount: inv.amount_paid / 100, // Convert cents to dollars
        status: inv.status || "unknown",
        createdAt: new Date(inv.created * 1000).toISOString(),
        paidAt:
          inv.status === "paid" && inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : null,
        dueDate: inv.due_date
          ? new Date(inv.due_date * 1000).toISOString()
          : null,
      };
    });

    return { invoices: formattedInvoices };
  } catch (error) {
    console.error("Error in getCustomerInvoicesAdmin:", error);
    return {
      invoices: [],
      error:
        error instanceof Error ? error.message : "Failed to fetch invoices",
    };
  }
}

/**
 * Get support ticket counts for multiple users with admin check (admin only)
 * Returns a map of userId -> ticket count info (open, closed, total)
 */
export async function getUserSupportTicketCountsAdmin(
  userIds: string[]
): Promise<{
  counts: Record<string, { open: number; closed: number; total: number }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    if (!(await checkAdmin(supabase))) {
      return { counts: {}, error: "Unauthorized" };
    }

    if (userIds.length === 0) {
      return { counts: {} };
    }

    // Use service role to bypass RLS for admin queries
    const serviceSupabase = await createSupabaseServiceRole();

    const { data: tickets, error: ticketsError } = await serviceSupabase
      .from("support_tickets")
      .select("user_id, status")
      .in("user_id", userIds);

    if (ticketsError) {
      // If table doesn't exist (42P01), return empty counts silently
      // This allows the UI to work even if the migration hasn't been run yet
      if (ticketsError.code === "42P01") {
        const counts: Record<
          string,
          { open: number; closed: number; total: number }
        > = {};
        userIds.forEach((userId) => {
          counts[userId] = { open: 0, closed: 0, total: 0 };
        });
        return { counts };
      }
      console.error("Error fetching support ticket counts:", ticketsError);
      return {
        counts: {},
        error: ticketsError.message || "Failed to fetch support ticket counts",
      };
    }

    // Count tickets per user by status
    const counts: Record<
      string,
      { open: number; closed: number; total: number }
    > = {};
    userIds.forEach((userId) => {
      counts[userId] = { open: 0, closed: 0, total: 0 };
    });

    if (tickets) {
      tickets.forEach((ticket) => {
        const userId = ticket.user_id;
        if (userId && counts[userId] !== undefined) {
          counts[userId].total += 1;

          // Open tickets: 'open' or 'in_progress'
          if (ticket.status === "open" || ticket.status === "in_progress") {
            counts[userId].open += 1;
          }
          // Closed tickets: 'resolved' or 'closed'
          else if (ticket.status === "resolved" || ticket.status === "closed") {
            counts[userId].closed += 1;
          }
        }
      });
    }

    return { counts };
  } catch (error) {
    console.error("Error in getUserSupportTicketCountsAdmin:", error);
    return {
      counts: {},
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch support ticket counts",
    };
  }
}
