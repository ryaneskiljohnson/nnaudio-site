/**
 * @fileoverview Ops: queue (and optionally send) post-purchase review invite emails for recent orders.
 * @module scripts/backfill-review-followups
 *
 * **Promo code behavior:** The invite says you can get $10 off; the **unique Stripe promotion code**
 * is created in `issueReviewReward()` only **after** the customer submits an eligible review — not in this step.
 *
 * Usage (repo root, `.env.local` with Stripe + Supabase service role):
 *
 * Dry-run (test inbox only):
 *   bun --env-file=.env.local run scripts/backfill-review-followups.ts --days=30 --test-email=support@newnationllc.com --dry-run
 *
 * Queue + send invites now (test inbox only):
 *   bun --env-file=.env.local run scripts/backfill-review-followups.ts --days=30 --test-email=support@newnationllc.com --send-now
 *
 * Full audience (all-time cart PIs + grants, drain send queue in batches):
 *   bun --env-file=.env.local run scripts/backfill-review-followups.ts --days=0 --send-now
 *
 * Last N days only:
 *   bun --env-file=.env.local run scripts/backfill-review-followups.ts --days=90 --send-now
 *
 * **Duplicate orders:** `sendDueReviewFollowups` sends at most **one** review invite per user; extra
 * `review_followups` rows from additional purchases are marked `skipped-duplicate-user-invite` (no email).
 */

import type Stripe from "stripe";
import { createSupabaseServiceRole } from "../utils/supabase/service";
import { stripe } from "../utils/stripe/client";
import {
  queueReviewFollowupForPaymentIntent,
  queueReviewFollowupForProductGrants,
  sendDueReviewFollowups,
} from "../utils/reviews/review-system";

function parseArgs(argv: string[]): {
  days: number;
  testEmail: string | null;
  dryRun: boolean;
  sendNow: boolean;
} {
  let days = 30;
  let testEmail: string | null = null;
  let dryRun = false;
  let sendNow = false;
  for (const a of argv) {
    if (a.startsWith("--days=")) {
      const n = parseInt(a.slice("--days=".length), 10);
      days = Number.isFinite(n) && n >= 0 ? n : 30;
    } else if (a.startsWith("--test-email=")) {
      testEmail = a.slice("--test-email=".length).trim().toLowerCase() || null;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--send-now") {
      sendNow = true;
    }
  }
  return { days, testEmail, dryRun, sendNow };
}

const SEND_AT_IMMEDIATE = () => new Date(Date.now() - 120_000);

async function listRecentPaymentIntents(
  createdGte: number
): Promise<Stripe.PaymentIntent[]> {
  const out: Stripe.PaymentIntent[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: createdGte },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    out.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return out;
}

/** Max drain iterations (--send-now); each step processes up to `SEND_BATCH` followups. */
const MAX_SEND_DRAIN_ITERATIONS = 500;
const SEND_BATCH = 500;

async function main(): Promise<void> {
  const { days, testEmail, dryRun, sendNow } = parseArgs(process.argv.slice(2));
  const createdGte =
    days === 0
      ? 0
      : Math.floor((Date.now() - days * 86400000) / 1000);
  const sendAt = sendNow ? SEND_AT_IMMEDIATE() : undefined;

  console.log(
    JSON.stringify({
      days,
      testEmail,
      dryRun,
      sendNow,
      createdGte,
    })
  );

  let profileId: string | null = null;
  if (testEmail) {
    const supabase = await createSupabaseServiceRole();
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id, email")
      .ilike("email", testEmail)
      .maybeSingle();
    if (!profile?.id) {
      console.error("No profile found for --test-email:", testEmail);
      process.exit(1);
    }
    profileId = profile.id as string;
    console.log("Test profile:", profileId, profile.email);
  }

  const pis = (await listRecentPaymentIntents(createdGte)).filter(
    (pi) => pi.status === "succeeded" && pi.metadata?.cart_items
  );

  let queuedPi = 0;
  for (const pi of pis) {
    const uid = pi.metadata?.user_id;
    if (!uid || uid === "anonymous") continue;

    if (testEmail && uid !== profileId) continue;

    if (dryRun) {
      console.log("[dry-run] would queue PI", pi.id, "user", uid);
      queuedPi += 1;
      continue;
    }

    const full = await stripe.paymentIntents.retrieve(pi.id);
    const r = await queueReviewFollowupForPaymentIntent(full, {
      sendAt,
    });
    console.log("PI", pi.id, r);
    if (r.queued) queuedPi += 1;
  }

  /** product_grants in window → one synthetic follow-up per user */
  const supabase = await createSupabaseServiceRole();
  const sinceIso = new Date(createdGte * 1000).toISOString();
  let grantQuery = (supabase as any)
    .from("product_grants")
    .select("id, user_email, product_id, granted_at")
    .gte("granted_at", sinceIso);
  if (testEmail) {
    grantQuery = grantQuery.ilike("user_email", testEmail);
  }
  const { data: grants, error: grantErr } = await grantQuery;
  if (grantErr) {
    console.error("product_grants query error:", grantErr);
    process.exit(1);
  }

  const byUser = new Map<
    string,
    { email: string; productIds: Set<string>; earliest: number }
  >();
  for (const g of grants || []) {
    const email = String(g.user_email || "").trim().toLowerCase();
    if (!email) continue;
    const { data: prof } = await (supabase as any)
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (!prof?.id) continue;
    const uid = prof.id as string;
    const pid = g.product_id as string;
    const t = new Date(g.granted_at).getTime();
    let entry = byUser.get(uid);
    if (!entry) {
      entry = {
        email,
        productIds: new Set(),
        earliest: t,
      };
      byUser.set(uid, entry);
    }
    entry.productIds.add(pid);
    entry.earliest = Math.min(entry.earliest, t);
  }

  let queuedGrants = 0;
  for (const [userId, { email, productIds, earliest }] of byUser) {
    const syntheticId = `grant_backfill_${userId}`;
    if (dryRun) {
      console.log(
        "[dry-run] would queue grant bundle",
        syntheticId,
        "products",
        [...productIds].length
      );
      queuedGrants += 1;
      continue;
    }
    const grantSendAt =
      sendAt ??
      new Date(earliest + 7 * 86400000);
    const r = await queueReviewFollowupForProductGrants({
      userId,
      customerEmail: email,
      productIds: [...productIds],
      purchaseDate: new Date(earliest),
      syntheticPaymentIntentId: syntheticId,
      sendAt: grantSendAt,
    });
    console.log("GRANT", syntheticId, r);
    if (r.queued) queuedGrants += 1;
  }

  if (!dryRun && sendNow) {
    let totalProcessed = 0;
    let hitDrainCap = false;
    for (let i = 0; i < MAX_SEND_DRAIN_ITERATIONS; i++) {
      const processed = await sendDueReviewFollowups(SEND_BATCH);
      totalProcessed += processed;
      console.log(
        `sendDueReviewFollowups batch ${i + 1}: ${processed} processed (running total ${totalProcessed})`
      );
      if (processed === 0) break;
      if (i === MAX_SEND_DRAIN_ITERATIONS - 1) {
        hitDrainCap = true;
      }
    }
    if (hitDrainCap) {
      console.warn(
        "[backfill] Stopped after max drain iterations; re-run: bun ... --days=0 --send-now (queue step is idempotent) to send any remaining invites."
      );
    }
  }

  console.log(
    "Summary:",
    "payment_intents_considered=",
    pis.length,
    "pi_queued=",
    queuedPi,
    "grant_users=",
    byUser.size,
    "grant_bundles_queued=",
    queuedGrants
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
