import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Verifying Bundle Products ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all bundles
  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, name, slug, bundle_type, status')
    .order('name');
  
  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
    return;
  }
  
  console.log(`Found ${bundles?.length || 0} bundles\n`);
  
  if (!bundles || bundles.length === 0) {
    console.log('No bundles found.');
    return;
  }
  
  // Get all bundle products
  const { data: bundleProducts, error: bundleProductsError } = await supabase
    .from('bundle_products')
    .select(`
      id,
      bundle_id,
      product_id,
      display_order,
      bundle:bundles!inner(id, name, slug),
      product:products!inner(id, name, slug, category, status)
    `)
    .order('bundle_id')
    .order('display_order');
  
  if (bundleProductsError) {
    console.error('Error fetching bundle products:', bundleProductsError);
    return;
  }
  
  // Group bundle products by bundle
  const bundleProductsMap = new Map<string, any[]>();
  (bundleProducts || []).forEach((bp: any) => {
    const bundleId = bp.bundle_id;
    if (!bundleProductsMap.has(bundleId)) {
      bundleProductsMap.set(bundleId, []);
    }
    bundleProductsMap.get(bundleId)!.push(bp);
  });
  
  // Display each bundle and its products
  for (const bundle of bundles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Bundle: ${bundle.name}`);
    console.log(`  Slug: ${bundle.slug}`);
    console.log(`  Type: ${bundle.bundle_type}`);
    console.log(`  Status: ${bundle.status}`);
    
    const products = bundleProductsMap.get(bundle.id) || [];
    
    if (products.length === 0) {
      console.log(`  ⚠️  No products in this bundle`);
    } else {
      console.log(`  Products (${products.length}):`);
      products.forEach((bp: any, index: number) => {
        const product = bp.product;
        const status = product?.status === 'active' ? '✅' : '⚠️';
        console.log(`    ${index + 1}. ${status} ${product?.name || 'Unknown'} (${product?.slug || 'unknown'})`);
        console.log(`       Category: ${product?.category || 'unknown'}`);
      });
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\nSummary:`);
  console.log(`  Total bundles: ${bundles.length}`);
  console.log(`  Bundles with products: ${Array.from(bundleProductsMap.keys()).length}`);
  console.log(`  Total bundle-product relationships: ${bundleProducts?.length || 0}`);
}

main().catch(console.error);

