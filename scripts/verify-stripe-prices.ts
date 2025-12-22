import { createAdminClient } from '@/utils/supabase/service';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function main() {
  console.log('=== Verifying Stripe Price IDs Match Supabase Prices ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all products with Stripe price IDs
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, price, sale_price, stripe_price_id, stripe_sale_price_id')
    .not('stripe_price_id', 'is', null)
    .eq('status', 'active')
    .order('name');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  console.log(`Found ${products?.length || 0} products with Stripe price IDs\n`);
  
  let checked = 0;
  let updated = 0;
  let errors = 0;
  const updates: any[] = [];
  const mismatches: any[] = [];
  
  for (const product of products || []) {
    checked++;
    console.log(`\n[${checked}/${products.length}] ${product.name} (${product.slug})`);
    console.log(`  Supabase: price=$${product.price}, sale_price=${product.sale_price ? '$' + product.sale_price : 'null'}`);
    console.log(`  Stripe Price ID: ${product.stripe_price_id}`);
    
    try {
      // Retrieve the price from Stripe
      const stripePrice = await stripe.prices.retrieve(product.stripe_price_id);
      const stripePriceInDollars = (stripePrice.unit_amount || 0) / 100;
      
      console.log(`  Stripe: price=$${stripePriceInDollars} (${stripePrice.unit_amount} cents)`);
      
      // Determine the effective price (sale_price if exists, otherwise price)
      const effectivePrice = product.sale_price || product.price;
      const dbPrice = parseFloat(effectivePrice?.toString() || '0');
      
      // Compare prices (allow small floating point differences)
      if (Math.abs(dbPrice - stripePriceInDollars) > 0.01) {
        console.log(`  ⚠️  PRICE MISMATCH: DB=$${dbPrice}, Stripe=$${stripePriceInDollars}`);
        mismatches.push({
          product: product.name,
          slug: product.slug,
          dbPrice: dbPrice,
          stripePrice: stripePriceInDollars,
          stripePriceId: product.stripe_price_id,
        });
        
        // Update Supabase to match Stripe
        const updateData: any = {};
        
        // If there's a sale_price in DB but Stripe price matches regular price, clear sale_price
        if (product.sale_price && Math.abs(parseFloat(product.price.toString()) - stripePriceInDollars) < 0.01) {
          updateData.sale_price = null;
          console.log(`  → Clearing sale_price (Stripe price matches regular price)`);
        } else {
          // Update the price to match Stripe
          if (product.sale_price) {
            // If there's a sale price, update the regular price
            updateData.price = stripePriceInDollars;
            console.log(`  → Updating price to match Stripe`);
          } else {
            // No sale price, update the main price
            updateData.price = stripePriceInDollars;
            console.log(`  → Updating price to match Stripe`);
          }
        }
        
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating: ${updateError.message}`);
          errors++;
        } else {
          console.log(`  ✅ Updated: ${JSON.stringify(updateData)}`);
          updated++;
          updates.push({ product: product.name, updates: updateData });
        }
      } else {
        console.log(`  ✅ Prices match`);
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error: any) {
      console.error(`  ❌ Error retrieving Stripe price: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n=== Summary ===`);
  console.log(`✅ Checked: ${checked} products`);
  console.log(`✅ Updated: ${updated} products`);
  console.log(`❌ Errors: ${errors}`);
  
  if (mismatches.length > 0) {
    console.log(`\n⚠️  Price Mismatches Found:`);
    mismatches.forEach(m => {
      console.log(`  - ${m.product} (${m.slug}): DB=$${m.dbPrice}, Stripe=$${m.stripePrice}`);
    });
  }
  
  if (updates.length > 0) {
    console.log(`\nUpdated products:`);
    updates.forEach(u => {
      console.log(`  - ${u.product}: ${JSON.stringify(u.updates)}`);
    });
  }
}

main().catch(console.error);

