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
    .select("id, metadata, tags")
    .ilike("email", email)
    .maybeSingle();

  if (selectError) {
    return selectError.message;
  }

  if (existing) {
    const prevMeta =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const mergedTags = Array.from(
      new Set([...(existing.tags ?? []), ...tags]),
    );

    const { error: updateError } = await admin
      .from("subscribers")
      .update({
        user_id: input.userId,
        source: input.source,
        status: "active",
        tags: mergedTags,
        metadata: { ...prevMeta, ...input.metadata } as Json,
        updated_at: new Date().toISOString(),
      })
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
