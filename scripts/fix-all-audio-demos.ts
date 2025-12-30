import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAllAudioDemos() {
  console.log('🔧 Fixing audio demos for all products...\n');

  // Fetch all products with audio samples
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .order('name');

  if (error || !products) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  let fixedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    if (!product.audio_samples || product.audio_samples.length === 0) {
      console.log(`⏭️  Skipping ${product.name} - no audio samples`);
      skippedCount++;
      continue;
    }

    // Generate search patterns from product name and slug
    const productNameLower = product.name.toLowerCase();
    const productSlugLower = product.slug.toLowerCase();
    
    // Remove common words that might cause false matches
    const wordsToRemove = ['bundle', 'midi', 'pack', 'free', 'plugin', 'audio', 'the', '&', 'and'];
    let cleanName = productNameLower;
    wordsToRemove.forEach(word => {
      cleanName = cleanName.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });
    cleanName = cleanName.trim().replace(/\s+/g, '-');
    
    // Create variations of the name to match
    const nameVariations = [
      cleanName,
      productSlugLower,
      productNameLower.replace(/\s+/g, '-'),
      productNameLower.replace(/\s+/g, ''),
    ].filter(v => v.length > 3); // Only keep meaningful patterns
    
    // Filter audio samples to keep only those matching this product
    const correctSamples = product.audio_samples.filter((sample: any) => {
      const fileName = (sample.file_name || sample.name || '').toLowerCase();
      
      // Check if filename matches any variation
      return nameVariations.some(variant => {
        // Must contain the variant and not be from another product
        return fileName.includes(variant);
      });
    });

    // Skip if we're keeping all samples (nothing to fix)
    if (correctSamples.length === product.audio_samples.length) {
      console.log(`✅ ${product.name} - already correct (${correctSamples.length} samples)`);
      continue;
    }

    // Skip if we're removing everything (need manual review)
    if (correctSamples.length === 0) {
      console.log(`⚠️  ${product.name} - would remove all samples, needs manual review`);
      skippedCount++;
      continue;
    }

    console.log(`\n🔧 Fixing ${product.name}:`);
    console.log(`   Was: ${product.audio_samples.length} samples`);
    console.log(`   Now: ${correctSamples.length} samples`);
    console.log(`   Keeping:`);
    correctSamples.forEach((s: any, i: number) => {
      console.log(`      ${i + 1}. ${s.file_name || s.name}`);
    });

    // Update the product
    const { error: updateError } = await supabase
      .from('products')
      .update({ audio_samples: correctSamples })
      .eq('id', product.id);

    if (updateError) {
      console.error(`   ❌ Error updating: ${updateError.message}`);
      continue;
    }

    console.log(`   ✅ Updated successfully`);
    fixedCount++;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY:`);
  console.log(`   Total Products: ${products.length}`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Already Correct: ${products.length - fixedCount - skippedCount}`);
}

fixAllAudioDemos().catch(console.error);
