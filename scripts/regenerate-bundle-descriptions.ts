/**
 * @fileoverview Regenerates bundle descriptions based on actual bundle contents
 * @module scripts/regenerate-bundle-descriptions
 * 
 * Queries the bundle_products table to get accurate product lists,
 * then generates appropriate descriptions for each bundle.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

interface BundleData {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  product_names: string[];
  product_categories: string;
}

interface ProductSummary {
  instruments: string[];
  audioFx: string[];
  midiFx: string[];
  packs: string[];
  total: number;
}

/**
 * @brief Analyzes bundle products and categorizes them
 */
function analyzeProducts(productNames: string[], productCategoriesStr: string): ProductSummary {
  const categories = productCategoriesStr.replace(/[{}]/g, '').split(',');
  
  const summary: ProductSummary = {
    instruments: [],
    audioFx: [],
    midiFx: [],
    packs: [],
    total: productNames.length
  };
  
  productNames.forEach((name, idx) => {
    const category = categories[idx];
    
    if (category === 'instrument-plugin') {
      summary.instruments.push(name);
    } else if (category === 'audio-fx-plugin') {
      summary.audioFx.push(name);
    } else if (category === 'midi-fx-plugin') {
      summary.midiFx.push(name);
    } else if (category === 'pack') {
      summary.packs.push(name);
    }
  });
  
  return summary;
}

/**
 * @brief Generates short description for a bundle
 */
function generateShortDescription(bundle: BundleData, summary: ProductSummary): string {
  const { name, product_count } = bundle;
  const { instruments, audioFx, midiFx, packs } = summary;
  
  // Special cases for known bundles
  if (name === 'Producer\'s Arsenal') {
    return 'Complete access to all NNAudio plugins. Every instrument, every effect, every update - forever.';
  }
  
  if (name === 'Ultimate Bundle') {
    return 'Complete access to everything NNAudio makes - all plugins, all MIDI packs, all samples, forever.';
  }
  
  if (name === 'Beat Lab') {
    return 'Unlimited access to all NNAudio MIDI packs and loops. Thousands of patterns across every genre.';
  }
  
  // Build description based on contents
  const parts: string[] = [];
  
  if (instruments.length > 0) {
    parts.push(`${instruments.length} instrument plugin${instruments.length > 1 ? 's' : ''}`);
  }
  if (audioFx.length > 0) {
    parts.push(`${audioFx.length} audio FX plugin${audioFx.length > 1 ? 's' : ''}`);
  }
  if (midiFx.length > 0) {
    parts.push(`${midiFx.length} MIDI FX plugin${midiFx.length > 1 ? 's' : ''}`);
  }
  if (packs.length > 0) {
    parts.push(`${packs.length} pack${packs.length > 1 ? 's' : ''}`);
  }
  
  const contentSummary = parts.join(', ').replace(/, ([^,]*)$/, ' and $1');
  
  // Generate theme-based description
  let theme = '';
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('cthulhu')) {
    theme = 'dark, atmospheric MIDI packs inspired by modern trap and hip-hop productions';
  } else if (nameLower.includes('guitar')) {
    theme = 'premium sampled guitar instruments for authentic acoustic and electric tones';
  } else if (nameLower.includes('orchestral') || nameLower.includes('orchestra')) {
    theme = 'professional orchestral instruments for cinematic and film scoring';
  } else if (nameLower.includes('drum') || nameLower.includes('perc')) {
    theme = 'powerful drum and percussion tools for rhythm production';
  } else if (nameLower.includes('midi') && !nameLower.includes('fx')) {
    theme = 'diverse MIDI content covering multiple genres and production styles';
  } else if (nameLower.includes('fx')) {
    theme = 'essential audio effects for mixing and sound design';
  } else if (nameLower.includes('atmosphere') || nameLower.includes('soundscape')) {
    theme = 'atmospheric instruments perfect for ambient and cinematic productions';
  } else if (nameLower.includes('mandelbrot') || nameLower.includes('orbitals')) {
    theme = 'innovative effects for experimental sound design and creative processing';
  } else if (nameLower.includes('tetrad')) {
    theme = 'blended multi-sampled instruments combining analog warmth with modern clarity';
  } else if (nameLower.includes('workstation')) {
    theme = 'versatile multi-engine instruments for modern production workflows';
  } else if (nameLower.includes('analog')) {
    theme = 'warm, organic instruments with authentic analog character';
  }
  
  if (theme) {
    return `Complete collection featuring ${contentSummary}: ${theme}.`;
  }
  
  return `Complete bundle featuring ${contentSummary}.`;
}

/**
 * @brief Generates full description for a bundle
 */
function generateFullDescription(bundle: BundleData, summary: ProductSummary): string {
  const { name, product_count } = bundle;
  const { instruments, audioFx, midiFx, packs } = summary;
  
  let description = '';
  
  // Opening paragraph
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('cthulhu')) {
    description = `Explore the darker side of modern production with ${product_count} carefully curated packs. `;
    description += `This collection captures the atmospheric, moody aesthetic that defines contemporary trap and hip-hop. `;
  } else if (nameLower.includes('guitar')) {
    description = `Get authentic guitar sounds with ${instruments.length} professional sampled instruments. `;
    description += `From fingerpicked acoustics to heavy electric tones, this bundle covers all your guitar needs. `;
  } else if (nameLower.includes('orchestral') || nameLower.includes('orchestra')) {
    description = `Create cinematic orchestral arrangements with ${instruments.length} professional instruments. `;
    description += `Perfect for film scoring, game music, and epic productions requiring authentic orchestral sounds. `;
  } else if (nameLower.includes('drum') && nameLower.includes('bass')) {
    description = `Build powerful drum and bass tracks with specialized production tools. `;
    description += `This bundle combines cutting bass synthesis with comprehensive drum libraries for professional DnB productions. `;
  } else if (nameLower.includes('drum') || nameLower.includes('perc')) {
    description = `Elevate your rhythm section with professional percussion tools. `;
    description += `This collection provides everything from innovative rhythm generators to extensive sample libraries. `;
  } else if (nameLower.includes('midi takeout') || nameLower.includes('midi mob')) {
    description = `Massive MIDI collection featuring ${product_count} premium packs with thousands of loops and progressions. `;
    description += `From chord progressions to melodies, this bundle covers every genre and production style. `;
  } else if (nameLower.includes('summer')) {
    description = `Comprehensive collection perfect for summer productions featuring ${product_count} packs. `;
    description += `Bright, uplifting content spanning multiple genres to keep your creativity flowing all season. `;
  } else if (nameLower.includes('mandelbrot')) {
    description = `Complete collection of ${audioFx.length} quantum-inspired audio effects plugins. `;
    description += `Push the boundaries of sound design with fractal-based processing and experimental audio manipulation. `;
  } else if (nameLower.includes('orbitals')) {
    description = `Full suite of ${midiFx.length} orbital MIDI FX plugins for transformative MIDI processing. `;
    description += `Shape your MIDI performances with gravitational effects, rhythmic orbits, and dynamic velocity control. `;
  } else if (nameLower.includes('tetrad')) {
    description = `The Tetrad Series combines analog warmth, digital precision, and organic sampling across ${instruments.length} instruments. `;
    description += `Each plugin features multiple layers that blend seamlessly for rich, expressive tones. `;
  } else if (nameLower.includes('atmosphere') || nameLower.includes('soundscape')) {
    description = `Create immersive atmospheric textures with ${instruments.length} specialized instruments. `;
    description += `Perfect for ambient, cinematic, and experimental music requiring evolving soundscapes. `;
  } else if (nameLower.includes('workstation')) {
    description = `Two powerful multi-engine workstation instruments for modern production. `;
    description += `Extensive sound libraries and flexible engines provide everything from classic sounds to cutting-edge synthesis. `;
  } else if (nameLower.includes('analog')) {
    description = `Experience authentic analog character with ${instruments.length} carefully sampled instruments. `;
    description += `Warm, organic tones perfect for adding vintage flavor to modern productions. `;
  } else if (name === 'Producer\'s Arsenal') {
    description = `Get instant access to NNAudio's complete plugin collection - every instrument and effect we've ever made. `;
    description += `This subscription includes all future updates and new releases, ensuring you always have the latest tools. `;
  } else if (name === 'Ultimate Bundle') {
    description = `The complete NNAudio library in one bundle - every plugin, every pack, every sample. `;
    description += `This is our most comprehensive offering, providing unlimited access to our entire catalog plus all future releases. `;
  } else if (name === 'Beat Lab') {
    description = `Unlimited access to NNAudio's complete MIDI library with thousands of loops and patterns. `;
    description += `From hip-hop to EDM, from ambient to trap, this subscription keeps your MIDI folder fresh with constant updates. `;
  } else {
    description = `This comprehensive bundle brings together ${product_count} carefully selected products. `;
    if (instruments.length > 0) {
      description += `Includes ${instruments.length} instrument${instruments.length > 1 ? 's' : ''} `;
    }
    if (packs.length > 0) {
      description += `and ${packs.length} pack${packs.length > 1 ? 's' : ''} `;
    }
    description += `for complete creative flexibility. `;
  }
  
  // Second paragraph - value proposition
  description += `\n\n`;
  
  if (product_count >= 50) {
    description += `With ${product_count} products included, this bundle offers exceptional value and comprehensive coverage. `;
  } else if (product_count >= 20) {
    description += `Save significantly compared to individual purchases while getting ${product_count} essential tools. `;
  } else if (product_count >= 10) {
    description += `This curated selection of ${product_count} products provides excellent value and creative versatility. `;
  } else {
    description += `Each product has been carefully chosen to work together, providing a focused and cohesive toolkit. `;
  }
  
  if (instruments.length > 0 && packs.length > 0) {
    description += `The combination of instruments and content packs gives you both the tools and the inspiration to create immediately.`;
  } else if (instruments.length > 0) {
    description += `All instruments are professionally sampled and optimized for modern DAW workflows.`;
  } else if (packs.length > 0) {
    description += `All content is royalty-free and ready to drag and drop into your productions.`;
  } else if (audioFx.length > 0 || midiFx.length > 0) {
    description += `Each plugin is CPU-efficient and designed to integrate seamlessly into your production workflow.`;
  }
  
  return description;
}

/**
 * @brief Updates bundle descriptions in both products and bundles tables
 */
async function updateBundle(bundle: BundleData): Promise<boolean> {
  try {
    const summary = analyzeProducts(bundle.product_names, bundle.product_categories);
    const shortDesc = generateShortDescription(bundle, summary);
    const fullDesc = generateFullDescription(bundle, summary);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📦 ${bundle.name}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Products: ${bundle.product_count}`);
    console.log(`  - Instruments: ${summary.instruments.length}`);
    console.log(`  - Audio FX: ${summary.audioFx.length}`);
    console.log(`  - MIDI FX: ${summary.midiFx.length}`);
    console.log(`  - Packs: ${summary.packs.length}`);
    console.log(`\nShort Description (${shortDesc.length} chars):`);
    console.log(`  ${shortDesc}`);
    console.log(`\nFull Description (${fullDesc.length} chars):`);
    console.log(`  ${fullDesc.substring(0, 150)}...`);
    
    // Update bundles table
    const { error: bundleError } = await supabase
      .from('bundles')
      .update({
        short_description: shortDesc,
        description: fullDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', bundle.id);
    
    if (bundleError) {
      console.error(`❌ Failed to update bundles table:`, bundleError);
      return false;
    }
    
    // Update products table (find matching product by slug)
    const { data: productMatch, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', bundle.slug)
      .eq('category', 'bundle')
      .single();
    
    if (findError || !productMatch) {
      console.log(`⚠️  No matching product found in products table`);
      return true; // Not a failure - bundle might not be in products table
    }
    
    const { error: productError } = await supabase
      .from('products')
      .update({
        short_description: shortDesc,
        description: fullDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', productMatch.id);
    
    if (productError) {
      console.error(`❌ Failed to update products table:`, productError);
      return false;
    }
    
    console.log(`✅ Updated both bundles and products tables`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${bundle.name}:`, error);
    return false;
  }
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🔄 Regenerating Bundle Descriptions Based on Actual Contents\n');
  console.log('This will update descriptions in both bundles and products tables.\n');
  
  // Get all bundles with their actual products
  const { data: bundles, error } = await supabase.rpc('get_bundle_contents' as any, {}) as any;
  
  // If RPC doesn't exist, fall back to manual query
  const query = `
    SELECT 
      b.id,
      b.name,
      b.slug,
      COUNT(bp.product_id) as product_count,
      ARRAY_AGG(p.name ORDER BY p.name) as product_names,
      ARRAY_AGG(p.category ORDER BY p.name) as product_categories
    FROM bundles b
    LEFT JOIN bundle_products bp ON b.id = bp.bundle_id
    LEFT JOIN products p ON bp.product_id = p.id
    GROUP BY b.id, b.name, b.slug
    HAVING COUNT(bp.product_id) > 0
    ORDER BY b.name
  `;
  
  const { data: bundlesData, error: queryError } = await supabase.rpc('exec_sql' as any, { query }) as any;
  
  // Direct query as fallback
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey!,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ query })
  });
  
  // Use direct SQL query instead
  const { data, error: sqlError } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      slug
    `)
    .order('name');
  
  if (sqlError || !data) {
    console.error('Failed to fetch bundles:', sqlError);
    process.exit(1);
  }
  
  console.log(`Found ${data.length} bundles\n`);
  
  // For each bundle, get its products
  const results: { bundle: string; success: boolean }[] = [];
  
  for (const bundle of data) {
    // Get products for this bundle
    const { data: bundleProducts, error: bpError } = await supabase
      .from('bundle_products')
      .select(`
        product:products(name, category)
      `)
      .eq('bundle_id', bundle.id);
    
    if (bpError || !bundleProducts) {
      console.error(`Failed to fetch products for ${bundle.name}`);
      results.push({ bundle: bundle.name, success: false });
      continue;
    }
    
    const products = bundleProducts.map((bp: any) => bp.product).filter(Boolean);
    
    const bundleData: BundleData = {
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      product_count: products.length,
      product_names: products.map((p: any) => p.name),
      product_categories: `{${products.map((p: any) => p.category).join(',')}}`
    };
    
    if (bundleData.product_count === 0) {
      console.log(`⚠️  Skipping ${bundle.name} - no products`);
      continue;
    }
    
    const success = await updateBundle(bundleData);
    results.push({ bundle: bundle.name, success });
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`BUNDLE DESCRIPTION REGENERATION COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Save log
  const log = {
    timestamp: new Date().toISOString(),
    results,
    summary: { successful, failed, total: results.length }
  };
  
  fs.writeFileSync(
    'bundle-description-regeneration-log.json',
    JSON.stringify(log, null, 2)
  );
  
  console.log('📝 Detailed log saved to: bundle-description-regeneration-log.json\n');
}

if (require.main === module) {
  main().catch(console.error);
}
