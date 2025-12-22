import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Checking Analog Plugin Bundle Details ===\n');
  
  const supabase = await createAdminClient();
  
  // Get the product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, category, status')
    .eq('slug', 'analog-plugin-bundle')
    .single();
  
  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }
  
  console.log(`Product: ${product.name}`);
  console.log(`  Slug: ${product.slug}`);
  console.log(`  Category: ${product.category}`);
  console.log(`  Status: ${product.status}\n`);
  
  // Check if there's a bundle record with matching slug
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .eq('slug', 'analog-plugin-bundle')
    .maybeSingle();
  
  if (bundleError) {
    console.error('Error checking bundles table:', bundleError);
  } else if (bundle) {
    console.log(`✅ Bundle record exists: ${bundle.name} (${bundle.id})\n`);
    
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
    } else if (!bundleProducts || bundleProducts.length === 0) {
      console.log('⚠️  No products attached to this bundle');
    } else {
      console.log(`✅ Found ${bundleProducts.length} products in bundle:\n`);
      bundleProducts.forEach((bp: any, index: number) => {
        const p = bp.product;
        const status = p?.status === 'active' ? '✅' : '⚠️';
        console.log(`  ${index + 1}. ${status} ${p?.name || 'Unknown'} (${p?.slug || 'unknown'})`);
        console.log(`     Category: ${p?.category || 'unknown'}`);
      });
    }
  } else {
    console.log('❌ No bundle record found in bundles table');
    console.log('   This product exists but has no corresponding bundle record.');
    console.log('   Products cannot be attached to it until a bundle record is created.');
  }
}

main().catch(console.error);

