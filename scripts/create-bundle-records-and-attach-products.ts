import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Creating Bundle Records and Attaching Products ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all products with category='bundle'
  const { data: bundleProducts, error: bundleError } = await supabase
    .from('products')
    .select('id, name, slug, description, short_description, tagline, featured_image_url, logo_url, background_image_url, status')
    .eq('category', 'bundle')
    .order('name');
  
  if (bundleError) {
    console.error('Error fetching bundle products:', bundleError);
    return;
  }
  
  // Get existing bundles
  const { data: existingBundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, slug');
  
  if (bundlesError) {
    console.error('Error fetching existing bundles:', bundlesError);
    return;
  }
  
  const existingBundleSlugs = new Set(existingBundles?.map(b => b.slug) || []);
  
  console.log(`Found ${bundleProducts?.length || 0} bundle products\n`);
  
  let createdCount = 0;
  let skippedCount = 0;
  
  // Create bundle records for products that don't have them
  for (const product of bundleProducts || []) {
    if (existingBundleSlugs.has(product.slug)) {
      console.log(`⏭️  ${product.name}: Bundle record already exists`);
      skippedCount++;
      continue;
    }
    
    // Determine bundle_type based on name/description
    let bundleType = 'custom';
    const nameLower = product.name.toLowerCase();
    const descLower = (product.description || '').toLowerCase();
    
    if (nameLower.includes('midi') || nameLower.includes('loop')) {
      bundleType = 'midi_loops';
    } else if (nameLower.includes('plugin') || nameLower.includes('fx') || nameLower.includes('effect')) {
      bundleType = 'plugins';
    } else if (nameLower.includes('preset')) {
      bundleType = 'presets';
    } else if (nameLower.includes('template')) {
      bundleType = 'templates';
    }
    
    console.log(`Creating bundle record for: ${product.name}`);
    console.log(`  Type: ${bundleType}`);
    
    const { data: bundle, error: createError } = await supabase
      .from('bundles')
      .insert({
        name: product.name,
        slug: product.slug,
        tagline: product.tagline,
        description: product.description,
        short_description: product.short_description,
        bundle_type: bundleType,
        featured_image_url: product.featured_image_url,
        logo_url: product.logo_url,
        background_image_url: product.background_image_url,
        status: product.status === 'active' ? 'active' : 'draft',
      })
      .select()
      .single();
    
    if (createError) {
      console.error(`  ❌ Error: ${createError.message}`);
    } else {
      console.log(`  ✅ Created bundle record: ${bundle.id}`);
      createdCount++;
      existingBundleSlugs.add(product.slug);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Created ${createdCount} bundle records`);
  console.log(`⏭️  Skipped ${skippedCount} (already exist)`);
  console.log(`\n⚠️  Note: Products still need to be manually attached to bundles based on their contents.`);
  console.log(`   Use the admin product edit page to add products to each bundle.`);
}

main().catch(console.error);

