/**
 * Script to sync all products to Stripe
 * Run with: tsx scripts/sync-all-products-to-stripe.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { syncProductToStripe } from '../utils/stripe/product-sync';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Syncing All Products to Stripe ===\n');

  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, short_description, price, sale_price, stripe_product_id, stripe_price_id, stripe_sale_price_id')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No products found');
    process.exit(0);
  }

  console.log(`Found ${products.length} products\n`);

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    console.log(`\n[${i + 1}/${products.length}] ${product.name}`);
    console.log(`  Price: $${product.price}${product.sale_price ? ` (Sale: $${product.sale_price})` : ''}`);
    
    if (!product.price || product.price <= 0) {
      console.log(`  ⚠ Skipping - no valid price`);
      skipped++;
      continue;
    }

    try {
      const syncResult = await syncProductToStripe(
        product.id,
        product.name,
        product.description || product.short_description || '',
        product.price,
        product.sale_price,
        product.stripe_product_id,
        product.stripe_price_id,
        product.stripe_sale_price_id
      );

      if (syncResult.success) {
        // Update product with Stripe IDs (clear sale price ID since we don't use it)
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stripe_product_id: syncResult.stripe_product_id,
            stripe_price_id: syncResult.stripe_price_id,
            stripe_sale_price_id: null, // Clear sale price ID - not used
          })
          .eq('id', product.id);

        if (updateError) {
          console.error(`  ✗ Error updating product: ${updateError.message}`);
          failed++;
        } else {
          console.log(`  ✓ Synced to Stripe`);
          console.log(`    Product ID: ${syncResult.stripe_product_id}`);
          console.log(`    Price ID: ${syncResult.stripe_price_id}`);
          synced++;
        }
      } else {
        console.error(`  ✗ Stripe sync failed: ${syncResult.error}`);
        failed++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Synced: ${synced}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${products.length}`);
}

main().catch(console.error);

