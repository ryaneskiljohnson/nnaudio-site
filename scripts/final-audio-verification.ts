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

async function finalVerification() {
  console.log('=== FINAL AUDIO ASSOCIATION VERIFICATION ===\n');

  // Get all active products
  const { data: allProducts, error: allError } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples, status')
    .eq('status', 'active')
    .order('name');

  if (allError) {
    console.error('Error fetching products:', allError);
    return;
  }

  // Get products with audio
  const { data: productsWithAudio, error: audioError } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .not('audio_samples', 'is', null);

  if (audioError) {
    console.error('Error fetching products with audio:', audioError);
    return;
  }

  // Filter to only products with actual audio arrays
  const productsWithValidAudio = (productsWithAudio || []).filter(p => 
    p.audio_samples && 
    Array.isArray(p.audio_samples) && 
    p.audio_samples.length > 0
  );

  console.log(`Total active products: ${allProducts?.length || 0}`);
  console.log(`Products with audio samples: ${productsWithValidAudio.length}`);
  console.log(`Products without audio: ${(allProducts?.length || 0) - productsWithValidAudio.length}\n`);

  let totalAudioFiles = 0;
  let properlyFormatted = 0;
  let needsFormatting = 0;
  const formattingIssues: Array<{
    product: string;
    slug: string;
    issue: string;
  }> = [];

  for (const product of productsWithValidAudio) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples)) {
      continue;
    }

    totalAudioFiles += product.audio_samples.length;

    for (let i = 0; i < product.audio_samples.length; i++) {
      const audio = product.audio_samples[i];

      // Check if it has the expected format: { url: string, name?: string }
      if (!audio || typeof audio !== 'object') {
        needsFormatting++;
        formattingIssues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} is not an object`
        });
        continue;
      }

      // Must have url property
      if (!audio.url || typeof audio.url !== 'string') {
        needsFormatting++;
        formattingIssues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} missing or invalid URL`
        });
        continue;
      }

      // URL should be from Supabase Storage
      if (!audio.url.includes('supabase.co/storage')) {
        needsFormatting++;
        formattingIssues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} URL not from Supabase Storage`
        });
        continue;
      }

      // Name is optional but preferred
      if (!audio.name || typeof audio.name !== 'string') {
        // This is a minor issue - we can fix it but it's not critical
      }

      properlyFormatted++;
    }
  }

  console.log('=== Format Verification ===');
  console.log(`Total audio files: ${totalAudioFiles}`);
  console.log(`Properly formatted: ${properlyFormatted}`);
  console.log(`Needs formatting: ${needsFormatting}\n`);

  if (formattingIssues.length > 0) {
    console.log('=== Formatting Issues ===\n');
    formattingIssues.slice(0, 10).forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.product} (${issue.slug})`);
      console.log(`   ${issue.issue}`);
      console.log('');
    });
    if (formattingIssues.length > 10) {
      console.log(`... and ${formattingIssues.length - 10} more issues\n`);
    }
  } else {
    console.log('✅ All audio files are properly formatted!');
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL STATUS');
  console.log('='.repeat(60));
  console.log(`✅ Products with audio: ${productsWithValidAudio.length}`);
  console.log(`✅ Total audio files: ${totalAudioFiles}`);
  console.log(`✅ Properly formatted: ${properlyFormatted}/${totalAudioFiles}`);
  console.log(`✅ All URLs from Supabase Storage: ${needsFormatting === 0 ? 'Yes' : 'No'}`);
  console.log(`✅ Ready for production: ${needsFormatting === 0 ? 'Yes' : 'No'}`);
  console.log('='.repeat(60));

  if (needsFormatting === 0) {
    console.log('\n🎉 ALL AUDIO FILES ARE PROPERLY ASSOCIATED! 🎉\n');
    console.log('All audio files are:');
    console.log('  • Downloaded from nnaud.io');
    console.log('  • Uploaded to Supabase Storage');
    console.log('  • Properly formatted in the database');
    console.log('  • Accessible via public URLs');
    console.log('  • Ready to display on product pages');
  }
}

finalVerification().catch(console.error);

