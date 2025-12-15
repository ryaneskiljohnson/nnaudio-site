import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

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

async function verifyAudioAssociations() {
  console.log('=== Verifying Audio File Associations ===\n');

  // Fetch all active products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples, status')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }

  console.log(`Total products: ${products.length}\n`);

  let productsWithAudio = 0;
  let productsWithoutAudio = 0;
  let totalAudioFiles = 0;
  let audioFilesWithSupabaseUrls = 0;
  let audioFilesWithOldUrls = 0;
  let invalidAudioEntries = 0;

  const productsNeedingUpdate: Array<{
    id: string;
    name: string;
    slug: string;
    audio_samples: any[];
    needsUpdate: boolean;
  }> = [];

  for (const product of products) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples) || product.audio_samples.length === 0) {
      productsWithoutAudio++;
      continue;
    }

    productsWithAudio++;
    totalAudioFiles += product.audio_samples.length;

    let hasOldUrls = false;
    let hasInvalidEntries = false;

    for (const audio of product.audio_samples) {
      if (!audio || typeof audio !== 'object') {
        hasInvalidEntries = true;
        invalidAudioEntries++;
        continue;
      }

      const url = audio.url || audio.src || '';
      
      if (!url || typeof url !== 'string') {
        hasInvalidEntries = true;
        invalidAudioEntries++;
        continue;
      }

      if (url.includes('supabase.co/storage')) {
        audioFilesWithSupabaseUrls++;
      } else if (url.includes('nnaud.io') || url.startsWith('http')) {
        hasOldUrls = true;
        audioFilesWithOldUrls++;
      }
    }

    if (hasOldUrls || hasInvalidEntries) {
      productsNeedingUpdate.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        audio_samples: product.audio_samples,
        needsUpdate: true
      });
    }
  }

  // Summary
  console.log('=== Summary ===');
  console.log(`Products with audio: ${productsWithAudio}`);
  console.log(`Products without audio: ${productsWithoutAudio}`);
  console.log(`Total audio files: ${totalAudioFiles}`);
  console.log(`Audio files with Supabase URLs: ${audioFilesWithSupabaseUrls}`);
  console.log(`Audio files with old URLs: ${audioFilesWithOldUrls}`);
  console.log(`Invalid audio entries: ${invalidAudioEntries}`);
  console.log(`Products needing update: ${productsNeedingUpdate.length}\n`);

  if (productsNeedingUpdate.length > 0) {
    console.log('=== Products Needing Update ===\n');
    productsNeedingUpdate.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.slug})`);
      console.log(`   Audio files: ${product.audio_samples.length}`);
      product.audio_samples.forEach((audio, i) => {
        const url = audio?.url || audio?.src || 'invalid';
        const isSupabase = url.includes('supabase.co/storage');
        const status = isSupabase ? '✓' : '✗';
        console.log(`   ${status} ${i + 1}. ${audio?.name || 'Unnamed'} - ${url.substring(0, 80)}...`);
      });
      console.log('');
    });
  } else {
    console.log('✅ All audio files are properly associated with Supabase Storage URLs!');
  }

  return {
    productsWithAudio,
    productsWithoutAudio,
    totalAudioFiles,
    audioFilesWithSupabaseUrls,
    audioFilesWithOldUrls,
    productsNeedingUpdate
  };
}

verifyAudioAssociations().catch(console.error);

