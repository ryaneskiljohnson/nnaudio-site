/**
 * @fileoverview Removes date references from product and bundle slugs
 * @module scripts/remove-date-references
 * 
 * Removes "xmas-2023", "xmas-2024", year references from slugs to make them timeless.
 * Updates both products and bundles tables.
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

/**
 * @brief Slug mappings for products and bundles
 */
const SLUG_UPDATES: Record<string, string> = {
  // Products
  'cthulhu-bundle-1-xmas-2023': 'cthulhu-bundle-1',
  'cthulhu-bundle-2-xmas-2023': 'cthulhu-bundle-2',
  'guitar-bundle-xmas-2023': 'guitar-bundle',
  'modern-workstation-bundle-xmas-2023': 'modern-workstation-bundle',
  'orchestra-bundle-xmas-2023': 'orchestra-bundle',
  'selection-box-bundle-xmas-2023': 'selection-box-bundle',
  'soundscapes-bundle-xmas-2023': 'soundscapes-bundle',
};

/**
 * @brief Updates a product slug
 */
async function updateProductSlug(oldSlug: string, newSlug: string): Promise<boolean> {
  try {
    // Check if new slug already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, name')
      .eq('slug', newSlug)
      .single();
    
    if (existing) {
      console.log(`⚠️  Slug "${newSlug}" already exists for ${existing.name}`);
      return false;
    }
    
    // Update the product
    const { data, error } = await supabase
      .from('products')
      .update({
        slug: newSlug,
        updated_at: new Date().toISOString()
      })
      .eq('slug', oldSlug)
      .select('name');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`✅ Product: ${data[0].name}`);
      console.log(`   ${oldSlug} → ${newSlug}`);
      return true;
    } else {
      console.log(`⚠️  Product not found: ${oldSlug}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to update product ${oldSlug}:`, error);
    return false;
  }
}

/**
 * @brief Updates a bundle slug
 */
async function updateBundleSlug(oldSlug: string, newSlug: string): Promise<boolean> {
  try {
    // Check if new slug already exists
    const { data: existing } = await supabase
      .from('bundles')
      .select('id, name')
      .eq('slug', newSlug)
      .single();
    
    if (existing) {
      console.log(`⚠️  Bundle slug "${newSlug}" already exists for ${existing.name}`);
      return false;
    }
    
    // Update the bundle
    const { data, error } = await supabase
      .from('bundles')
      .update({
        slug: newSlug,
        updated_at: new Date().toISOString()
      })
      .eq('slug', oldSlug)
      .select('name');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`✅ Bundle: ${data[0].name}`);
      console.log(`   ${oldSlug} → ${newSlug}`);
      return true;
    } else {
      console.log(`⚠️  Bundle not found: ${oldSlug}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to update bundle ${oldSlug}:`, error);
    return false;
  }
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🔧 Removing date references from slugs...\n');
  console.log('This will update slugs to be timeless (no xmas-2023, etc.)\n');
  
  let productsUpdated = 0;
  let bundlesUpdated = 0;
  let failed = 0;
  
  for (const [oldSlug, newSlug] of Object.entries(SLUG_UPDATES)) {
    console.log(`\nProcessing: ${oldSlug}`);
    
    // Try updating product
    const productSuccess = await updateProductSlug(oldSlug, newSlug);
    if (productSuccess) {
      productsUpdated++;
    }
    
    // Try updating bundle
    const bundleSuccess = await updateBundleSlug(oldSlug, newSlug);
    if (bundleSuccess) {
      bundlesUpdated++;
    }
    
    if (!productSuccess && !bundleSuccess) {
      failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SLUG UPDATE COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Products updated: ${productsUpdated}`);
  console.log(`✅ Bundles updated: ${bundlesUpdated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total processed: ${Object.keys(SLUG_UPDATES).length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log('⚠️  IMPORTANT: If you have any external links or bookmarks using old slugs,');
  console.log('   you may want to set up URL redirects in your Next.js middleware.');
}

if (require.main === module) {
  main().catch(console.error);
}
