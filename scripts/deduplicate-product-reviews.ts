/**
 * @fileoverview Removes duplicate product reviews.
 * @module scripts/deduplicate-product-reviews
 *
 * Deduplicates by:
 * 1. Same product + same review text (different customer names)
 * 2. Same review text across different products (template reuse)
 *
 * Run with: npx tsx scripts/deduplicate-product-reviews.ts
 */

import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

/**
 * @brief Deletes duplicate reviews: same (product, text) and same text globally.
 * Keeps oldest per unique key.
 */
async function deduplicateReviews() {
  console.log('=== Deduplicate Product Reviews ===\n');

  const adminSupabase = await createAdminClient();

  const { data: allReviews } = await adminSupabase
    .from('product_reviews')
    .select('id, product_id, title, customer_name, review_text, created_at')
    .order('created_at', { ascending: true });

  if (!allReviews || allReviews.length === 0) {
    console.log('No reviews found.');
    return { deleted: 0, duplicates: [] };
  }

  // Key: (product_id, review_text) - same product shouldn't have same text twice
  const seenProductText = new Map<string, string>();
  // Key: review_text - same text shouldn't appear on multiple products
  const seenGlobalText = new Map<string, string>();
  const toDelete: string[] = [];

  for (const r of allReviews) {
    const text = r.review_text || '';
    const productTextKey = `${r.product_id}|${text}`;
    const globalTextKey = text;

    const isDupProduct = text && seenProductText.has(productTextKey);
    const isDupGlobal = text && seenGlobalText.has(globalTextKey);

    if (isDupProduct || isDupGlobal) {
      toDelete.push(r.id);
    } else {
      if (text) {
        seenProductText.set(productTextKey, r.id);
        seenGlobalText.set(globalTextKey, r.id);
      }
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ No duplicate reviews found.\n');
    return { deleted: 0, duplicates: [] };
  }

  console.log(`Found ${toDelete.length} duplicate review(s) to remove.\n`);

  // Delete in batches of 100
  const batchSize = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error: deleteError } = await adminSupabase
      .from('product_reviews')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch: ${deleteError.message}`);
    } else {
      deleted += batch.length;
      console.log(`  Deleted ${batch.length} duplicate(s)`);
    }
  }

  console.log(`\n✅ Removed ${deleted} duplicate review(s).\n`);
  return { deleted, duplicates: [] };
}

deduplicateReviews().catch(console.error);
