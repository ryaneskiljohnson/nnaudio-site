import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Verifying All Bundle Products ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all products with category='bundle'
  const { data: bundleProducts, error: bundleError } = await supabase
    .from('products')
    .select('id, name, slug, description, short_description, status')
    .eq('category', 'bundle')
    .order('name');
  
  if (bundleError) {
    console.error('Error fetching bundle products:', bundleError);
    return;
  }
  
  console.log(`Found ${bundleProducts?.length || 0} bundle products\n`);
  
  if (!bundleProducts || bundleProducts.length === 0) {
    console.log('No bundle products found.');
    return;
  }
  
  // Get all bundles from bundles table
  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .order('name');
  
  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
    return;
  }
  
  const bundleSlugMap = new Map(bundles?.map(b => [b.slug, b.id]) || []);
  
  // Get all bundle_products relationships
  const { data: allBundleProducts, error: bpError } = await supabase
    .from('bundle_products')
    .select(`
      bundle_id,
      product_id,
      bundle:bundles!inner(slug, name),
      product:products!inner(slug, name)
    `);
  
  if (bpError) {
    console.error('Error fetching bundle_products:', bpError);
    return;
  }
  
  // Group by bundle slug
  const productsByBundle = new Map<string, any[]>();
  allBundleProducts?.forEach((bp: any) => {
    const bundleSlug = bp.bundle.slug;
    if (!productsByBundle.has(bundleSlug)) {
      productsByBundle.set(bundleSlug, []);
    }
    productsByBundle.get(bundleSlug)!.push(bp.product);
  });
  
  // Check each bundle product
  for (const bundleProduct of bundleProducts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Bundle Product: ${bundleProduct.name}`);
    console.log(`  Slug: ${bundleProduct.slug}`);
    console.log(`  Status: ${bundleProduct.status}`);
    
    // Check if there's a corresponding bundle record
    const bundleId = bundleSlugMap.get(bundleProduct.slug);
    
    if (!bundleId) {
      console.log(`  ⚠️  No bundle record found in bundles table`);
      console.log(`     This bundle product has no way to attach individual products.`);
      console.log(`     It needs a corresponding record in the bundles table.`);
    } else {
      const products = productsByBundle.get(bundleProduct.slug) || [];
      if (products.length === 0) {
        console.log(`  ❌ No products attached`);
      } else {
        console.log(`  ✅ ${products.length} products attached:`);
        products.forEach((p: any, index: number) => {
          console.log(`     ${index + 1}. ${p.name} (${p.slug})`);
        });
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\nSummary:`);
  console.log(`  Total bundle products: ${bundleProducts.length}`);
  console.log(`  Bundle products with bundle records: ${bundleProducts.filter(bp => bundleSlugMap.has(bp.slug)).length}`);
  console.log(`  Bundle products without bundle records: ${bundleProducts.filter(bp => !bundleSlugMap.has(bp.slug)).length}`);
}

main().catch(console.error);

