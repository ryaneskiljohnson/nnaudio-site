/**
 * @fileoverview Backfills `user_id` on `product_grants` and `user_management` where the row
 * still has `user_id` null but `profiles.email` matches `user_email`.
 * For rows stuck under an old email after an address change, use the admin API
 * `POST /api/admin/relink-email-grants` with `old_email` and `target_user_id`.
 *
 * Usage:
 *   bun run scripts/backfill-email-changed-grants.ts           # dry-run (default)
 *   bun run scripts/backfill-email-changed-grants.ts --apply   # persist updates
 *
 * @module scripts/backfill-email-changed-grants
 */

import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { syncStripeCustomerEmailFromProfile } from "@/utils/stripe/sync-customer-email";

const APPLY = process.argv.includes("--apply");

/** Log every N rows while scanning large tables (also logs each match). */
const PROGRESS_EVERY = 100;

function nowMs(): number {
  return Date.now();
}

function iso(): string {
  return new Date().toISOString();
}

function log(msg: string): void {
  console.log(`[${iso()}] [backfill] ${msg}`);
}

async function main(): Promise<void> {
  const t0 = nowMs();
  log(
    `Starting (mode=${APPLY ? "APPLY — writes enabled" : "DRY-RUN — no writes"})`
  );

  log("Creating Supabase service-role client...");
  const tClient = nowMs();
  const supabase = await createSupabaseServiceRole();
  log(`Service-role client ready (+${nowMs() - tClient}ms, +${nowMs() - t0}ms total)`);

  const admin = supabase as any;

  log(
    "Querying product_grants where user_id IS NULL and user_email IS NOT NULL (may take a while on large tables)..."
  );
  const tQ1 = nowMs();
  const { data: orphanGrants, error: gErr } = await admin
    .from("product_grants")
    .select("id, user_email")
    .is("user_id", null)
    .not("user_email", "is", null);

  if (gErr) {
    console.error("product_grants select error:", gErr);
    process.exit(1);
  }

  const grantRows = orphanGrants ?? [];
  log(
    `product_grants: fetched ${grantRows.length} orphan row(s) (+${nowMs() - tQ1}ms query, +${nowMs() - t0}ms total)`
  );

  let grantUpdates = 0;
  let grantSkippedNoProfile = 0;
  const stripeSyncedUserIds = new Set<string>();

  if (grantRows.length > 0) {
    log(`Processing product_grants: scanning ${grantRows.length} row(s) for profile matches...`);
  }

  for (let i = 0; i < grantRows.length; i++) {
    const row = grantRows[i];
    const em = String(row.user_email).trim().toLowerCase();

    if (i > 0 && i % PROGRESS_EVERY === 0) {
      log(
        `product_grants: progress ${i}/${grantRows.length} (matched ${grantUpdates}, no profile ${grantSkippedNoProfile})...`
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", em)
      .maybeSingle();

    if (!profile?.id) {
      grantSkippedNoProfile += 1;
      continue;
    }

    grantUpdates += 1;
    log(
      `[product_grants] ${APPLY ? "APPLY" : "DRY-RUN"} [${grantUpdates}] id=${row.id} -> user_id=${profile.id} (${em})`
    );

    if (APPLY) {
      const { error: upErr } = await admin
        .from("product_grants")
        .update({
          user_id: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.error("update grant failed:", row.id, upErr);
      } else if (!stripeSyncedUserIds.has(profile.id)) {
        stripeSyncedUserIds.add(profile.id);
        log(
          `Syncing Stripe customer email for user_id=${profile.id} (first grant update for this user)...`
        );
        await syncStripeCustomerEmailFromProfile(supabase, profile.id, em);
        log(`Stripe sync finished for user_id=${profile.id}`);
      }
    }
  }

  log(
    `product_grants section done: ${grantUpdates} match(es), ${grantSkippedNoProfile} skipped (no profile for email), +${nowMs() - t0}ms total so far`
  );

  log(
    "Querying user_management where user_id IS NULL and user_email IS NOT NULL..."
  );
  const tQ2 = nowMs();
  const { data: orphanUm, error: uErr } = await admin
    .from("user_management")
    .select("id, user_email")
    .is("user_id", null)
    .not("user_email", "is", null);

  if (uErr) {
    console.error("user_management select error:", uErr);
    process.exit(1);
  }

  const umRows = orphanUm ?? [];
  log(
    `user_management: fetched ${umRows.length} orphan row(s) (+${nowMs() - tQ2}ms query, +${nowMs() - t0}ms total)`
  );

  let umUpdates = 0;
  let umSkippedNoProfile = 0;

  if (umRows.length > 0) {
    log(`Processing user_management: scanning ${umRows.length} row(s)...`);
  }

  for (let i = 0; i < umRows.length; i++) {
    const row = umRows[i];
    const em = String(row.user_email).trim().toLowerCase();

    if (i > 0 && i % PROGRESS_EVERY === 0) {
      log(
        `user_management: progress ${i}/${umRows.length} (matched ${umUpdates}, no profile ${umSkippedNoProfile})...`
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", em)
      .maybeSingle();

    if (!profile?.id) {
      umSkippedNoProfile += 1;
      continue;
    }

    umUpdates += 1;
    log(
      `[user_management] ${APPLY ? "APPLY" : "DRY-RUN"} [${umUpdates}] id=${row.id} -> user_id=${profile.id} (${em})`
    );

    if (APPLY) {
      const { error: upErr } = await admin
        .from("user_management")
        .update({ user_id: profile.id })
        .eq("id", row.id);
      if (upErr) {
        console.error("update user_management failed:", row.id, upErr);
      }
    }
  }

  log(
    `user_management section done: ${umUpdates} match(es), ${umSkippedNoProfile} skipped (no profile)`
  );
  log(
    `Done in ${nowMs() - t0}ms. product_grants updates: ${grantUpdates}, user_management updates: ${umUpdates}.`
  );
  if (!APPLY) {
    log("Re-run with --apply to write changes.");
  }
}

log("Script loaded, entering main()...");

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
