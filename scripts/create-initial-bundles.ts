/**
 * Script to create initial bundles with cool names
 * Run with: tsx scripts/create-initial-bundles.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BundleDefinition {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  short_description: string;
  bundle_type: 'ultimate' | 'plugins' | 'midi_loops' | 'presets' | 'templates';
  pricing: {
    monthly?: { price: number; sale_price?: number };
    annual?: { price: number; sale_price?: number };
    lifetime?: { price: number; sale_price?: number };
  };
}

const bundles: BundleDefinition[] = [
  {
    name: 'Ultimate Bundle',
    slug: 'ultimate-bundle',
    tagline: 'Everything We Make. Forever.',
    description: 'Get access to every single product we\'ve ever created and everything we\'ll ever create. This is the complete NNAudio collection - all plugins, all MIDI packs, all loops, all presets, and all templates. Perfect for producers who want it all.',
    short_description: 'Complete access to all NNAudio products - plugins, MIDI packs, loops, presets, and templates.',
    bundle_type: 'ultimate',
    pricing: {
      monthly: { price: 29.99, sale_price: 24.99 },
      annual: { price: 299.99, sale_price: 249.99 },
      lifetime: { price: 999.99, sale_price: 799.99 },
    },
  },
  {
    name: 'Producer\'s Arsenal',
    slug: 'producers-arsenal',
    tagline: 'Every Plugin. Every Update. Every Time.',
    description: 'Complete access to our entire plugin collection. Get every plugin we\'ve created and every plugin we\'ll create in the future. From synths to effects, from mixing tools to creative processors - it\'s all here.',
    short_description: 'All NNAudio plugins in one subscription. Get every plugin we make, forever.',
    bundle_type: 'plugins',
    pricing: {
      monthly: { price: 19.99, sale_price: 16.99 },
      annual: { price: 199.99, sale_price: 169.99 },
      lifetime: { price: 599.99, sale_price: 499.99 },
    },
  },
  {
    name: 'Beat Lab',
    slug: 'beat-lab',
    tagline: 'Unlimited MIDI & Loops. Infinite Inspiration.',
    description: 'Access to our complete collection of MIDI packs and loops. From hip-hop to electronic, from ambient to aggressive - thousands of professionally crafted MIDI patterns and loops to fuel your creativity.',
    short_description: 'All MIDI packs and loops in one subscription. Thousands of patterns and loops.',
    bundle_type: 'midi_loops',
    pricing: {
      monthly: { price: 14.99, sale_price: 12.99 },
      annual: { price: 149.99, sale_price: 129.99 },
      lifetime: { price: 399.99, sale_price: 349.99 },
    },
  },
];

async function createBundle(bundleDef: BundleDefinition) {
  console.log(`\nCreating bundle: ${bundleDef.name}...`);

  // Create bundle
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .insert({
      name: bundleDef.name,
      slug: bundleDef.slug,
      tagline: bundleDef.tagline,
      description: bundleDef.description,
      short_description: bundleDef.short_description,
      bundle_type: bundleDef.bundle_type,
      status: 'active',
      is_featured: bundleDef.bundle_type === 'ultimate',
      display_order: bundleDef.bundle_type === 'ultimate' ? 1 : 2,
    })
    .select()
    .single();

  if (bundleError) {
    console.error(`Error creating bundle ${bundleDef.name}:`, bundleError);
    return;
  }

  console.log(`✓ Created bundle: ${bundle.name} (${bundle.id})`);

  // Create subscription tiers
  for (const [tier, pricing] of Object.entries(bundleDef.pricing)) {
    if (!pricing) continue;

    const { error: tierError } = await supabase
      .from('bundle_subscription_tiers')
      .insert({
        bundle_id: bundle.id,
        subscription_type: tier,
        price: pricing.price,
        sale_price: pricing.sale_price,
        active: true,
      });

    if (tierError) {
      console.error(`Error creating ${tier} tier:`, tierError);
    } else {
      console.log(`  ✓ Created ${tier} tier: $${pricing.sale_price || pricing.price}`);
    }
  }

  // Add products to bundle based on type
  let productQuery = supabase
    .from('products')
    .select('id, category')
    .eq('status', 'active');

  if (bundleDef.bundle_type === 'plugins') {
    productQuery = productQuery.eq('category', 'plugin');
  } else if (bundleDef.bundle_type === 'midi_loops') {
    productQuery = productQuery.in('category', ['pack']); // Assuming MIDI/loops are in 'pack' category
  } else if (bundleDef.bundle_type === 'ultimate') {
    // Get all products
    productQuery = productQuery;
  }

  const { data: products, error: productsError } = await productQuery;

  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }

  if (!products || products.length === 0) {
    console.log(`  ⚠ No products found for bundle type: ${bundleDef.bundle_type}`);
    return;
  }

  // Add products to bundle
  const bundleProducts = products.map((product, index) => ({
    bundle_id: bundle.id,
    product_id: product.id,
    display_order: index,
  }));

  const { error: bpError } = await supabase
    .from('bundle_products')
    .insert(bundleProducts);

  if (bpError) {
    console.error('Error adding products to bundle:', bpError);
  } else {
    console.log(`  ✓ Added ${products.length} products to bundle`);
  }
}

async function main() {
  console.log('Creating initial bundles...\n');

  for (const bundle of bundles) {
    await createBundle(bundle);
  }

  console.log('\n✓ Bundle creation complete!');
}

main().catch(console.error);

