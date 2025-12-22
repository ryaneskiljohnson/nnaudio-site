import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Checking Analog Bundle ===\n');
  
  const supabase = await createAdminClient();
  
  // Check if analog bundle exists
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .select('id, name, slug, bundle_type, status')
    .eq('slug', 'analog-plugin-bundle')
    .maybeSingle();
  
  if (bundleError) {
    console.error('Error fetching bundle:', bundleError);
    return;
  }
  
  if (!bundle) {
    console.log('❌ Analog Bundle not found in bundles table');
    return;
  }
  
  console.log(`Bundle found: ${bundle.name}`);
  console.log(`  Slug: ${bundle.slug}`);
  console.log(`  Type: ${bundle.bundle_type}`);
  console.log(`  Status: ${bundle.status}\n`);
  
  // Get products in this bundle
  const { data: bundleProducts, error: productsError } = await supabase
    .from('bundle_products')
    .select(`
      id,
      display_order,
      product:products!inner(
        id,
        name,
        slug,
        category,
        status
      )
    `)
    .eq('bundle_id', bundle.id)
    .order('display_order');
  
  if (productsError) {
    console.error('Error fetching bundle products:', productsError);
    return;
  }
  
  if (!bundleProducts || bundleProducts.length === 0) {
    console.log('⚠️  No products attached to Analog Bundle');
  } else {
    console.log(`✅ Found ${bundleProducts.length} products in Analog Bundle:\n`);
    bundleProducts.forEach((bp: any, index: number) => {
      const product = bp.product;
      const status = product?.status === 'active' ? '✅' : '⚠️';
      console.log(`  ${index + 1}. ${status} ${product?.name || 'Unknown'} (${product?.slug || 'unknown'})`);
      console.log(`     Category: ${product?.category || 'unknown'}`);
    });
  }
}

main().catch(console.error);

