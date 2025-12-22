import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Define product matching rules for each bundle
const BUNDLE_PRODUCT_RULES: Record<string, {
  keywords: string[];
  categories?: string[];
  exclude?: string[];
}> = {
  'analog-plugin-bundle': {
    keywords: ['analog', 'vintage', 'tape', 'warm', 'saturation'],
    categories: ['audio-fx-plugin', 'instrument-plugin'],
  },
  'all-guitar-bundle': {
    keywords: ['guitar', 'guitars', 'blaque', 'numb'],
    categories: ['instrument-plugin'],
  },
  'guitar-bundle-xmas-2023': {
    keywords: ['guitar', 'guitars', 'blaque', 'numb'],
    categories: ['instrument-plugin'],
  },
  'cthulhu-bundle-1-xmas-2023': {
    keywords: ['cthulhu'],
    categories: ['pack'],
  },
  'cthulhu-bundle-2-xmas-2023': {
    keywords: ['cthulhu'],
    categories: ['pack'],
  },
  'drum-bass-bundle-2': {
    keywords: ['drum', 'bass', 'd&b', 'dnb', 'noker'],
    categories: ['instrument-plugin', 'pack'],
  },
  'drum-perc-bundle': {
    keywords: ['drum', 'perc', 'percussion', 'perc-gadget'],
    categories: ['instrument-plugin', 'pack'],
  },
  'midi-mob-midi-bundle': {
    keywords: ['midi'],
    categories: ['pack'],
  },
  'midi-takeout-bundle': {
    keywords: ['midi'],
    categories: ['pack'],
  },
  'summer-kickoff-midi-bundle': {
    keywords: ['midi'],
    categories: ['pack'],
  },
  '20-for-20-midi-bundle-1': {
    keywords: ['midi'],
    categories: ['pack'],
  },
  'modern-fx-bundle': {
    keywords: ['fx', 'effect', 'delay', 'reverb', 'eq', 'freeq', 'freelay', 'freeverb', 'sterfreeo', 'curves', 'digital-echoes', 'crystal-ball'],
    categories: ['audio-fx-plugin'],
  },
  'modern-song-constructions-bundle': {
    keywords: ['go-to-work', 'the-code', 'ride-away', 'modern-song-constructions'],
    categories: ['pack'],
  },
  'modern-workstation-bundle-xmas-2023': {
    keywords: ['workstation', 'rompl', 'digitaldreamscape'],
    categories: ['instrument-plugin'],
  },
  'orchestra-bundle-xmas-2023': {
    keywords: ['orchestra', 'orchestral', 'prodigious', 'obscura', 'quoir'],
    categories: ['instrument-plugin', 'pack'],
  },
  'orchestral-plugin-bundle': {
    keywords: ['orchestra', 'orchestral', 'prodigious', 'obscura', 'quoir'],
    categories: ['instrument-plugin'],
  },
  'relaunch-plugin-bundle-2': {
    keywords: [],
    categories: ['instrument-plugin', 'audio-fx-plugin'],
  },
  'atmosphere-bundle': {
    keywords: ['atmosphere', 'mesosphere', 'tactures', 'reiya'],
    categories: ['instrument-plugin'],
  },
  'soundscapes-bundle-xmas-2023': {
    keywords: ['atmosphere', 'mesosphere', 'tactures', 'reiya', 'soundscape'],
    categories: ['instrument-plugin'],
  },
  'selection-box-bundle-xmas-2023': {
    keywords: [],
    categories: ['instrument-plugin', 'audio-fx-plugin', 'pack'],
  },
  'summer-sample-pack-bundle': {
    keywords: [],
    categories: ['pack'],
  },
  'blended-bundle-partner': {
    keywords: [],
    categories: ['instrument-plugin', 'audio-fx-plugin'],
  },
  'tetrad-series': {
    keywords: ['tetrad'],
    categories: ['instrument-plugin'],
  },
};

async function main() {
  console.log('=== Attaching Products to Bundles ===\n');
  
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
  
  // Get all active products
  const { data: allProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, category, status')
    .eq('status', 'active')
    .neq('category', 'bundle'); // Exclude bundle products
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  // Get existing bundle_products to avoid duplicates
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
    const rules = BUNDLE_PRODUCT_RULES[bundle.slug];
    
    if (!rules) {
      console.log(`\n⏭️  ${bundle.name}: No matching rules defined`);
      continue;
    }
    
    console.log(`\n${bundle.name} (${bundle.slug}):`);
    
    // Find matching products
    const matchingProducts = (allProducts || []).filter(product => {
      // Check category
      if (rules.categories && rules.categories.length > 0) {
        if (!rules.categories.includes(product.category || '')) {
          return false;
        }
      }
      
      // Check keywords
      if (rules.keywords && rules.keywords.length > 0) {
        const nameLower = product.name.toLowerCase();
        const slugLower = product.slug.toLowerCase();
        const matchesKeyword = rules.keywords.some(keyword => 
          nameLower.includes(keyword.toLowerCase()) || 
          slugLower.includes(keyword.toLowerCase())
        );
        if (!matchesKeyword) {
          return false;
        }
      }
      
      // Check exclusions
      if (rules.exclude) {
        const nameLower = product.name.toLowerCase();
        const slugLower = product.slug.toLowerCase();
        const isExcluded = rules.exclude.some(exclude => 
          nameLower.includes(exclude.toLowerCase()) || 
          slugLower.includes(exclude.toLowerCase())
        );
        if (isExcluded) {
          return false;
        }
      }
      
      return true;
    });
    
    if (matchingProducts.length === 0) {
      console.log(`  ⚠️  No matching products found`);
      continue;
    }
    
    console.log(`  Found ${matchingProducts.length} matching products`);
    
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
    
    for (const product of matchingProducts) {
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
        console.error(`    ❌ Error adding ${product.name}: ${insertError.message}`);
      } else {
        console.log(`    ✅ Added ${product.name}`);
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

