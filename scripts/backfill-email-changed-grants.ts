/**
 * @fileoverview Backfills `user_id` on `product_grants` and `user_management` where the row
 * still has `user_id` null but we can resolve the Supabase user from `user_email`.
 *
 * **Resolution:**
 * Build a map `lower(email) -> auth user id` via `auth.admin.listUsers` (paginated).
 * `profiles.id` is a FK to `auth.users.id` and `profiles.email` is kept in sync, so the Auth
 * map is authoritative — a per-row `profiles` ILIKE fallback can never recover an email that
 * is missing from Auth, and its cost was dominating runtime on large orphan sets.
 *
 * **PostgREST row limit:** Orphan rows are loaded in pages of `PAGE_SIZE` (default 1000),
 * not just the first page.
 *
 * **Database prerequisites:** See earlier migration list in git history / file history.
 *
 * Rows stuck under an *old* email after an address change need `POST /api/admin/relink-email-grants`.
 *
 * Usage:
 *   bun run scripts/backfill-email-changed-grants.ts [--apply]
 *
 * @module scripts/backfill-email-changed-grants
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { syncStripeCustomerEmailFromProfile } from "@/utils/stripe/sync-customer-email";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const APPLY = process.argv.includes("--apply");

/** Service-role client returned by {@link createSupabaseServiceRole}. */
type ServiceSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServiceRole>
>;

const PROGRESS_EVERY = 500;
/** PostgREST default max rows per request; we page past it. */
const PAGE_SIZE = 1000;
/** Safety cap: paginated `listUsers` should eventually return an empty page. */
const MAX_AUTH_LIST_PAGES = 50_000;
/** How many unmatched emails to print verbatim for eyeballing / follow-up. */
const UNMATCHED_SAMPLE_LIMIT = 20;

function nowMs(): number {
  return Date.now();
}

function iso(): string {
  return new Date().toISOString();
}

function log(msg: string): void {
  console.log(`[${iso()}] [backfill] ${msg}`);
}

/**
 * @brief Normalize an email the same way our `normalize_user_email` trigger would.
 * @note Applies **NFC Unicode normalization** and lowercases/trims. This catches sources
 *       where the email was stored with Unicode combining marks / different case.
 */
function normalizeEmail(raw: string): string {
  return raw.normalize("NFC").trim().toLowerCase();
}

/**
 * @brief Escape an email string for safe display in CSV / quoted log lines.
 */
function describeEmail(raw: string): string {
  const bytes = Buffer.byteLength(raw, "utf8");
  const charCount = raw.length;
  return `"${raw}" (len=${charCount}, bytes=${bytes})`;
}

/**
 * @brief All auth users `trim(lower(email)) -> user id` for grant email resolution.
 * @note Stops when a page returns **zero** users — not when `batch.length < perPage`.
 *       GoTrue may cap each response below `perPage`; treating a short page as the last
 *       page would only index the first chunk of Auth users and yield widespread “no user”.
 */
async function buildAuthEmailToUserIdMap(
  serviceSupabase: ServiceSupabaseClient
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  let nonEmptyPages = 0;
  const t0 = nowMs();
  log("Building auth email → user_id map (paginated listUsers)...");

  for (;;) {
    if (page > MAX_AUTH_LIST_PAGES) {
      throw new Error(
        `auth.admin.listUsers: exceeded MAX_AUTH_LIST_PAGES (${MAX_AUTH_LIST_PAGES}); aborting to avoid an infinite loop`
      );
    }

    const { data, error } = await serviceSupabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(`auth.admin.listUsers failed: ${error.message}`);
    }

    const users = data?.users ?? [];
    if (users.length === 0) {
      break;
    }

    nonEmptyPages += 1;
    for (const u of users) {
      if (!u.email) continue;
      const e = normalizeEmail(u.email);
      if (e) map.set(e, u.id);
    }

    if (page % 10 === 0) {
      log(
        `listUsers: finished page ${page} (${users.length} row(s) this page), ${map.size} unique email(s) in map (+${nowMs() - t0}ms)...`
      );
    }

    page += 1;
  }

  log(
    `Auth email map: ${map.size} unique email(s) from ${nonEmptyPages} non-empty listUsers page(s) (+${nowMs() - t0}ms)`
  );
  return map;
}

/**
 * @brief Resolve Auth user id for a normalized email, using the pre-built map only.
 * @note `profiles.id` FKs `auth.users.id` and `profiles.email` is synced, so a `profiles`
 *       fallback cannot recover an email that Auth does not have; the per-row lookup was
 *       the main source of the 100ms/row cost.
 */
function resolveUserIdForEmail(
  authByEmail: Map<string, string>,
  normalizedEmail: string
): string | null {
  return authByEmail.get(normalizedEmail) ?? null;
}

/**
 * @brief Fetch all rows matching orphan product_grants (paginated).
 */
async function fetchAllOrphanProductGrants(
  supabase: ServiceSupabaseClient
): Promise<Array<{ id: string; user_email: string; product_id: string }>> {
  const rows: Array<{ id: string; user_email: string; product_id: string }> = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("product_grants")
      .select("id, user_email, product_id")
      .is("user_id", null)
      .not("user_email", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`product_grants page error: ${error.message}`);
    }

    const batch = (data ?? []) as Array<{
      id: string;
      user_email: string;
      product_id: string;
    }>;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/**
 * @brief Fetch all orphan user_management rows (paginated).
 */
async function fetchAllOrphanUserManagement(
  supabase: ServiceSupabaseClient
): Promise<Array<{ id: string; user_email: string | null }>> {
  const rows: Array<{ id: string; user_email: string | null }> = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("user_management")
      .select("id, user_email")
      .is("user_id", null)
      .not("user_email", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`user_management page error: ${error.message}`);
    }

    const batch = (data ?? []) as Array<{
      id: string;
      user_email: string | null;
    }>;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main(): Promise<void> {
  const t0 = nowMs();
  log(
    `Starting (mode=${APPLY ? "APPLY — writes enabled" : "DRY-RUN — no writes"})`
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    log(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Ensure .env.local (or .env) is present or export these variables."
    );
    process.exit(1);
  }

  log("Creating Supabase service-role client...");
  const tClient = nowMs();
  const supabase = await createSupabaseServiceRole();
  log(`Service-role client ready (+${nowMs() - tClient}ms, +${nowMs() - t0}ms total)`);

  const authByEmail = await buildAuthEmailToUserIdMap(supabase);

  if (authByEmail.size > 0) {
    const sampleAuthEmails = Array.from(authByEmail.keys()).slice(0, 3);
    log(
      `Auth map sample (first 3): ${sampleAuthEmails.map(describeEmail).join(", ")}`
    );
  }

  log(
    "Loading all orphan product_grants (paginated; not limited to first 1000 rows)..."
  );
  const tQ1 = nowMs();
  let grantRows: Array<{ id: string; user_email: string; product_id: string }>;
  try {
    grantRows = await fetchAllOrphanProductGrants(supabase);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  log(
    `product_grants: ${grantRows.length} orphan row(s) total (+${nowMs() - tQ1}ms fetch, +${nowMs() - t0}ms total)`
  );

  let grantUpdates = 0;
  let grantSkippedNoProfile = 0;
  let grantSkippedConflictGrant = 0;
  const stripeSyncedUserIds = new Set<string>();
  const unmatchedSample: Array<{ raw: string; normalized: string }> = [];

  if (grantRows.length > 0) {
    log(`Processing product_grants: scanning ${grantRows.length} row(s)...`);
  }

  for (let i = 0; i < grantRows.length; i++) {
    const row = grantRows[i];
    const raw = String(row.user_email);
    const em = normalizeEmail(raw);

    if (i > 0 && i % PROGRESS_EVERY === 0) {
      log(
        `product_grants: progress ${i}/${grantRows.length} (matched ${grantUpdates}, no user ${grantSkippedNoProfile}, conflict ${grantSkippedConflictGrant})...`
      );
    }

    const userId = resolveUserIdForEmail(authByEmail, em);
    if (!userId) {
      grantSkippedNoProfile += 1;
      if (unmatchedSample.length < UNMATCHED_SAMPLE_LIMIT) {
        unmatchedSample.push({ raw, normalized: em });
      }
      continue;
    }

    const { data: existingPair } = await supabase
      .from("product_grants")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", row.product_id)
      .neq("id", row.id)
      .limit(1)
      .maybeSingle();

    if (existingPair?.id) {
      grantSkippedConflictGrant += 1;
      log(
        `[product_grants] SKIP conflict orphan id=${row.id} (${em}) — already row id=${existingPair.id}`
      );
      continue;
    }

    grantUpdates += 1;
    log(
      `[product_grants] ${APPLY ? "APPLY" : "DRY-RUN"} [${grantUpdates}] id=${row.id} -> user_id=${userId} product_id=${row.product_id} (${em})`
    );

    if (APPLY) {
      const { error: upErr } = await supabase
        .from("product_grants")
        .update({
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.error("update grant failed:", row.id, upErr);
      } else if (!stripeSyncedUserIds.has(userId)) {
        stripeSyncedUserIds.add(userId);
        log(
          `Syncing Stripe customer email for user_id=${userId} (first grant update for this user)...`
        );
        await syncStripeCustomerEmailFromProfile(supabase, userId, em);
        log(`Stripe sync finished for user_id=${userId}`);
      }
    }
  }

  log(
    `product_grants section done: ${grantUpdates} match(es), ${grantSkippedNoProfile} skipped (no auth user), ${grantSkippedConflictGrant} skipped (duplicate user+product), +${nowMs() - t0}ms so far`
  );

  if (unmatchedSample.length > 0) {
    log(
      `Unmatched product_grants sample (first ${unmatchedSample.length} of ${grantSkippedNoProfile}):`
    );
    for (const s of unmatchedSample) {
      const rawDifferent = s.raw !== s.normalized;
      log(
        `  - raw=${describeEmail(s.raw)}${rawDifferent ? `, normalized=${describeEmail(s.normalized)}` : ""}`
      );
    }
    log(
      "These emails are not in auth.users. Legitimate pre-signup Stripe purchases should be linked via POST /api/admin/relink-email-grants once the buyer has a Supabase account."
    );
  }

  log("Loading all orphan user_management rows (paginated)...");
  const tQ2 = nowMs();
  let umRows: Array<{ id: string; user_email: string | null }>;
  try {
    umRows = await fetchAllOrphanUserManagement(supabase);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  log(
    `user_management: ${umRows.length} orphan row(s) (+${nowMs() - tQ2}ms, +${nowMs() - t0}ms total)`
  );

  let umUpdates = 0;
  let umSkippedNoProfile = 0;
  let umSkippedDuplicateUser = 0;

  if (umRows.length > 0) {
    log(`Processing user_management: ${umRows.length} row(s)...`);
  }

  for (let i = 0; i < umRows.length; i++) {
    const row = umRows[i];
    const em = normalizeEmail(String(row.user_email));

    if (i > 0 && i % PROGRESS_EVERY === 0) {
      log(
        `user_management: progress ${i}/${umRows.length} (matched ${umUpdates}, no user ${umSkippedNoProfile}, duplicate ${umSkippedDuplicateUser})...`
      );
    }

    const userId = resolveUserIdForEmail(authByEmail, em);
    if (!userId) {
      umSkippedNoProfile += 1;
      continue;
    }

    const { data: existingUserRow } = await supabase
      .from("user_management")
      .select("id")
      .eq("user_id", userId)
      .neq("id", row.id)
      .limit(1)
      .maybeSingle();

    if (existingUserRow?.id) {
      umSkippedDuplicateUser += 1;
      log(
        `[user_management] SKIP orphan id=${row.id} (${em}) — row id=${existingUserRow.id} already has user_id=${userId}`
      );
      continue;
    }

    umUpdates += 1;
    log(
      `[user_management] ${APPLY ? "APPLY" : "DRY-RUN"} [${umUpdates}] id=${row.id} -> user_id=${userId} (${em})`
    );

    if (APPLY) {
      const { error: upErr } = await supabase
        .from("user_management")
        .update({ user_id: userId })
        .eq("id", row.id);
      if (upErr) {
        console.error("update user_management failed:", row.id, upErr);
      }
    }
  }

  log(
    `user_management section done: ${umUpdates} match(es), ${umSkippedNoProfile} skipped (no user), ${umSkippedDuplicateUser} skipped (user_id already present)`
  );
  log(
    `Done in ${nowMs() - t0}ms. product_grants: ${grantUpdates} updated (or dry-run), user_management: ${umUpdates}.`
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
