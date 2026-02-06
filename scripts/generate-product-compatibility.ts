/**
 * @fileoverview Generates compatibility information for all products
 * @module scripts/generate-product-compatibility
 * 
 * Uses Apache Flute as reference for plugins.
 * For MIDI packs: only format and disk space.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
}

/**
 * @brief Standard plugin requirements (based on Apache Flute)
 */
const PLUGIN_REQUIREMENTS = {
  windows: 'Windows 10+',
  mac: 'Mac Mojave 10.14+',
  format: 'VST3 | AU',
  ram: '4GB RAM',
  disk_space: '1GB Disk Space'
};

/**
 * @brief Standard plugin specifications (based on Apache Flute)
 */
const PLUGIN_SPECIFICATIONS = {
  'Format Type': 'VST3 | AU',
  'Operating System': 'Windows 10+, Mac Mojave 10.14+',
  'DAW Compatibility': 'Works with all DAWs except Pro-Tools',
  'System Requirements': '4GB RAM | 1GB Disk Space',
  'Download Size': 'Installer: ~100MB',
  'Delivery Format': 'WIN: EXE | MAC: PKG'
};

/**
 * @brief MIDI pack requirements (minimal: just format and size)
 */
function getPackRequirements(size = '500MB'): object {
  return {
    format: 'MIDI + WAV',
    disk_space: size
  };
}

/**
 * @brief MIDI pack specifications (minimal)
 */
function getPackSpecifications(size = '500MB'): object {
  return {
    'Format': 'MIDI (.mid) + WAV (.wav)',
    'Download Size': size,
    'Compatibility': 'Works with all DAWs'
  };
}

/**
 * @brief Estimate disk space based on product name/description
 */
function estimatePackSize(productName: string): string {
  const name = productName.toLowerCase();
  
  // Large packs
  if (name.includes('ultimate') || name.includes('collection')) {
    return '1-3GB';
  }
  
  // Medium-large packs
  if (name.includes('construction') || name.includes('drums') || name.includes('lofi')) {
    return '500MB-1GB';
  }
  
  // Bundle-style packs
  if (name.includes('cthulhu') && name.includes('godz')) {
    return '600-700MB';
  }
  
  if (name.includes('cthulhu')) {
    return '200-500MB';
  }
  
  // Free/smaller packs
  if (name.includes('free') || name.includes('nerds')) {
    return '250-300MB';
  }
  
  // Default medium size
  return '400-600MB';
}

/**
 * @brief Generate requirements based on category
 */
function generateRequirements(product: Product): object {
  const { category, name } = product;
  
  // Plugins
  if (category === 'instrument-plugin' || 
      category === 'audio-fx-plugin' || 
      category === 'midi-fx-plugin' ||
      category === 'plugin') {
    return PLUGIN_REQUIREMENTS;
  }
  
  // Packs
  if (category === 'pack') {
    const size = estimatePackSize(name);
    return getPackRequirements(size);
  }
  
  // Bundles - depends on content
  if (category === 'bundle') {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('midi') || nameLower.includes('pack')) {
      // MIDI/Pack bundle
      return getPackRequirements('1-5GB');
    } else if (nameLower.includes('plugin') || nameLower.includes('fx') || 
               nameLower.includes('instrument') || nameLower.includes('guitar') ||
               nameLower.includes('orchestral') || nameLower.includes('arsenal') ||
               nameLower.includes('ultimate')) {
      // Plugin bundle
      return PLUGIN_REQUIREMENTS;
    }
    // Mixed bundle
    return {
      ...PLUGIN_REQUIREMENTS,
      note: 'Requirements for plugin components. MIDI/sample content works with all DAWs.'
    };
  }
  
  // Application (NNAudio Access)
  if (category === 'application') {
    return {
      windows: 'Windows 10+',
      mac: 'Mac Mojave 10.14+',
      ram: '2GB RAM',
      disk_space: '100MB Disk Space'
    };
  }
  
  return {};
}

/**
 * @brief Generate specifications based on category
 */
function generateSpecifications(product: Product): object {
  const { category, name } = product;
  
  // Plugins
  if (category === 'instrument-plugin' || 
      category === 'audio-fx-plugin' || 
      category === 'midi-fx-plugin' ||
      category === 'plugin') {
    return PLUGIN_SPECIFICATIONS;
  }
  
  // Packs
  if (category === 'pack') {
    const size = estimatePackSize(name);
    return getPackSpecifications(size);
  }
  
  // Bundles
  if (category === 'bundle') {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('midi') || nameLower.includes('pack')) {
      // MIDI/Pack bundle
      return {
        'Format': 'MIDI (.mid) + WAV (.wav)',
        'Download Size': '1-5GB',
        'Compatibility': 'Works with all DAWs',
        'Content Type': 'MIDI loops, chord progressions, construction kits'
      };
    } else if (nameLower.includes('plugin') || nameLower.includes('fx') || 
               nameLower.includes('instrument') || nameLower.includes('guitar') ||
               nameLower.includes('orchestral') || nameLower.includes('arsenal')) {
      // Plugin bundle
      return {
        ...PLUGIN_SPECIFICATIONS,
        'Bundle Type': 'Multiple VST3/AU plugins'
      };
    }
    // Mixed bundle (like Ultimate Bundle)
    return {
      'Format Type': 'VST3 | AU + MIDI/WAV files',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'DAW Compatibility': 'All major DAWs',
      'System Requirements': '4GB RAM | 2GB+ Disk Space',
      'Bundle Type': 'Complete collection - plugins and content'
    };
  }
  
  // Application
  if (category === 'application') {
    return {
      'Platform': 'Windows & Mac',
      'Operating System': 'Windows 10+, Mac Mojave 10.14+',
      'System Requirements': '2GB RAM | 100MB Disk Space',
      'Purpose': 'Product management and download center'
    };
  }
  
  return {};
}

/**
 * @brief Updates product with compatibility info
 */
async function updateProductCompatibility(product: Product): Promise<boolean> {
  try {
    const requirements = generateRequirements(product);
    const specifications = generateSpecifications(product);
    
    // Skip if both are empty
    if (Object.keys(requirements).length === 0 && Object.keys(specifications).length === 0) {
      console.log(`⚠️  ${product.name} - No compatibility data generated`);
      return false;
    }
    
    const { error } = await supabase
      .from('products')
      .update({
        requirements,
        specifications,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id);
    
    if (error) throw error;
    
    console.log(`✅ ${product.name}`);
    if (product.category === 'pack') {
      console.log(`   Format: MIDI + WAV | Size: ${(requirements as any).disk_space || 'various'}`);
    } else {
      console.log(`   ${product.category} | ${JSON.stringify(requirements).substring(0, 60)}...`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${product.name}:`, error);
    return false;
  }
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🔧 Generating Product Compatibility Information\n');
  console.log('Using Apache Flute as reference for plugins...\n');
  
  // Get all products with empty requirements/specifications
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, requirements, specifications')
    .not('name', 'ilike', '%cymasphere%')
    .order('category, name');
  
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }
  
  // Filter to products with empty requirements/specifications
  const productsNeedingUpdate = products.filter((p: any) => {
    const reqEmpty = !p.requirements || Object.keys(p.requirements).length === 0;
    const specEmpty = !p.specifications || Object.keys(p.specifications).length === 0;
    return reqEmpty || specEmpty;
  });
  
  console.log(`Found ${productsNeedingUpdate.length} products needing compatibility info\n`);
  
  const byCategory: Record<string, number> = {};
  productsNeedingUpdate.forEach((p: any) => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });
  
  console.log('Breakdown by category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  console.log('');
  
  let updated = 0;
  let failed = 0;
  
  for (const product of productsNeedingUpdate) {
    const success = await updateProductCompatibility(product);
    if (success) {
      updated++;
    } else {
      failed++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`COMPATIBILITY GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${productsNeedingUpdate.length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log('Summary by category:');
  console.log('  Plugins: VST3 | AU | Windows 10+ | Mac 10.14+');
  console.log('  Packs: MIDI + WAV format | Disk space listed');
  console.log('  Bundles: Varies by content type');
  console.log('');
}

if (require.main === module) {
  main().catch(console.error);
}
