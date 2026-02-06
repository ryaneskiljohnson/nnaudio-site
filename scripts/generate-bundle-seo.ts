/**
 * @fileoverview Generates SEO metadata for bundles table
 * @module scripts/generate-bundle-seo
 * 
 * Creates meta_title, meta_description, and meta_keywords for all bundles
 * based on bundle name, short_description, and description.
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

interface Bundle {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
}

/**
 * @brief Generates SEO-friendly meta title for bundles
 */
function generateMetaTitle(bundle: Bundle): string {
  let title = `${bundle.name} - Bundle | NNAudio`;
  
  // Truncate if too long (max 60 chars is recommended)
  if (title.length > 60) {
    title = `${bundle.name} | NNAudio`;
  }
  
  return title;
}

/**
 * @brief Generates SEO-friendly meta description for bundles
 */
function generateMetaDescription(bundle: Bundle): string {
  let description = '';
  
  // Use tagline if available, otherwise use short description
  if (bundle.tagline) {
    description = bundle.tagline;
  } else if (bundle.short_description) {
    description = bundle.short_description;
  } else if (bundle.description) {
    // Take first sentence from description
    const firstSentence = bundle.description.split(/[.!?]/)[0];
    description = firstSentence || bundle.description;
  }
  
  // Clean and truncate to 160 chars (Google's recommended limit)
  description = description
    .replace(/\s+/g, ' ')
    .trim();
  
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  return description;
}

/**
 * @brief Generates SEO keywords for bundles
 */
function generateMetaKeywords(bundle: Bundle): string[] {
  const keywords: string[] = [];
  
  // Add bundle name words
  const nameWords = bundle.name
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !['bundle'].includes(word));
  keywords.push(...nameWords);
  
  // Add bundle-specific keywords
  keywords.push('bundle', 'collection', 'pack', 'deal', 'save');
  
  // Detect type from name
  const nameLower = bundle.name.toLowerCase();
  
  if (nameLower.includes('midi') && !nameLower.includes('fx')) {
    keywords.push('midi', 'midi pack', 'loops', 'chord progressions', 'melodies');
  }
  
  if (nameLower.includes('guitar')) {
    keywords.push('guitar', 'vst', 'plugin', 'sampled guitar', 'acoustic', 'electric');
  }
  
  if (nameLower.includes('orchestral') || nameLower.includes('orchestra')) {
    keywords.push('orchestral', 'cinematic', 'film scoring', 'strings', 'brass', 'woodwinds');
  }
  
  if (nameLower.includes('drum') || nameLower.includes('perc')) {
    keywords.push('drums', 'percussion', 'samples', 'drum machine', 'beats');
  }
  
  if (nameLower.includes('cthulhu')) {
    keywords.push('trap', 'hip hop', 'dark', 'atmospheric', 'chord progressions');
  }
  
  if (nameLower.includes('fx') || nameLower.includes('effect')) {
    keywords.push('audio effects', 'mixing', 'mastering', 'sound design', 'processors');
  }
  
  if (nameLower.includes('mandelbrot') || nameLower.includes('orbitals')) {
    keywords.push('experimental', 'creative', 'sound design', 'effects processing');
  }
  
  if (nameLower.includes('ultimate') || nameLower.includes('arsenal') || nameLower.includes('producer')) {
    keywords.push('complete', 'everything', 'lifetime', 'subscription', 'all products');
  }
  
  // Add generic production keywords
  keywords.push('music production', 'daw', 'ableton', 'fl studio', 'logic pro', 'producer tools');
  
  // Remove duplicates
  return Array.from(new Set(keywords));
}

/**
 * @brief Updates bundle with SEO metadata
 */
async function updateBundleSEO(bundle: Bundle): Promise<boolean> {
  try {
    const metaTitle = generateMetaTitle(bundle);
    const metaDescription = generateMetaDescription(bundle);
    const metaKeywords = generateMetaKeywords(bundle);
    
    const { error } = await supabase
      .from('bundles')
      .update({
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: metaKeywords,
        updated_at: new Date().toISOString()
      })
      .eq('id', bundle.id);
    
    if (error) throw error;
    
    console.log(`✅ ${bundle.name}`);
    console.log(`   Title: ${metaTitle} (${metaTitle.length} chars)`);
    console.log(`   Desc:  ${metaDescription.substring(0, 80)}... (${metaDescription.length} chars)`);
    console.log(`   Keywords: ${metaKeywords.length} keywords`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${bundle.name}:`, error);
    return false;
  }
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🔍 Generating SEO metadata for all bundles...\n');
  
  // Get all bundles
  const { data: bundles, error } = await supabase
    .from('bundles')
    .select('id, name, slug, tagline, short_description, description')
    .order('name');
  
  if (error) {
    console.error('Failed to fetch bundles:', error);
    process.exit(1);
  }
  
  if (!bundles || bundles.length === 0) {
    console.log('No bundles found');
    return;
  }
  
  console.log(`Found ${bundles.length} bundles\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const bundle of bundles) {
    const success = await updateBundleSEO(bundle);
    if (success) {
      updated++;
    } else {
      failed++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BUNDLE SEO METADATA GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${bundles.length}`);
  console.log(`${'='.repeat(60)}\n`);
}

if (require.main === module) {
  main().catch(console.error);
}
