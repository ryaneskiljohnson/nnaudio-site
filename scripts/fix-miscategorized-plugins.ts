import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Products that are miscategorized as "plugin" but should be "pack"
const productsToFix = [
  'Lofi Jamz',
  'Weaknd',
  'Yonkers Cthulhu',
  'Ultimate Drums & Percs 2',
  'Life Death',
  'Go To Work',
  'The Code',
  'Modern Cthulhu 2',
  'Ultimate Drums & Percs 1',
  'Mutahad Sample Library',
  'Ride Away',
  'Modern Cthulhu 1',
];

async function fixMiscategorizedProducts() {
  console.log('=== Fixing Miscategorized Products ===\n');

  for (const productName of productsToFix) {
    try {
      // Find the product by name - get all matches, not just one
      const { data: products, error: findError } = await supabase
        .from('products')
        .select('id, name, category, slug')
        .ilike('name', `%${productName}%`)
        .eq('category', 'plugin');

      if (findError) {
        console.error(`  ✗ Error finding ${productName}:`, findError);
        continue;
      }

      if (!products || products.length === 0) {
        console.log(`  ⚠ Product "${productName}" not found or already fixed`);
        continue;
      }

      // Update all matching products
      for (const product of products) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ category: 'pack' })
          .eq('id', product.id);

        if (updateError) {
          console.error(`  ✗ Error updating ${product.name}:`, updateError);
          continue;
        }

        console.log(`  ✓ Updated "${product.name}" (${product.slug}) from "plugin" to "pack"`);
      }
    } catch (error) {
      console.error(`  ✗ Unexpected error for ${productName}:`, error);
    }
  }

  console.log('\n=== Done ===');
}

fixMiscategorizedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

