/**
 * @fileoverview Ops: create review row if needed and run issueReviewReward (real Stripe code + email).
 * @module scripts/issue-review-reward-for-user
 *
 * Usage:
 *   bun --env-file=.env.local run scripts/issue-review-reward-for-user.ts --email=support@newnationllc.com
 */

import { randomUUID } from "crypto";
import { createSupabaseServiceRole } from "../utils/supabase/service";
import { issueReviewReward } from "../utils/reviews/review-system";

function parseEmail(argv: string[]): string | null {
  const a = argv.find((x) => x.startsWith("--email="));
  return a ? a.slice("--email=".length).trim().toLowerCase() : null;
}

async function main(): Promise<void> {
  const email = parseEmail(process.argv.slice(2));
  if (!email) {
    console.error("Usage: --email=user@example.com");
    process.exit(1);
  }

  const admin = await createSupabaseServiceRole();
  const { data: profile, error: pe } = await (admin as any)
    .from("profiles")
    .select("id, email, first_name, last_name, full_name")
    .ilike("email", email)
    .maybeSingle();

  if (pe || !profile?.id) {
    console.error("Profile not found:", email, pe?.message);
    process.exit(1);
  }

  const userId = profile.id as string;
  const customerName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    profile.full_name?.trim() ||
    email.split("@")[0];

  const { data: followups } = await (admin as any)
    .from("review_followups")
    .select("id, purchase_date, purchased_product_ids, reward_claimed_at")
    .eq("user_id", userId)
    .eq("is_refunded", false)
    .is("reward_claimed_at", null)
    .order("purchase_date", { ascending: true });

  const rows = (followups || []) as Array<{
    id: string;
    purchased_product_ids: string[];
  }>;
  if (rows.length === 0) {
    console.error("No unclaimed review_followups for this user.");
    process.exit(1);
  }

  const first = rows[0];
  const productId = first.purchased_product_ids[0];
  if (!productId) {
    console.error("Follow-up has no products.");
    process.exit(1);
  }

  const { data: existing } = await (admin as any)
    .from("product_reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  let reviewId: string;
  const now = new Date().toISOString();
  if (existing?.id) {
    reviewId = existing.id as string;
    console.log("Using existing review", reviewId);
  } else {
    reviewId = randomUUID();
    const { error: insErr } = await (admin as any).from("product_reviews").insert({
      id: reviewId,
      product_id: productId,
      created_at: now,
      rating: 5,
      review_text:
        "Automated ops seed for reward email — you may delete or replace this review in admin.",
      title: null,
      customer_name: customerName,
      customer_email: profile.email,
      user_id: userId,
      is_verified_purchase: true,
      is_approved: false,
      moderation_status: "pending",
      rejection_reason: null,
      moderated_at: null,
      moderated_by: null,
      submission_source: "script",
      stripe_payment_intent_id: null,
      updated_at: now,
    });
    if (insErr) {
      console.error("Insert review failed:", insErr);
      process.exit(1);
    }
    console.log("Inserted review", reviewId, "for product", productId);
  }

  const result = await issueReviewReward({
    reviewId,
    userId,
    productId,
    customerEmail: profile.email as string,
    customerName,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.granted) {
    console.error("issueReviewReward did not grant (no eligible follow-up or already claimed).");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
