import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Based on bundle names and common sense, define which products belong to each bundle
const BUNDLE_PRODUCT_MAPPINGS: Record<string, string[]> = {
  'analog-plugin-bundle': [
    // Analog-style FX plugins - these are the free FX modules that have analog characteristics
    'freeq-free-eq-module-plugin',
    'freeverb-free-reverb-module-plugin',
    'freelay-free-delay-module-plugin',
    'sterfreeo-free-stereo-module-plugin',
    'curves-eq',
    'crystal-ball-magic-multi-effect',
    'digital-echoes-delay',
  ],
  'all-guitar-bundle': [
    'blaque',
    'numb',
    'tetrad-guitars',
  ],
  'guitar-bundle-xmas-2023': [
    'blaque',
    'numb',
    'tetrad-guitars',
  ],
  'atmosphere-bundle': [
    'mesosphere',
    'tactures',
    'reiya',
  ],
  'soundscapes-bundle-xmas-2023': [
    'mesosphere',
    'tactures',
    'reiya',
  ],
  'cthulhu-bundle-1-xmas-2023': [
    'cthulhu-godz-1',
    'cthulhu-godz-2',
    'alice-cthulhu',
    'flower-cthulhu',
    'element-cthulhu',
    'modern-cthulhu-1',
    'modern-cthulhu-2',
  ],
  'cthulhu-bundle-2-xmas-2023': [
    'cthulhu-godz-1',
    'cthulhu-godz-2',
    'alice-cthulhu',
    'flower-cthulhu',
    'element-cthulhu',
    'modern-cthulhu-1',
    'modern-cthulhu-2',
    'yonkers-cthulhu',
    'weaknd-cthulhu',
    'reflection-cthulhu',
    'primal-cthulhu',
  ],
  'drum-bass-bundle-2': [
    'noker',
    'subflux-bass-module',
    'ultimate-drums-percs-1',
    'ultimate-drums-percs-2',
  ],
  'drum-perc-bundle': [
    'perc-gadget',
    'ultimate-drums-percs-1',
    'ultimate-drums-percs-2',
  ],
  'modern-fx-bundle': [
    'freeq-free-eq-module-plugin',
    'freeverb-free-reverb-module-plugin',
    'freelay-free-delay-module-plugin',
    'sterfreeo-free-stereo-module-plugin',
    'curves-eq',
    'crystal-ball-magic-multi-effect',
    'digital-echoes-delay',
  ],
  'modern-song-constructions-bundle': [
    'go-to-work-modern-song-constructions',
    'the-code-modern-song-constructions',
    'ride-away-modern-song-constructions',
  ],
  'modern-workstation-bundle-xmas-2023': [
    'rompl-workstation',
    'digitaldreamscape-quad-rompler',
  ],
  'orchestra-bundle-xmas-2023': [
    'prodigious',
    'obscura-tortured-orchestral-box',
    'quoir',
    'reiya',
  ],
  'orchestral-plugin-bundle': [
    'prodigious',
    'obscura-tortured-orchestral-box',
    'quoir',
    'reiya',
  ],
  'relaunch-plugin-bundle-2': [
    // Based on description mentioning Natura, Noker, Albanju, Obscura
    'natura',
    'noker',
    'albanju',
    'obscura-tortured-orchestral-box',
  ],
  'selection-box-bundle-xmas-2023': [
    // Selection box - typically a curated mix, let's include popular plugins
    // This one might need manual review
  ],
  'summer-sample-pack-bundle': [
    // Sample packs - need to identify which packs belong
  ],
};

async function main() {
  console.log('=== Attaching Products Based on Bundle Names ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all bundles
  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .order('name');
  
  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
    return;
  }
  
  // Get all products
  const { data: allProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, category, status')
    .eq('status', 'active')
    .neq('category', 'bundle');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  // Create slug to product map
  const productMap = new Map(allProducts?.map(p => [p.slug, p]) || []);
  
  // Get existing bundle_products
  const { data: existingBP, error: bpError } = await supabase
    .from('bundle_products')
    .select('bundle_id, product_id');
  
  if (bpError) {
    console.error('Error fetching existing bundle_products:', bpError);
    return;
  }
  
  const existingSet = new Set(
    existingBP?.map(bp => `${bp.bundle_id}-${bp.product_id}`) || []
  );
  
  let totalAdded = 0;
  
  for (const bundle of bundles || []) {
    const productSlugs = BUNDLE_PRODUCT_MAPPINGS[bundle.slug];
    
    if (!productSlugs || productSlugs.length === 0) {
      continue; // Skip bundles without defined mappings
    }
    
    console.log(`\n${bundle.name} (${bundle.slug}):`);
    
    // Get current max display_order
    const { data: maxOrder } = await supabase
      .from('bundle_products')
      .select('display_order')
      .eq('bundle_id', bundle.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let displayOrder = (maxOrder?.display_order ?? -1) + 1;
    let added = 0;
    
    for (const productSlug of productSlugs) {
      const product = productMap.get(productSlug);
      
      if (!product) {
        console.log(`  ⚠️  Product not found: ${productSlug}`);
        continue;
      }
      
      const key = `${bundle.id}-${product.id}`;
      if (existingSet.has(key)) {
        continue; // Already exists
      }
      
      const { error: insertError } = await supabase
        .from('bundle_products')
        .insert({
          bundle_id: bundle.id,
          product_id: product.id,
          display_order: displayOrder++,
        });
      
      if (insertError) {
        console.error(`  ❌ Error adding ${product.name}: ${insertError.message}`);
      } else {
        console.log(`  ✅ Added ${product.name}`);
        existingSet.add(key);
        added++;
        totalAdded++;
      }
    }
    
    if (added === 0) {
      console.log(`  ⏭️  All products already attached`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Added ${totalAdded} products to bundles`);
}

main().catch(console.error);

