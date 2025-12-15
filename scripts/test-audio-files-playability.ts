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

async function testAudioFile(url: string): Promise<{ playable: boolean; contentType?: string; size?: number }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      return { playable: false };
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength, 10) : undefined;

    // Check if it's an audio file
    const isAudio = contentType.startsWith('audio/') || 
                   url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);

    return {
      playable: isAudio && response.ok,
      contentType,
      size
    };
  } catch (error) {
    return { playable: false };
  }
}

async function testAudioPlayability() {
  console.log('=== Testing Audio File Playability ===\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .not('audio_samples', 'is', null);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  const productsWithValidAudio = (products || []).filter(p => 
    p.audio_samples && 
    Array.isArray(p.audio_samples) && 
    p.audio_samples.length > 0
  );

  console.log(`Testing audio files from ${productsWithValidAudio.length} products...\n`);

  let totalTested = 0;
  let playable = 0;
  let notPlayable = 0;
  const issues: Array<{
    product: string;
    slug: string;
    url: string;
    reason: string;
  }> = [];

  // Test a sample of audio files (first 3 from each product, or random sample)
  for (const product of productsWithValidAudio) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples)) {
      continue;
    }

    // Test first 2 audio files from each product
    const filesToTest = product.audio_samples.slice(0, 2);
    
    for (const audio of filesToTest) {
      if (!audio || typeof audio !== 'object' || !audio.url) {
        continue;
      }

      totalTested++;
      process.stdout.write(`Testing ${product.name} - ${audio.name || 'audio'}... `);

      const result = await testAudioFile(audio.url);

      if (result.playable) {
        playable++;
        const sizeMB = result.size ? (result.size / 1024 / 1024).toFixed(2) : 'unknown';
        console.log(`✓ Playable (${result.contentType || 'audio'}, ${sizeMB}MB)`);
      } else {
        notPlayable++;
        console.log(`✗ Not playable`);
        issues.push({
          product: product.name,
          slug: product.slug,
          url: audio.url,
          reason: `Content-Type: ${result.contentType || 'unknown'}`
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Total files tested: ${totalTested}`);
  console.log(`Playable: ${playable}`);
  console.log(`Not playable: ${notPlayable}`);
  console.log(`Success rate: ${((playable / totalTested) * 100).toFixed(1)}%\n`);

  if (issues.length > 0) {
    console.log('=== Issues Found ===\n');
    issues.slice(0, 10).forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.product} (${issue.slug})`);
      console.log(`   URL: ${issue.url.substring(0, 80)}...`);
      console.log(`   Reason: ${issue.reason}`);
      console.log('');
    });
    if (issues.length > 10) {
      console.log(`... and ${issues.length - 10} more issues\n`);
    }
  } else {
    console.log('✅ All tested audio files are playable!');
  }
}

testAudioPlayability().catch(console.error);

