import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import https from 'https';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function fetchOldSiteHTML(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          fetchOldSiteHTML(response.headers.location).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.log(`  ❌ Page not found (${response.statusCode}): ${url}`);
        resolve(null);
        return;
      }

      let html = '';
      response.on('data', (chunk) => html += chunk);
      response.on('end', () => resolve(html));
    }).on('error', () => resolve(null));
  });
}

function extractAudioUrls(html: string): string[] {
  const audioUrls: string[] = [];
  
  // Look for audio player sources
  const audioPattern = /<audio[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = audioPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.includes(url)) {
      audioUrls.push(url);
    }
  }

  // Look for source tags within audio elements
  const sourcePattern = /<source[^>]+src=["']([^"']+\.(mp3|wav|ogg|m4a))["']/gi;
  while ((match = sourcePattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.includes(url)) {
      audioUrls.push(url);
    }
  }

  // Look for data-src or data-audio attributes
  const dataAudioPattern = /data-(?:src|audio)=["']([^"']+\.(mp3|wav|ogg|m4a))["']/gi;
  while ((match = dataAudioPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.includes(url)) {
      audioUrls.push(url);
    }
  }

  // Look for links to audio files
  const linkPattern = /<a[^>]+href=["']([^"']+\.(mp3|wav|ogg|m4a))["']/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.includes(url)) {
      audioUrls.push(url);
    }
  }

  return audioUrls;
}

async function auditCrystalBallAudio() {
  console.log('=== Auditing Crystal Ball Audio Samples ===\n');

  const adminSupabase = await createAdminClient();

  // Get current product
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log(`Product: ${product.name} (${product.slug})`);
  console.log(`Current audio samples: ${product.audio_samples?.length || 0}\n`);

  // Fetch old site
  const oldSiteUrl = 'https://nnaud.io/plugins/crystal-ball-magic-effect/';
  console.log(`Fetching old site: ${oldSiteUrl}`);
  
  const html = await fetchOldSiteHTML(oldSiteUrl);
  
  if (!html) {
    console.error('❌ Could not fetch old site HTML');
    return;
  }

  const oldSiteAudioUrls = extractAudioUrls(html);
  
  console.log(`\nFound ${oldSiteAudioUrls.length} audio URLs on old site:`);
  oldSiteAudioUrls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
  });

  console.log(`\nCurrent database audio samples:`);
  if (product.audio_samples && Array.isArray(product.audio_samples)) {
    product.audio_samples.forEach((audio: any, i: number) => {
      const url = audio.url || audio.src || audio;
      console.log(`  ${i + 1}. ${typeof url === 'string' ? url : JSON.stringify(url)}`);
    });
  } else {
    console.log('  No audio samples in database');
  }

  // Check if URLs need updating
  console.log('\n=== Analysis ===');
  
  if (oldSiteAudioUrls.length === 0) {
    console.log('⚠️  No audio URLs found on old site. Audio may be loaded dynamically via JavaScript.');
    console.log('   Current database audio samples should be verified manually.');
  } else {
    // Compare URLs
    const currentUrls = (product.audio_samples || [])
      .map((a: any) => (a.url || a.src || a)?.toString() || '')
      .filter(Boolean);

    const oldSiteBaseUrls = oldSiteAudioUrls.map(url => {
      // Extract just the filename or path
      try {
        const urlObj = new URL(url);
        return urlObj.pathname;
      } catch {
        return url;
      }
    });

    console.log('\n✅ Audio audit complete. Please verify:');
    console.log('   1. All audio files from old site are present in database');
    console.log('   2. All URLs are valid and accessible');
    console.log('   3. File names match expected format');
  }
}

auditCrystalBallAudio().catch(console.error);

