/**
 * @fileoverview Ensures a subscribers row exists after signup (service role).
 * Auth signUp often has no session yet (email confirm), so anon RLS inserts fail.
 * A DB trigger may already create a bare row; this upserts attribution/metadata.
 * @module utils/email-campaigns/ensure-subscriber-for-user
 */

import "server-only";

import type { Json } from "@/database.types";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

export type EnsureSubscriberInput = {
  userId: string;
  email: string;
  source: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * @brief Upserts a subscriber by email with signup tags/metadata (service role).
 * @returns null on success, or an error message string
 */
export async function ensureSubscriberForUser(
  input: EnsureSubscriberInput,
): Promise<string | null> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.userId) {
    return "Missing email or userId";
  }

  const admin = await createSupabaseServiceRole();
  const tags = input.tags ?? ["free-user"];
  const metadata = (input.metadata ?? {}) as Json;
  // Prefer the original casing from auth for storage; match case-insensitively.
  const emailForStorage = input.email.trim();

  const { data: existing, error: selectError } = await admin
    .from("subscribers")
    .select("id, metadata, tags, user_id, status")
    .ilike("email", email)
    .maybeSingle();

  if (selectError) {
    return selectError.message;
  }

  if (existing) {
    // If this subscriber is already bound to a DIFFERENT user, refuse to
    // rebind it (prevents a duplicate-signup from hijacking another account's
    // marketing record).
    const existingUserId = (existing as { user_id?: string | null }).user_id ?? null;
    if (existingUserId && existingUserId !== input.userId) {
      return "Subscriber already linked to a different user";
    }

    const prevMeta =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const mergedTags = Array.from(
      new Set([...(existing.tags ?? []), ...tags]),
    );

    // Do NOT silently reactivate someone who previously unsubscribed / bounced /
    // complained — that would violate their consent (CAN-SPAM). Preserve status.
    const existingStatus = (existing as { status?: string | null }).status ?? null;
    const preserveStatus =
      existingStatus === "unsubscribed" ||
      existingStatus === "bounced" ||
      existingStatus === "complained";

    const updatePayload: Record<string, unknown> = {
      source: input.source,
      tags: mergedTags,
      metadata: { ...prevMeta, ...input.metadata } as Json,
      updated_at: new Date().toISOString(),
    };
    // Only fill user_id when it is currently null.
    if (!existingUserId) {
      updatePayload.user_id = input.userId;
    }
    if (!preserveStatus) {
      updatePayload.status = "active";
    }

    const { error: updateError } = await admin
      .from("subscribers")
      .update(updatePayload)
      .eq("id", existing.id);

    return updateError?.message ?? null;
  }

  const { error: insertError } = await admin.from("subscribers").insert({
    id: input.userId,
    user_id: input.userId,
    email: emailForStorage,
    source: input.source,
    status: "active",
    tags,
    metadata,
  });

  return insertError?.message ?? null;
}
