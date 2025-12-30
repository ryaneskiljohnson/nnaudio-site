import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as https from 'https';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchHTML(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractAudioFiles(html: string): string[] {
  const audioFiles: string[] = [];
  
  // Look for audio file URLs in various formats
  const patterns = [
    /https?:\/\/[^\s"']+\.mp3/gi,
    /data-src="([^"]+\.mp3)"/gi,
    /src="([^"]+\.mp3)"/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = match[1] || match[0];
      if (url && !audioFiles.includes(url)) {
        audioFiles.push(url);
      }
    }
  });
  
  return audioFiles;
}

async function checkProduct(slug: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Checking: ${slug}`);
  console.log(`${'='.repeat(80)}`);
  
  // Get product from database
  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('slug', slug)
    .single();
  
  if (error || !product) {
    console.log(`❌ Product not found in database`);
    return;
  }
  
  console.log(`\n📦 Product: ${product.name}`);
  console.log(`\nCurrent audio in database (${product.audio_samples?.length || 0}):`);
  if (product.audio_samples) {
    product.audio_samples.forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.file_name || s.name}`);
    });
  } else {
    console.log(`  (none)`);
  }
  
  // Fetch product page from nnaud.io
  console.log(`\n🌐 Fetching https://nnaud.io/product/${slug}/...`);
  try {
    const html = await fetchHTML(`https://nnaud.io/product/${slug}/`);
    const audioFiles = extractAudioFiles(html);
    
    console.log(`\n🎵 Audio files found on nnaud.io (${audioFiles.length}):`);
    if (audioFiles.length === 0) {
      console.log(`  (none found)`);
    } else {
      audioFiles.forEach((url, i) => {
        const fileName = url.split('/').pop() || url;
        console.log(`  ${i + 1}. ${fileName}`);
        console.log(`     ${url}`);
      });
    }
    
    // Compare
    const dbFileNames = (product.audio_samples || []).map((s: any) => 
      (s.file_name || s.name || '').toLowerCase()
    );
    const siteFileNames = audioFiles.map(url => 
      (url.split('/').pop() || '').toLowerCase()
    );
    
    const missing = siteFileNames.filter(f => 
      !dbFileNames.some(db => db.includes(f.replace(/\.[^.]+$/, '')))
    );
    const extra = dbFileNames.filter(f => 
      !siteFileNames.some(site => site.includes(f.replace(/\.[^.]+$/, '')))
    );
    
    if (missing.length > 0 || extra.length > 0) {
      console.log(`\n⚠️  DISCREPANCIES FOUND:`);
      if (missing.length > 0) {
        console.log(`\n  Missing from database (on site but not in DB):`);
        missing.forEach(f => console.log(`    - ${f}`));
      }
      if (extra.length > 0) {
        console.log(`\n  Extra in database (in DB but not on site):`);
        extra.forEach(f => console.log(`    - ${f}`));
      }
    } else {
      console.log(`\n✅ Audio files match!`);
    }
    
  } catch (err) {
    console.error(`❌ Error fetching page:`, err);
  }
}

const slug = process.argv[2];
if (!slug) {
  console.log('Usage: npx tsx scripts/check-product-audio-on-site.ts <slug>');
  process.exit(1);
}

checkProduct(slug).catch(console.error);
