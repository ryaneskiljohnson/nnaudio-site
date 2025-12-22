import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Checking for Analog Bundle ===\n');
  
  const supabase = await createAdminClient();
  
  // Check bundles table
  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .ilike('name', '%analog%')
    .or('slug.ilike.%analog%');
  
  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
  } else {
    console.log('Bundles with "analog" in name or slug:');
    if (bundles && bundles.length > 0) {
      bundles.forEach(b => {
        console.log(`  - ${b.name} (${b.slug})`);
      });
    } else {
      console.log('  None found');
    }
  }
  
  // Check products table
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, category, status')
    .ilike('name', '%analog%')
    .or('slug.ilike.%analog%');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
  } else {
    console.log('\nProducts with "analog" in name or slug:');
    if (products && products.length > 0) {
      products.forEach(p => {
        console.log(`  - ${p.name} (${p.slug}) - ${p.category} - ${p.status}`);
      });
    } else {
      console.log('  None found');
    }
  }
}

main().catch(console.error);

