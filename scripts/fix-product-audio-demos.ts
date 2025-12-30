import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProductAudioDemos(productSlug: string, correctFileNames: string[]) {
  console.log(`\n🔧 Fixing audio demos for: ${productSlug}`);
  console.log(`   Keeping only: ${correctFileNames.join(', ')}\n`);

  // Fetch the product
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, name, audio_samples')
    .eq('slug', productSlug)
    .single();

  if (fetchError || !product) {
    console.error('❌ Error fetching product:', fetchError);
    return;
  }

  console.log(`📦 Product: ${product.name}`);
  console.log(`   Current audio samples: ${product.audio_samples?.length || 0}`);

  if (!product.audio_samples || product.audio_samples.length === 0) {
    console.log('⚠️  No audio samples to fix');
    return;
  }

  // Filter to keep only the correct files
  const correctSamples = product.audio_samples.filter((sample: any) => {
    const fileName = sample.file_name || sample.name || '';
    return correctFileNames.some(correctName => 
      fileName.toLowerCase().includes(correctName.toLowerCase())
    );
  });

  console.log(`\n   Filtered to ${correctSamples.length} correct samples:`);
  correctSamples.forEach((sample: any, index: number) => {
    console.log(`   ${index + 1}. ${sample.file_name || sample.name}`);
  });

  // Update the product
  const { error: updateError } = await supabase
    .from('products')
    .update({ audio_samples: correctSamples })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log(`\n✅ Successfully updated ${product.name}`);
  console.log(`   Removed ${product.audio_samples.length - correctSamples.length} incorrect audio samples`);
}

// Usage: npx tsx scripts/fix-product-audio-demos.ts <slug> <file1> <file2> ...
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/fix-product-audio-demos.ts <product-slug> <correct-file-name-1> [correct-file-name-2] ...');
  console.log('Example: npx tsx scripts/fix-product-audio-demos.ts albanju "Albanju-Audio-Demo"');
  process.exit(1);
}

const productSlug = args[0];
const correctFileNames = args.slice(1);

fixProductAudioDemos(productSlug, correctFileNames).catch(console.error);
