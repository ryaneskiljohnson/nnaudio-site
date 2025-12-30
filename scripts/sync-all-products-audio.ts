import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as fs from 'fs';

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
  const pattern = /https?:\/\/[^\s"']+\.mp3/gi;
  const matches = html.matchAll(pattern);
  
  for (const match of matches) {
    const url = match[0];
    if (url && !audioFiles.includes(url)) {
      audioFiles.push(url);
    }
  }
  
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
    console.error(`    ❌ Upload error: ${error.message}`);
    return null;
  }
  
  const { data: { publicUrl } } = supabase
    .storage
    .from('product-audio')
    .getPublicUrl(fileName);
  
  return publicUrl;
}

async function syncProduct(slug: string, index: number, total: number) {
  console.log(`\n[${ index}/${total}] ${slug}`);
  
  const { data: product } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('slug', slug)
    .single();
  
  if (!product) {
    console.log(`  ⏭️  Not found in database`);
    return;
  }
  
  try {
    const html = await fetchHTML(`https://nnaud.io/product/${slug}/`);
    const siteAudioFiles = extractAudioFiles(html);
    
    if (siteAudioFiles.length === 0) {
      console.log(`  ⏭️  No audio on site`);
      return;
    }
    
    const currentSamples = product.audio_samples || [];
    const newSamples: any[] = [];
    
    let downloadCount = 0;
    let uploadCount = 0;
    let skippedCount = 0;
    
    for (const url of siteAudioFiles) {
      const originalFileName = url.split('/').pop() || 'audio.mp3';
      const fileName = `${slug}-${originalFileName.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Check if already in database
      const alreadyInDb = currentSamples.some((s: any) => 
        (s.file_name || s.name || '').toLowerCase().includes(originalFileName.toLowerCase().replace('.mp3', ''))
      );
      
      if (alreadyInDb) {
        skippedCount++;
        continue;
      }
      
      // Check if exists in Supabase storage
      const existsInStorage = await fileExistsInStorage(fileName);
      
      let storageUrl: string;
      
      if (existsInStorage) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('product-audio')
          .getPublicUrl(fileName);
        storageUrl = publicUrl;
      } else {
        // Download and upload
        const tempPath = `/tmp/${fileName}`;
        
        try {
          await downloadFile(url, tempPath);
          
          if (!fs.existsSync(tempPath)) {
            console.error(`    ❌ Download failed for ${originalFileName}`);
            continue;
          }
          
          downloadCount++;
          
          const uploadedUrl = await uploadToStorage(tempPath, fileName);
          
          if (!uploadedUrl) {
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
              }
            } catch (cleanupErr) {
              // Ignore cleanup errors
            }
            continue;
          }
          
          storageUrl = uploadedUrl;
          uploadCount++;
          
          // Clean up temp file
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          } catch (cleanupErr) {
            // Ignore cleanup errors
          }
        } catch (err) {
          // Try to clean up temp file
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          } catch (cleanupErr) {
            // Ignore cleanup errors
          }
          continue;
        }
      }
      
      newSamples.push({
        url: storageUrl,
        name: originalFileName,
        file_name: originalFileName,
      });
    }
    
    if (newSamples.length === 0) {
      console.log(`    ✅ Already synced`);
      return;
    }
    
    const allSamples = [...currentSamples, ...newSamples];
    
    await supabase
      .from('products')
      .update({ audio_samples: allSamples })
      .eq('id', product.id);
    
    console.log(`    ✅ Added ${newSamples.length} files (total: ${allSamples.length})`);
    
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
  }
}

async function syncAllProducts() {
  console.log('🔄 Syncing all products with nnaud.io...\n');
  
  const { data: products } = await supabase
    .from('products')
    .select('slug')
    .order('name');
  
  if (!products) {
    console.error('❌ Could not fetch products');
    return;
  }
  
  for (let i = 0; i < products.length; i++) {
    await syncProduct(products[i].slug, i + 1, products.length);
    // Small delay between products
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\n✅ Sync complete!`);
}

syncAllProducts().catch(console.error);
