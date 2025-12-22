import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Checking Bundle Issues ===\n');
  
  const supabase = await createAdminClient();
  
  // Check for Tetrad Series vs Tetrad Bundle
  const { data: tetradProducts, error: tetradError } = await supabase
    .from('products')
    .select('id, name, slug, category, status')
    .in('slug', ['tetrad-series', 'tetrad-bundle', 'tetrad-keys', 'tetrad-guitars', 'tetrad-winds']);
  
  if (tetradError) {
    console.error('Error fetching Tetrad products:', tetradError);
    return;
  }
  
  console.log('Tetrad Products:');
  tetradProducts?.forEach(p => {
    console.log(`  - ${p.name} (${p.slug}) - ${p.category} - ${p.status}`);
  });
  
  // Check which bundles include Tetrad Series
  const { data: bundlesWithTetrad, error: bundlesError } = await supabase
    .from('bundle_products')
    .select(`
      bundle_id,
      product_id,
      bundle:bundles!inner(name, slug),
      product:products!inner(name, slug)
    `)
    .eq('product.slug', 'tetrad-series');
  
  if (bundlesError) {
    console.error('Error fetching bundles with Tetrad Series:', bundlesError);
  } else {
    console.log('\nBundles that include "Tetrad Series":');
    bundlesWithTetrad?.forEach((bp: any) => {
      console.log(`  - ${bp.bundle.name} (${bp.bundle.slug})`);
    });
  }
  
  // Check for circular references (bundles that include themselves)
  const { data: allBundles, error: allBundlesError } = await supabase
    .from('bundles')
    .select('id, name, slug');
  
  if (allBundlesError) {
    console.error('Error fetching bundles:', allBundlesError);
    return;
  }
  
  const bundleSlugMap = new Map(allBundles?.map(b => [b.id, b.slug]) || []);
  
  const { data: circularRefs, error: circularError } = await supabase
    .from('bundle_products')
    .select(`
      bundle_id,
      product_id,
      bundle:bundles!inner(slug),
      product:products!inner(slug, category)
    `)
    .eq('product.category', 'bundle');
  
  if (circularError) {
    console.error('Error checking circular references:', circularError);
  } else {
    console.log('\nBundles that include other bundles:');
    const bundleInclusions = new Map<string, string[]>();
    circularRefs?.forEach((bp: any) => {
      const bundleSlug = bp.bundle.slug;
      const productSlug = bp.product.slug;
      if (!bundleInclusions.has(bundleSlug)) {
        bundleInclusions.set(bundleSlug, []);
      }
      bundleInclusions.get(bundleSlug)!.push(productSlug);
    });
    
    bundleInclusions.forEach((products, bundle) => {
      console.log(`  ${bundle}:`);
      products.forEach(p => {
        const isSelf = p === bundle;
        console.log(`    - ${p}${isSelf ? ' ⚠️ SELF-REFERENCE' : ''}`);
      });
    });
  }
}

main().catch(console.error);

