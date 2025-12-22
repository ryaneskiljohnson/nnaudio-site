import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function createTetradBundle() {
  console.log('=== Creating Tetrad Bundle ===\n');

  const supabase = await createAdminClient();

  // 1. Get the 3 Tetrad products
  const { data: tetradProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, price')
    .in('slug', ['tetrad-keys', 'tetrad-guitars', 'tetrad-winds'])
    .order('name');

  if (productsError || !tetradProducts || tetradProducts.length !== 3) {
    console.error('❌ Error fetching Tetrad products:', productsError);
    console.error(`   Found ${tetradProducts?.length || 0} products (expected 3)`);
    return;
  }

  console.log(`Found ${tetradProducts.length} Tetrad products:`);
  tetradProducts.forEach((p) => {
    console.log(`  - ${p.name} (${p.slug}) - $${p.price}`);
  });

  // Calculate total value
  const totalValue = tetradProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const bundlePrice = Math.round(totalValue * 0.75); // 25% discount
  const savings = totalValue - bundlePrice;
  const discountPercent = Math.round((savings / totalValue) * 100);

  console.log(`\nTotal Value: $${totalValue.toFixed(2)}`);
  console.log(`Bundle Price: $${bundlePrice.toFixed(2)} (${discountPercent}% off)`);
  console.log(`Savings: $${savings.toFixed(2)}\n`);

  // 2. Check if bundle already exists
  const { data: existingBundle } = await supabase
    .from('bundles')
    .select('id, name, slug')
    .eq('slug', 'tetrad-bundle')
    .single();

  if (existingBundle) {
    console.log(`⚠️  Bundle "Tetrad Bundle" already exists (${existingBundle.id})`);
    console.log('   Updating existing bundle...\n');
    
    // Update existing bundle
    const { error: updateError } = await supabase
      .from('bundles')
      .update({
        name: 'Tetrad Bundle',
        tagline: 'Complete Blended Instrument Collection',
        short_description: 'Get all three Tetrad plugins - Keys, Guitars, and Winds - in one complete bundle. Save 25% when you buy the complete collection.',
        description: `Get all three Tetrad plugins - Keys, Guitars, and Winds - in one complete bundle. Save ${discountPercent}% when you buy the complete collection.

The Tetrad Bundle includes:

**Tetrad Keys** - Unleash the soulful resonance of blended keys, fusing the warmth of analog keys, the precision of digital synths, and the authenticity of live-recorded piano.

**Tetrad Guitars** - Dive into the world of blended guitars, where analog, digital, and live-recorded guitar tones converge to create a rich palette of sounds.

**Tetrad Winds** - Redefine wind instrument emulation by combining the nuances of analog, digital, and live-recorded wind instruments in a single plugin.

Each plugin features four sound engines that you can blend together, individually editable controls, and built-in FX modules for comprehensive sound design.`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingBundle.id);

    if (updateError) {
      console.error('❌ Error updating bundle:', updateError);
      return;
    }

    // Clear existing bundle products and add new ones
    const { error: deleteError } = await supabase
      .from('bundle_products')
      .delete()
      .eq('bundle_id', existingBundle.id);

    if (deleteError) {
      console.error('❌ Error clearing bundle products:', deleteError);
      return;
    }

    // Add products to bundle
    const bundleProducts = tetradProducts.map((product, index) => ({
      bundle_id: existingBundle.id,
      product_id: product.id,
      display_order: index,
    }));

    const { error: insertError } = await supabase
      .from('bundle_products')
      .insert(bundleProducts);

    if (insertError) {
      console.error('❌ Error adding products to bundle:', insertError);
      return;
    }

    // Check if pricing tier exists, create if not
    const { data: existingTier } = await supabase
      .from('bundle_subscription_tiers')
      .select('id')
      .eq('bundle_id', existingBundle.id)
      .eq('subscription_type', 'lifetime')
      .single();

    if (!existingTier) {
      const { error: tierError } = await supabase
        .from('bundle_subscription_tiers')
        .insert({
          bundle_id: existingBundle.id,
          subscription_type: 'lifetime',
          price: bundlePrice,
          sale_price: bundlePrice,
          active: true,
        });

      if (tierError) {
        console.error('❌ Error creating bundle pricing:', tierError);
      } else {
        console.log(`✅ Created bundle pricing: $${bundlePrice.toFixed(2)} (lifetime)`);
      }
    }

    console.log(`✅ Updated bundle: Tetrad Bundle (${existingBundle.id})`);
    console.log(`   Added ${tetradProducts.length} products to bundle\n`);
    return;
  }

  // 3. Create the bundle
  console.log('Creating new bundle...');
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .insert({
      name: 'Tetrad Bundle',
      slug: 'tetrad-bundle',
      tagline: 'Complete Blended Instrument Collection',
      short_description: 'Get all three Tetrad plugins - Keys, Guitars, and Winds - in one complete bundle. Save 25% when you buy the complete collection.',
      description: `Get all three Tetrad plugins - Keys, Guitars, and Winds - in one complete bundle. Save ${discountPercent}% when you buy the complete collection.

The Tetrad Bundle includes:

**Tetrad Keys** - Unleash the soulful resonance of blended keys, fusing the warmth of analog keys, the precision of digital synths, and the authenticity of live-recorded piano.

**Tetrad Guitars** - Dive into the world of blended guitars, where analog, digital, and live-recorded guitar tones converge to create a rich palette of sounds.

**Tetrad Winds** - Redefine wind instrument emulation by combining the nuances of analog, digital, and live-recorded wind instruments in a single plugin.

Each plugin features four sound engines that you can blend together, individually editable controls, and built-in FX modules for comprehensive sound design.`,
      bundle_type: 'plugins',
      status: 'active',
      is_featured: false,
      display_order: 0,
    })
    .select()
    .single();

  if (bundleError) {
    console.error('❌ Error creating bundle:', bundleError);
    return;
  }

  console.log(`✅ Created bundle: ${bundle.name} (${bundle.id})\n`);

  // 4. Add products to bundle
  console.log('Adding products to bundle...');
  const bundleProducts = tetradProducts.map((product, index) => ({
    bundle_id: bundle.id,
    product_id: product.id,
    display_order: index,
  }));

  const { error: insertError } = await supabase
    .from('bundle_products')
    .insert(bundleProducts);

  if (insertError) {
    console.error('❌ Error adding products to bundle:', insertError);
    return;
  }

  console.log(`✅ Added ${tetradProducts.length} products to bundle\n`);

  // 5. Create bundle subscription tiers (one-time purchase pricing)
  console.log('Creating bundle pricing...');
  const { error: tierError } = await supabase
    .from('bundle_subscription_tiers')
    .insert({
      bundle_id: bundle.id,
      subscription_type: 'lifetime',
      price: bundlePrice,
      sale_price: bundlePrice, // Same as regular price for now
      active: true,
    });

  if (tierError) {
    console.error('❌ Error creating bundle pricing:', tierError);
    return;
  }

  console.log(`✅ Created bundle pricing: $${bundlePrice.toFixed(2)} (lifetime)\n`);

  console.log('✅ Successfully created Tetrad Bundle!');
  console.log(`\nBundle Summary:`);
  console.log(`  Name: Tetrad Bundle`);
  console.log(`  Slug: tetrad-bundle`);
  console.log(`  Products: ${tetradProducts.length}`);
  console.log(`  Total Value: $${totalValue.toFixed(2)}`);
  console.log(`  Bundle Price: $${bundlePrice.toFixed(2)}`);
  console.log(`  Savings: $${savings.toFixed(2)} (${discountPercent}%)`);
}

createTetradBundle().catch(console.error);

