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

function extractAudioUrls(html: string): Array<{ url: string; name: string }> {
  const audioUrls: Array<{ url: string; name: string }> = [];
  
  // Look for audio player sources
  const audioPattern = /<audio[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = audioPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.find(a => a.url === url)) {
      const fileName = url.split('/').pop() || 'Audio Demo';
      audioUrls.push({ url, name: fileName });
    }
  }

  // Look for source tags within audio elements
  const sourcePattern = /<source[^>]+src=["']([^"']+\.(mp3|wav|ogg|m4a))["']/gi;
  while ((match = sourcePattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.find(a => a.url === url)) {
      const fileName = url.split('/').pop() || 'Audio Demo';
      audioUrls.push({ url, name: fileName });
    }
  }

  // Look for data-src or data-audio attributes
  const dataAudioPattern = /data-(?:src|audio)=["']([^"']+\.(mp3|wav|ogg|m4a))["']/gi;
  while ((match = dataAudioPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !audioUrls.find(a => a.url === url)) {
      const fileName = url.split('/').pop() || 'Audio Demo';
      audioUrls.push({ url, name: fileName });
    }
  }

  // Look for links to audio files
  const linkPattern = /<a[^>]+href=["']([^"']+\.(mp3|wav|ogg|m4a))["'][^>]*>([^<]*)<\/a>/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1].trim();
    const name = match[3]?.trim() || url.split('/').pop() || 'Audio Demo';
    if (url && !audioUrls.find(a => a.url === url)) {
      audioUrls.push({ url, name });
    }
  }

  return audioUrls;
}

async function fixCrystalBallPlaylist() {
  console.log('=== Fixing Crystal Ball Playlist ===\n');

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
    console.log('\n⚠️  Could not automatically fetch audio URLs from old site.');
    console.log('   The audio files may be loaded dynamically via JavaScript.');
    console.log('   Please provide the correct audio file URLs or names for Crystal Ball.');
    return;
  }

  const oldSiteAudioUrls = extractAudioUrls(html);
  
  console.log(`\nFound ${oldSiteAudioUrls.length} audio URLs on old site:`);
  oldSiteAudioUrls.forEach((audio, i) => {
    console.log(`  ${i + 1}. ${audio.name} - ${audio.url}`);
  });

  if (oldSiteAudioUrls.length === 0) {
    console.log('\n⚠️  No audio URLs found on old site.');
    console.log('   The audio files are likely loaded dynamically via JavaScript.');
    console.log('   Current playlist contains files from other products (Rompl, Tactures).');
    console.log('   Please manually update the playlist with the correct Crystal Ball audio files.');
    console.log('\n   You can edit the product in the admin panel to update the audio samples.');
    return;
  }

  // Update the product with correct audio samples
  // Note: These URLs are from the old site and may need to be migrated to Supabase
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ audio_samples: oldSiteAudioUrls })
    .eq('id', product.id);

  if (updateError) {
    console.error('Error updating product:', updateError);
    return;
  }

  console.log('\n✅ Successfully updated Crystal Ball audio playlist');
  console.log(`   Updated ${oldSiteAudioUrls.length} audio samples`);
  console.log('\n⚠️  Note: Audio URLs are from the old site.');
  console.log('   You may need to migrate these files to Supabase Storage.');
}

fixCrystalBallPlaylist().catch(console.error);

