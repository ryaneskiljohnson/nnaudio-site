/**
 * @fileoverview Generates SEO metadata for all products
 * @module scripts/generate-seo-metadata
 * 
 * Creates meta_title, meta_description, and meta_keywords for all products
 * based on product name, category, tagline, and description.
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
  tagline: string | null;
  short_description: string | null;
  description: string | null;
}

/**
 * @brief Generates SEO-friendly meta title
 * @param product Product data
 * @returns Meta title (max 60 chars)
 */
function generateMetaTitle(product: Product): string {
  const categoryMap: Record<string, string> = {
    'instrument-plugin': 'VST Plugin',
    'audio-fx-plugin': 'Audio FX Plugin',
    'midi-fx-plugin': 'MIDI FX Plugin',
    'pack': 'Sample Pack',
    'bundle': 'Bundle',
    'application': 'Software'
  };
  
  const categoryLabel = categoryMap[product.category] || 'Plugin';
  
  // Format: "Product Name - Category | NNAudio"
  let title = `${product.name} - ${categoryLabel} | NNAudio`;
  
  // Truncate if too long (max 60 chars is recommended)
  if (title.length > 60) {
    title = `${product.name} | NNAudio`;
  }
  
  return title;
}

/**
 * @brief Generates SEO-friendly meta description
 * @param product Product data
 * @returns Meta description (max 160 chars)
 */
function generateMetaDescription(product: Product): string {
  let description = '';
  
  // Use tagline if available, otherwise use short description, then description
  if (product.tagline) {
    description = product.tagline;
  } else if (product.short_description) {
    description = product.short_description;
  } else if (product.description) {
    // Take first sentence from description
    const firstSentence = product.description.split(/[.!?]/)[0];
    description = firstSentence || product.description;
  }
  
  // Clean and truncate to 160 chars (Google's recommended limit)
  description = description
    .replace(/\s+/g, ' ')
    .trim();
  
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  // Add call to action if space allows
  if (description.length < 140) {
    description += ' Download now from NNAudio.';
  }
  
  return description;
}

/**
 * @brief Generates SEO keywords
 * @param product Product data
 * @returns Array of keywords
 */
function generateMetaKeywords(product: Product): string {
  const keywords: string[] = [];
  
  // Add product name words
  const nameWords = product.name
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3);
  keywords.push(...nameWords);
  
  // Add category-specific keywords
  const categoryKeywords: Record<string, string[]> = {
    'instrument-plugin': ['vst', 'vst3', 'au', 'plugin', 'instrument', 'sampler', 'virtual instrument'],
    'audio-fx-plugin': ['audio', 'fx', 'effect', 'processor', 'vst', 'plugin', 'audio effect'],
    'midi-fx-plugin': ['midi', 'fx', 'effect', 'midi processor', 'midi plugin', 'generative'],
    'pack': ['sample pack', 'samples', 'loops', 'midi', 'sounds', 'midi pack'],
    'bundle': ['bundle', 'collection', 'pack', 'deal', 'discount'],
    'application': ['software', 'app', 'application', 'tool']
  };
  
  const catKeywords = categoryKeywords[product.category] || ['music', 'production'];
  keywords.push(...catKeywords);
  
  // Add generic music production keywords
  keywords.push('music production', 'daw', 'ableton', 'fl studio', 'logic pro');
  
  // Add genre-specific keywords based on description
  const description = (product.description || '').toLowerCase();
  if (description.includes('hip hop') || description.includes('trap')) {
    keywords.push('hip hop', 'trap', 'beats');
  }
  if (description.includes('orchestral') || description.includes('cinematic')) {
    keywords.push('orchestral', 'cinematic', 'film scoring');
  }
  if (description.includes('edm') || description.includes('electronic')) {
    keywords.push('edm', 'electronic', 'dance music');
  }
  
  // Remove duplicates and join
  const uniqueKeywords = Array.from(new Set(keywords));
  return uniqueKeywords.join(', ');
}

/**
 * @brief Updates product with SEO metadata
 */
async function updateProductSEO(product: Product): Promise<boolean> {
  try {
    const metaTitle = generateMetaTitle(product);
    const metaDescription = generateMetaDescription(product);
    const metaKeywords = generateMetaKeywords(product);
    
    const { error } = await supabase
      .from('products')
      .update({
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: metaKeywords,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id);
    
    if (error) throw error;
    
    console.log(`✅ ${product.name}`);
    console.log(`   Title: ${metaTitle} (${metaTitle.length} chars)`);
    console.log(`   Desc:  ${metaDescription.substring(0, 80)}... (${metaDescription.length} chars)`);
    
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
  console.log('\n🔍 Generating SEO metadata for all products...\n');
  
  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, tagline, short_description, description')
    .not('name', 'ilike', '%cymasphere%')
    .order('name');
  
  if (error) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }
  
  if (!products || products.length === 0) {
    console.log('No products found');
    return;
  }
  
  console.log(`Found ${products.length} products\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const product of products) {
    const success = await updateProductSEO(product);
    if (success) {
      updated++;
    } else {
      failed++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SEO METADATA GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${products.length}`);
  console.log(`${'='.repeat(60)}\n`);
}

if (require.main === module) {
  main().catch(console.error);
}
