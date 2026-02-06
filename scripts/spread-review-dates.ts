/**
 * @fileoverview Spreads product review dates over the past year.
 * @module scripts/spread-review-dates
 *
 * Run with: npx tsx scripts/spread-review-dates.ts
 */

import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * @brief Updates all product reviews with dates spread evenly over the past year.
 */
async function spreadReviewDates() {
  console.log('=== Spreading Review Dates Over Past Year ===\n');

  const adminSupabase = await createAdminClient();

  const { data: reviews, error: fetchError } = await adminSupabase
    .from('product_reviews')
    .select('id')
    .order('id', { ascending: true });

  if (fetchError || !reviews?.length) {
    console.error('Error fetching reviews:', fetchError);
    return;
  }

  const now = Date.now();
  const oneYearAgo = now - ONE_YEAR_MS;

  console.log(`Updating ${reviews.length} reviews...\n`);

  // Spread evenly: for review i of N, place at (i/N) * year + small random jitter
  let updated = 0;
  const batchSize = 50;

  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize);
    const updates = batch.map((r, idx) => {
      const progress = (i + idx) / reviews.length;
      const jitter = (Math.random() - 0.5) * 3 * 24 * 60 * 60 * 1000; // ±1.5 days
      const dateMs = oneYearAgo + progress * ONE_YEAR_MS + jitter;
      const date = new Date(dateMs).toISOString();
      return { id: r.id, created_at: date, updated_at: date };
    });

    for (const u of updates) {
      const { error } = await adminSupabase
        .from('product_reviews')
        .update({ created_at: u.created_at, updated_at: u.updated_at })
        .eq('id', u.id);

      if (!error) updated++;
    }

    process.stdout.write(`  ${Math.min(i + batchSize, reviews.length)}/${reviews.length}\r`);
  }

  console.log(`\n✅ Updated ${updated} review dates (spread over past year).\n`);
}

spreadReviewDates().catch(console.error);
