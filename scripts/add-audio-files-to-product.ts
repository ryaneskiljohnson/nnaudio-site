import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAudioFiles(slug: string, audioUrls: string[]) {
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, name, audio_samples')
    .eq('slug', slug)
    .single();

  if (fetchError || !product) {
    console.error('❌ Product not found');
    return;
  }

  const currentSamples = product.audio_samples || [];
  const newSamples = audioUrls.map(url => ({
    url,
    name: url.split('/').pop() || 'audio',
    file_name: url.split('/').pop() || 'audio',
  }));

  const allSamples = [...currentSamples, ...newSamples];

  const { error: updateError } = await supabase
    .from('products')
    .update({ audio_samples: allSamples })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating:', updateError);
    return;
  }

  console.log(`✅ Added ${newSamples.length} audio files to ${product.name}`);
  console.log(`   Total: ${allSamples.length} audio files`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/add-audio-files-to-product.ts <slug> <url1> [url2] [url3]...');
  process.exit(1);
}

const slug = args[0];
const urls = args.slice(1);

addAudioFiles(slug, urls).catch(console.error);
