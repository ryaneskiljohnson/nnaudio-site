/**
 * @fileoverview One-time script to mark existing bulk-imported users as email-verified.
 * @module scripts/verify-bulk-imported-users
 *
 * Bulk-imported accounts may have null email_confirmed_at because they never
 * received a verification email. This script sets email_confirm: true for all
 * such users so they can use password reset and other flows that require a
 * confirmed email.
 *
 * Run once: npx tsx scripts/verify-bulk-imported-users.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const PER_PAGE = 1000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("Listing users and marking unconfirmed emails as verified...\n");

  let page = 1;
  let totalUpdated = 0;
  let totalProcessed = 0;

  while (true) {
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });

    if (listError) {
      console.error("listUsers error:", listError.message);
      process.exit(1);
    }
    if (!users?.length) break;

    for (const user of users) {
      totalProcessed += 1;
      if (user.email_confirmed_at) continue;

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );
      if (updateError) {
        console.error(`  Failed to verify ${user.email}:`, updateError.message);
      } else {
        totalUpdated += 1;
        console.log(`  Verified: ${user.email}`);
      }
    }

    process.stdout.write(
      `\r  Processed ${totalProcessed} users, ${totalUpdated} marked verified (page ${page})`
    );
    if (users.length < PER_PAGE) break;
    page += 1;
  }

  console.log(`\n\nDone. ${totalUpdated} user(s) marked as email-verified.`);
}

main().catch(console.error);
