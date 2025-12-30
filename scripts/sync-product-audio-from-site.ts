import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

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

async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

function extractAudioFiles(html: string): string[] {
  const audioFiles: string[] = [];
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

async function fileExistsInStorage(fileName: string): Promise<boolean> {
  const { data, error } = await supabase
    .storage
    .from('product-audio')
    .list('', { search: fileName });
  
  return !error && data && data.length > 0;
}

async function uploadToStorage(filePath: string, fileName: string): Promise<string | null> {
  const fileBuffer = fs.readFileSync(filePath);
  
  const { data, error } = await supabase
    .storage
    .from('product-audio')
    .upload(fileName, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });
  
  if (error) {
    console.error(`  ❌ Upload error: ${error.message}`);
    return null;
  }
  
  const { data: { publicUrl } } = supabase
    .storage
    .from('product-audio')
    .getPublicUrl(fileName);
  
  return publicUrl;
}

async function syncProductAudio(slug: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Syncing audio for: ${slug}`);
  console.log(`${'='.repeat(80)}\n`);
  
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
  
  console.log(`📦 Product: ${product.name}\n`);
  
  // Fetch audio files from nnaud.io
  console.log(`🌐 Fetching audio files from https://nnaud.io/product/${slug}/...`);
  const html = await fetchHTML(`https://nnaud.io/product/${slug}/`);
  const siteAudioFiles = extractAudioFiles(html);
  
  console.log(`Found ${siteAudioFiles.length} audio files on site\n`);
  
  const currentSamples = product.audio_samples || [];
  const newSamples: any[] = [];
  
  // Process each audio file
  for (const url of siteAudioFiles) {
    const originalFileName = url.split('/').pop() || 'audio.mp3';
    const fileName = `${slug}-${originalFileName.toLowerCase().replace(/\s+/g, '-')}`;
    
    console.log(`\n🎵 Processing: ${originalFileName}`);
    
    // Check if already in database
    const alreadyInDb = currentSamples.some((s: any) => 
      (s.file_name || s.name || '').toLowerCase().includes(originalFileName.toLowerCase().replace('.mp3', ''))
    );
    
    if (alreadyInDb) {
      console.log(`  ✅ Already in database`);
      continue;
    }
    
    // Check if exists in Supabase storage
    const existsInStorage = await fileExistsInStorage(fileName);
    
    let storageUrl: string;
    
    if (existsInStorage) {
      console.log(`  ✅ Already in Supabase storage`);
      const { data: { publicUrl } } = supabase
        .storage
        .from('product-audio')
        .getPublicUrl(fileName);
      storageUrl = publicUrl;
    } else {
      // Download from nnaud.io
      console.log(`  ⬇️  Downloading from nnaud.io...`);
      const tempPath = `/tmp/${fileName}`;
      
      try {
        await downloadFile(url, tempPath);
        console.log(`  ✅ Downloaded`);
        
        // Upload to Supabase storage
        console.log(`  ⬆️  Uploading to Supabase storage...`);
        const uploadedUrl = await uploadToStorage(tempPath, fileName);
        
        if (!uploadedUrl) {
          console.log(`  ❌ Failed to upload`);
          fs.unlinkSync(tempPath);
          continue;
        }
        
        storageUrl = uploadedUrl;
        console.log(`  ✅ Uploaded to Supabase storage`);
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.error(`  ❌ Error processing file:`, err);
        continue;
      }
    }
    
    // Add to new samples
    newSamples.push({
      url: storageUrl,
      name: originalFileName,
      file_name: originalFileName,
    });
  }
  
  if (newSamples.length === 0) {
    console.log(`\n✅ All audio files already synced!`);
    return;
  }
  
  // Update product with new samples
  const allSamples = [...currentSamples, ...newSamples];
  
  const { error: updateError } = await supabase
    .from('products')
    .update({ audio_samples: allSamples })
    .eq('id', product.id);
  
  if (updateError) {
    console.error(`\n❌ Error updating product:`, updateError);
    return;
  }
  
  console.log(`\n✅ Successfully synced ${newSamples.length} new audio files!`);
  console.log(`   Total audio samples: ${allSamples.length}`);
}

const slug = process.argv[2];
if (!slug) {
  console.log('Usage: npx tsx scripts/sync-product-audio-from-site.ts <slug>');
  process.exit(1);
}

syncProductAudio(slug).catch(console.error);
