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

async function scrapeProductPage(slug: string): Promise<string[]> {
  const url = `https://nnaud.io/product/${slug}/`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const html = await response.text();
    const audioFiles: string[] = [];
    
    // Extract audio files using the same patterns as the main scraper
    const audioRegex = /<audio[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
    const audioMatches = [...html.matchAll(audioRegex)];
    for (const match of audioMatches) {
      let audioSrc = match[1];
      if (audioSrc && !audioSrc.startsWith('http')) {
        audioSrc = new URL(audioSrc, url).href;
      }
      if (audioSrc && !audioFiles.includes(audioSrc)) {
        audioFiles.push(audioSrc);
      }
    }
    
    // Extract from Sonaar player JSON
    const sonaarJsonRegex = /iron-audioplayer[^>]*data-playlist=["']([^"']+)["']/gi;
    const sonaarJsonMatches = [...html.matchAll(sonaarJsonRegex)];
    for (const match of sonaarJsonMatches) {
      try {
        const encoded = match[1];
        const decoded = decodeURIComponent(encoded);
        const jsonData = JSON.parse(decoded);
        if (jsonData.tracks && Array.isArray(jsonData.tracks)) {
          for (const track of jsonData.tracks) {
            if (track.src) {
              let audioSrc = track.src;
              if (!audioSrc.startsWith('http')) {
                audioSrc = new URL(audioSrc, url).href;
              }
              if (audioSrc && !audioFiles.includes(audioSrc)) {
                audioFiles.push(audioSrc);
              }
            }
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    // Extract from script tags
    const scriptRegex = /<script[^>]*>(.*?)<\/script>/gis;
    const scriptMatches = [...html.matchAll(scriptRegex)];
    for (const match of scriptMatches) {
      const scriptContent = match[1];
      const audioUrlRegex = /(https?:\/\/[^\s"']+\.(mp3|wav|ogg|m4a))/gi;
      const audioUrlMatches = [...scriptContent.matchAll(audioUrlRegex)];
      for (const urlMatch of audioUrlMatches) {
        const audioSrc = urlMatch[1];
        if (audioSrc && !audioFiles.includes(audioSrc)) {
          audioFiles.push(audioSrc);
        }
      }
    }
    
    // Extract audio links
    const audioLinkRegex = /<a[^>]+href=["']([^"']*\.(mp3|wav|ogg|m4a))["'][^>]*>/gi;
    const audioLinkMatches = [...html.matchAll(audioLinkRegex)];
    for (const match of audioLinkMatches) {
      let audioHref = match[1];
      if (audioHref && !audioHref.startsWith('http')) {
        audioHref = new URL(audioHref, url).href;
      }
      if (audioHref && !audioFiles.includes(audioHref)) {
        audioFiles.push(audioHref);
      }
    }
    
    return audioFiles;
  } catch (error) {
    console.error(`Error scraping ${slug}:`, error);
    return [];
  }
}

async function checkAndScrapeMissingAudio() {
  console.log('=== Checking Products Without Audio ===\n');

  // Fetch products without audio
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .or('audio_samples.is.null,audio_samples.eq.[]');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products without audio found.');
    return;
  }

  console.log(`Found ${products.length} products without audio\n`);
  console.log('Checking if they have audio files on nnaud.io...\n');

  const productsWithAudio: Array<{ id: string; slug: string; name: string; audioFiles: string[] }> = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    process.stdout.write(`[${i + 1}/${products.length}] Checking ${product.name}... `);
    
    const audioFiles = await scrapeProductPage(product.slug);
    
    if (audioFiles.length > 0) {
      console.log(`✓ Found ${audioFiles.length} audio file(s)`);
      productsWithAudio.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        audioFiles
      });
    } else {
      console.log('✗ No audio files found');
    }
    
    // Small delay to avoid overwhelming the server
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Products checked: ${products.length}`);
  console.log(`Products with audio found: ${productsWithAudio.length}\n`);

  if (productsWithAudio.length > 0) {
    console.log('Products that need audio scraping:\n');
    productsWithAudio.forEach(p => {
      console.log(`  - ${p.name} (${p.slug})`);
      console.log(`    Audio files: ${p.audioFiles.length}`);
      p.audioFiles.slice(0, 3).forEach((url, i) => {
        console.log(`      ${i + 1}. ${url.substring(0, 80)}...`);
      });
      if (p.audioFiles.length > 3) {
        console.log(`      ... and ${p.audioFiles.length - 3} more`);
      }
      console.log('');
    });

    console.log('\nTo scrape these products, run:');
    productsWithAudio.forEach(p => {
      console.log(`  npx tsx scripts/scrape-product-content.ts ${p.slug}`);
    });
    console.log('\nOr run the download script to get all audio files:');
    console.log('  npx tsx scripts/download-and-upload-audio-files.ts');
  } else {
    console.log('✅ All products without audio have been checked. No additional audio files found.');
  }
}

checkAndScrapeMissingAudio().catch(console.error);

