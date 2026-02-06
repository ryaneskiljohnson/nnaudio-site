/**
 * @fileoverview Generate background images for products and upload to Supabase
 * @module scripts/generate-product-backgrounds
 * 
 * Creates relevant, wide banner-style background images for products that don't have them.
 * Uses AI image generation and uploads to Supabase storage.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
}

interface ImagePrompt {
  productId: string;
  productName: string;
  slug: string;
  prompt: string;
  filename: string;
}

/**
 * @brief Creates an image prompt based on product details
 */
function createPrompt(product: Product): string {
  const name = product.name;
  const tagline = product.tagline || '';
  const desc = product.short_description || '';
  
  // Base style for all images
  const baseStyle = 'Wide cinematic banner format, professional music production aesthetic, abstract and atmospheric, dark gradient background with purple and teal accents, modern and sleek, high quality';
  
  // Category-specific themes
  let theme = '';
  
  if (product.category.includes('instrument') || product.category === 'plugin') {
    if (name.includes('Cowboy') || name.includes('Harp')) {
      theme = 'Western desert landscape at sunset, old west atmosphere, guitar strings, horseshoe, rustic wood textures';
    } else if (name.includes('Game Boi')) {
      theme = '8-bit pixel art aesthetic, retro gaming console, pixelated waveforms, nostalgic 90s gaming vibes, neon grid';
    } else if (name.includes('Strange Tingz')) {
      theme = '1980s retro aesthetic, neon lights, VHS grain effect, synthwave sunset, vintage synthesizers and cassette tapes';
    } else if (name.includes('Cthulhu')) {
      theme = 'Dark mystical atmosphere, chord progressions visualized as geometric patterns, cosmic horror aesthetic, deep purple and black gradients';
    } else {
      theme = 'Musical instrument silhouettes, sound waves, frequency spectrum, studio equipment abstract';
    }
  } else if (product.category.includes('audio-fx')) {
    if (name.includes('Delay') || name.includes('Freelay')) {
      theme = 'Time-based effects visualization, echoing waveforms, repeating patterns in space, delay trails';
    } else if (name.includes('EQ') || name.includes('FreeQ')) {
      theme = 'Frequency spectrum curves, EQ bands visualization, colorful frequency waves, audio spectrum analyzer';
    } else if (name.includes('Reverb') || name.includes('Freeverb')) {
      theme = 'Spacious cathedral interior, sound waves expanding outward, ethereal atmosphere, reverb trails';
    } else if (name.includes('Stereo') || name.includes('Sterfreeo')) {
      theme = 'Stereo field visualization, left and right channels, width expansion, spatial audio waves';
    } else {
      theme = 'Audio effects visualization, waveform manipulation, signal processing abstract';
    }
  } else if (product.category === 'pack') {
    if (name.includes('MIDI')) {
      theme = 'Piano roll grid, MIDI notes visualization, musical notation, chord progressions, modern DAW interface aesthetic';
    } else if (name.includes('Cthulhu')) {
      theme = 'Dark mystical presets, chord progression patterns, cosmic elements, deep space nebula with purple tones';
    } else if (name.includes('Modern')) {
      theme = 'Contemporary music production studio, modern beats visualization, trap aesthetic, urban atmosphere';
    } else {
      theme = 'Sample pack visualization, waveforms, musical elements, production studio aesthetic';
    }
  } else if (product.category === 'bundle') {
    theme = 'Collection of musical elements, variety of instruments and effects, comprehensive toolkit visualization, studio arsenal';
  } else if (product.category === 'application') {
    theme = 'Software interface elements, digital workspace, modern app design, productivity and organization';
  }
  
  return `${theme}, ${baseStyle}`;
}

/**
 * @brief Main execution function
 */
async function main() {
  console.log('\n🎨 Generating Product Background Images\n');
  console.log('This script will:');
  console.log('1. Generate prompts for each product');
  console.log('2. Save prompts to JSON for review');
  console.log('3. You can then run image generation in batches\n');
  
  // Fetch products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, tagline, short_description, description')
    .or('background_image_url.is.null,background_image_url.eq.')
    .or('background_video_url.is.null,background_video_url.eq.')
    .eq('status', 'active')
    .order('category, name');
  
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }
  
  console.log(`Found ${products.length} products without background images\n`);
  
  // Generate prompts
  const prompts: ImagePrompt[] = products.map(product => ({
    productId: product.id,
    productName: product.name,
    slug: product.slug,
    prompt: createPrompt(product),
    filename: `${product.slug}-background.png`
  }));
  
  // Save prompts to file
  const outputDir = 'generated-backgrounds';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'image-prompts.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), prompts }, null, 2)
  );
  
  console.log(`✅ Prompts saved to: ${outputDir}/image-prompts.json`);
  console.log(`\nSample prompts:\n`);
  
  prompts.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.productName}`);
    console.log(`   ${p.prompt.substring(0, 100)}...`);
    console.log('');
  });
  
  console.log(`\nNext steps:`);
  console.log(`1. Review prompts in ${outputDir}/image-prompts.json`);
  console.log(`2. Run image generation (will be done via MCP tool)`);
  console.log(`3. Upload to Supabase storage`);
  console.log(`4. Update products table\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { createPrompt };
