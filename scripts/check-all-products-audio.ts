import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as https from 'https';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Products to check (from the manual review list)
const productsToCheck = [
  'cymasphere',
  'digital-echoes-delay',
  'digitaldreamscape-quad-rompler',
  'enchante_melodies_bundle',
  'evanescent-baby-grand-piano',
  'midi-library-1',
  'midi-library-2',
  'midi-library-3',
  'midi-library-4',
  'midi-mob-midi-bundle',
  'modern-cthulhu-1',
  'modern-fx-bundle',
  'mutahad-sample-library',
  'nnaudio-access',
  'ooze-midi',
  'rompl-workstation',
  'tetrad-series',
  'ultimate-drums-percs-1',
  'umc6-midi',
];

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
  const patterns = [
    /https?:\/\/[^\s"']+\.mp3/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = match[0];
      if (url && !audioFiles.includes(url)) {
        audioFiles.push(url);
      }
    }
  });
  
  return audioFiles;
}

async function checkAllProducts() {
  console.log(`Checking ${productsToCheck.length} products...\\n`);
  
  const results: any[] = [];
  
  for (const slug of productsToCheck) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, slug, audio_samples')
        .eq('slug', slug)
        .single();
      
      if (!product) {
        console.log(`⏭️  Skipping ${slug} - not found`);
        continue;
      }
      
      const html = await fetchHTML(`https://nnaud.io/product/${slug}/`);
      const audioFiles = extractAudioFiles(html);
      
      const dbCount = product.audio_samples?.length || 0;
      const siteCount = audioFiles.length;
      
      if (dbCount === siteCount) {
        console.log(`✅ ${product.name} - matches (${dbCount} files)`);
        results.push({ slug, name: product.name, status: 'ok', dbCount, siteCount });
      } else {
        console.log(`⚠️  ${product.name} - DB:${dbCount} Site:${siteCount}`);
        results.push({ slug, name: product.name, status: 'mismatch', dbCount, siteCount, audioFiles });
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err: any) {
      console.log(`❌ ${slug} - error: ${err.message}`);
      results.push({ slug, status: 'error', error: err.message });
    }
  }
  
  console.log(`\\n${'='.repeat(80)}`);
  console.log(`SUMMARY:`);
  const ok = results.filter(r => r.status === 'ok').length;
  const mismatch = results.filter(r => r.status === 'mismatch').length;
  const errors = results.filter(r => r.status === 'error').length;
  console.log(`  ✅ Correct: ${ok}`);
  console.log(`  ⚠️  Mismatch: ${mismatch}`);
  console.log(`  ❌ Errors: ${errors}`);
  
  // Show mismatches
  const mismatches = results.filter(r => r.status === 'mismatch');
  if (mismatches.length > 0) {
    console.log(`\\n📝 PRODUCTS NEEDING UPDATES:`);
    mismatches.forEach(m => {
      console.log(`\\n${m.name} (${m.slug}):`);
      console.log(`  DB: ${m.dbCount} files, Site: ${m.siteCount} files`);
      if (m.audioFiles) {
        console.log(`  Site audio files:`);
        m.audioFiles.forEach((url: string) => {
          console.log(`    - ${url.split('/').pop()}`);
        });
      }
    });
  }
}

checkAllProducts().catch(console.error);
