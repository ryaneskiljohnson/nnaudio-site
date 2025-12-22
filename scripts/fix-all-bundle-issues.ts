import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Fixing All Bundle Issues ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all bundles with their slugs
  const { data: allBundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, name, slug');
  
  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
    return;
  }
  
  const bundleSlugMap = new Map(allBundles?.map(b => [b.id, b.slug]) || []);
  const bundleIdMap = new Map(allBundles?.map(b => [b.slug, b.id]) || []);
  
  console.log(`Found ${allBundles?.length || 0} bundles\n`);
  
  // Get all bundle products that include bundles (products with category = 'bundle')
  const { data: bundleProductsWithBundles, error: bpError } = await supabase
    .from('bundle_products')
    .select(`
      id,
      bundle_id,
      product_id,
      bundle:bundles!inner(id, name, slug),
      product:products!inner(id, name, slug, category)
    `)
    .eq('product.category', 'bundle');
  
  if (bpError) {
    console.error('Error fetching bundle products:', bpError);
    return;
  }
  
  console.log(`Found ${bundleProductsWithBundles?.length || 0} bundle-to-bundle relationships\n`);
  
  // Group by bundle to show what we're removing
  const removalsByBundle = new Map<string, any[]>();
  bundleProductsWithBundles?.forEach((bp: any) => {
    const bundleSlug = bp.bundle.slug;
    const productSlug = bp.product.slug;
    const isSelf = bundleSlug === productSlug;
    
    if (!removalsByBundle.has(bundleSlug)) {
      removalsByBundle.set(bundleSlug, []);
    }
    
    removalsByBundle.get(bundleSlug)!.push({
      id: bp.id,
      productName: bp.product.name,
      productSlug,
      isSelf,
    });
  });
  
  // Display what we're going to remove
  console.log('Bundles with bundle products (will be removed):');
  removalsByBundle.forEach((products, bundleSlug) => {
    console.log(`\n  ${bundleSlug}:`);
    products.forEach(p => {
      console.log(`    - ${p.productName} (${p.productSlug})${p.isSelf ? ' ⚠️ SELF-REFERENCE' : ''}`);
    });
  });
  
  // Get Tetrad Bundle ID and individual Tetrad product IDs
  const tetradBundleId = bundleIdMap.get('tetrad-bundle');
  const { data: tetradProducts, error: tetradError } = await supabase
    .from('products')
    .select('id, name, slug')
    .in('slug', ['tetrad-keys', 'tetrad-guitars', 'tetrad-winds']);
  
  if (tetradError) {
    console.error('Error fetching Tetrad products:', tetradError);
  }
  
  console.log('\n=== Fixing Issues ===\n');
  
  let removedCount = 0;
  let addedCount = 0;
  
  // Remove all bundle-to-bundle relationships
  for (const [bundleSlug, products] of removalsByBundle.entries()) {
    const bundleId = bundleIdMap.get(bundleSlug);
    if (!bundleId) continue;
    
    console.log(`\nFixing ${bundleSlug}:`);
    
    for (const product of products) {
      // Remove the bundle product relationship
      const { error: deleteError } = await supabase
        .from('bundle_products')
        .delete()
        .eq('id', product.id);
      
      if (deleteError) {
        console.error(`  ❌ Error removing ${product.productName}: ${deleteError.message}`);
      } else {
        console.log(`  ✅ Removed ${product.productName}${product.isSelf ? ' (self-reference)' : ''}`);
        removedCount++;
        
        // If this was Tetrad Series in Producer's Arsenal, add the individual Tetrad products
        if (bundleSlug === 'producers-arsenal' && product.productSlug === 'tetrad-series' && tetradProducts) {
          console.log(`  → Adding individual Tetrad products to Producer's Arsenal...`);
          
          // Get current max display_order
          const { data: maxOrder } = await supabase
            .from('bundle_products')
            .select('display_order')
            .eq('bundle_id', bundleId)
            .order('display_order', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          let displayOrder = (maxOrder?.display_order ?? -1) + 1;
          
          for (const tetradProduct of tetradProducts) {
            // Check if already in bundle
            const { data: existing } = await supabase
              .from('bundle_products')
              .select('id')
              .eq('bundle_id', bundleId)
              .eq('product_id', tetradProduct.id)
              .maybeSingle();
            
            if (!existing) {
              const { error: insertError } = await supabase
                .from('bundle_products')
                .insert({
                  bundle_id: bundleId,
                  product_id: tetradProduct.id,
                  display_order: displayOrder++,
                });
              
              if (insertError) {
                console.error(`    ❌ Error adding ${tetradProduct.name}: ${insertError.message}`);
              } else {
                console.log(`    ✅ Added ${tetradProduct.name}`);
                addedCount++;
              }
            } else {
              console.log(`    ⏭️  ${tetradProduct.name} already in bundle`);
            }
          }
        }
        
        // If this was Tetrad Series in Ultimate Bundle, add the individual Tetrad products
        if (bundleSlug === 'ultimate-bundle' && product.productSlug === 'tetrad-series' && tetradProducts) {
          console.log(`  → Adding individual Tetrad products to Ultimate Bundle...`);
          
          // Get current max display_order
          const { data: maxOrder } = await supabase
            .from('bundle_products')
            .select('display_order')
            .eq('bundle_id', bundleId)
            .order('display_order', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          let displayOrder = (maxOrder?.display_order ?? -1) + 1;
          
          for (const tetradProduct of tetradProducts) {
            // Check if already in bundle
            const { data: existing } = await supabase
              .from('bundle_products')
              .select('id')
              .eq('bundle_id', bundleId)
              .eq('product_id', tetradProduct.id)
              .maybeSingle();
            
            if (!existing) {
              const { error: insertError } = await supabase
                .from('bundle_products')
                .insert({
                  bundle_id: bundleId,
                  product_id: tetradProduct.id,
                  display_order: displayOrder++,
                });
              
              if (insertError) {
                console.error(`    ❌ Error adding ${tetradProduct.name}: ${insertError.message}`);
              } else {
                console.log(`    ✅ Added ${tetradProduct.name}`);
                addedCount++;
              }
            } else {
              console.log(`    ⏭️  ${tetradProduct.name} already in bundle`);
            }
          }
        }
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Removed ${removedCount} bundle-to-bundle relationships`);
  console.log(`✅ Added ${addedCount} individual products to replace bundles`);
  console.log(`\n✅ All bundles now only contain individual products (no bundles)`);
}

main().catch(console.error);

