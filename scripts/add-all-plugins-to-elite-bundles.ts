import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAllPluginsToEliteBundles() {
  console.log('=== Adding All Plugins to Elite Bundles ===\n');

  try {
    // Get elite bundles (bundles with subscription tiers)
    const { data: bundles, error: bundlesError } = await supabase
      .from('bundles')
      .select(`
        id,
        name,
        slug,
        bundle_subscription_tiers(id)
      `);

    if (bundlesError) {
      console.error('Error fetching bundles:', bundlesError);
      return;
    }

    // Filter to elite bundles (those with subscription tiers)
    const eliteBundles = bundles?.filter(b => 
      (b.bundle_subscription_tiers as any[])?.length > 0
    ) || [];

    // Find Ultimate Bundle and Producer's Arsenal
    const ultimateBundle = eliteBundles.find(b => 
      b.name.toLowerCase().includes('ultimate')
    );
    
    const producersArsenal = eliteBundles.find(b => 
      b.name.toLowerCase().includes("producer's") || 
      b.name.toLowerCase().includes('producers')
    );

    if (!ultimateBundle) {
      console.error('Ultimate Bundle not found');
      return;
    }

    if (!producersArsenal) {
      console.error("Producer's Arsenal not found");
      return;
    }

    console.log(`Found Ultimate Bundle: ${ultimateBundle.name} (${ultimateBundle.id})`);
    console.log(`Found Producer's Arsenal: ${producersArsenal.name} (${producersArsenal.id})\n`);

    // Get all plugin products - query each category separately to avoid enum issues
    const allPlugins: Array<{ id: string; name: string; category: string }> = [];
    
    // Try each category separately
    const categories = ['plugin', 'audio-fx-plugin', 'instrument-plugin'];
    
    for (const category of categories) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, category')
          .eq('category', category)
          .eq('status', 'active');
        
        if (!error && data) {
          allPlugins.push(...data);
          console.log(`Found ${data.length} products with category "${category}"`);
        }
      } catch (e) {
        // Category doesn't exist in enum, skip it
        console.log(`Category "${category}" not found in database enum, skipping...`);
      }
    }
    
    // Remove duplicates by id
    const uniquePlugins = Array.from(
      new Map(allPlugins.map(p => [p.id, p])).values()
    );
    
    const plugins = uniquePlugins;
    const pluginsError = null;

    if (pluginsError) {
      console.error('Error fetching plugins:', pluginsError);
      return;
    }

    if (!plugins || plugins.length === 0) {
      console.log('No plugin products found');
      return;
    }

    console.log(`Found ${plugins.length} plugin products\n`);

    // Process Ultimate Bundle
    console.log(`Processing Ultimate Bundle...`);
    await addProductsToBundle(ultimateBundle.id, ultimateBundle.name, plugins);

    // Process Producer's Arsenal
    console.log(`\nProcessing Producer's Arsenal...`);
    await addProductsToBundle(producersArsenal.id, producersArsenal.name, plugins);

    console.log('\n=== Done ===');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

async function addProductsToBundle(
  bundleId: string,
  bundleName: string,
  plugins: Array<{ id: string; name: string; category: string }>
) {
  try {
    // Get existing products in bundle
    const { data: existing, error: existingError } = await supabase
      .from('bundle_products')
      .select('product_id')
      .eq('bundle_id', bundleId);

    if (existingError) {
      console.error(`  ✗ Error fetching existing products:`, existingError);
      return;
    }

    const existingIds = new Set((existing || []).map(e => e.product_id));

    // Filter out plugins that are already in the bundle
    const toAdd = plugins
      .filter(p => !existingIds.has(p.id))
      .map((p, idx) => ({
        bundle_id: bundleId,
        product_id: p.id,
        display_order: idx
      }));

    if (toAdd.length === 0) {
      console.log(`  ✓ All plugins already in ${bundleName}`);
      return;
    }

    console.log(`  Adding ${toAdd.length} plugins to ${bundleName}...`);

    // Add in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < toAdd.length; i += batchSize) {
      const batch = toAdd.slice(i, i + batchSize);
      const { error } = await supabase
        .from('bundle_products')
        .insert(batch);

      if (error) {
        console.error(`  ✗ Error adding batch ${Math.floor(i / batchSize) + 1}:`, error);
      } else {
        console.log(`  ✓ Added batch ${Math.floor(i / batchSize) + 1} (${batch.length} products)`);
      }
    }

    console.log(`  ✓ Successfully added ${toAdd.length} plugins to ${bundleName}`);
  } catch (error) {
    console.error(`  ✗ Error processing ${bundleName}:`, error);
  }
}

addAllPluginsToEliteBundles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

