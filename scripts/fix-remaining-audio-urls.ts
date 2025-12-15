import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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

const BUCKET_NAME = 'product-audio';
const TEMP_DIR = path.join(process.cwd(), 'temp', 'audio');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function downloadFile(url: string, filePath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return false;
  }
}

function getFileExtension(url: string): string {
  const match = url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);
  return match ? match[1].toLowerCase() : 'mp3';
}

function getFileName(url: string, productSlug: string, index: number): string {
  const ext = getFileExtension(url);
  const urlParts = url.split('/');
  const urlFileName = urlParts[urlParts.length - 1].split('?')[0];
  const baseName = urlFileName && urlFileName.includes('.') 
    ? urlFileName.replace(/\.(mp3|wav|ogg|m4a|aac|flac)$/i, '')
    : `audio-${index}`;
  
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  
  return `${productSlug}-${sanitized}.${ext}`;
}

async function uploadAudio(filePath: string, fileName: string): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    const contentType = 
      fileExt === '.mp3' ? 'audio/mpeg' :
      fileExt === '.wav' ? 'audio/wav' :
      fileExt === '.ogg' ? 'audio/ogg' :
      fileExt === '.m4a' ? 'audio/m4a' :
      'audio/mpeg';

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error);
    return null;
  }
}

async function fixRemainingUrls() {
  console.log('=== Fixing Remaining Old Audio URLs ===\n');

  // Fetch all products with audio samples
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .not('audio_samples', 'is', null);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products with audio samples found.');
    return;
  }

  let totalFixed = 0;
  let totalFailed = 0;

  for (const product of products) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples)) {
      continue;
    }

    let needsUpdate = false;
    const updatedAudioSamples = [...product.audio_samples];

    for (let i = 0; i < updatedAudioSamples.length; i++) {
      const audio = updatedAudioSamples[i];
      if (!audio || typeof audio !== 'object') continue;

      const url = audio.url || audio.src || '';
      if (!url || typeof url !== 'string') continue;

      // Check if it's an old URL that needs to be migrated
      if (url.includes('nnaud.io') && !url.includes('supabase.co/storage')) {
        console.log(`\nFound old URL in ${product.name}:`);
        console.log(`  ${url}`);

        const fileName = getFileName(url, product.slug, i);
        const tempFilePath = path.join(TEMP_DIR, fileName);

        process.stdout.write(`  Downloading... `);
        const downloaded = await downloadFile(url, tempFilePath);
        
        if (!downloaded) {
          console.log('✗ Download failed');
          totalFailed++;
          continue;
        }

        process.stdout.write('✓ Uploading... ');
        const supabaseUrl = await uploadAudio(tempFilePath, fileName);
        
        if (!supabaseUrl) {
          console.log('✗ Upload failed');
          totalFailed++;
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          continue;
        }

        console.log(`✓ Uploaded: ${supabaseUrl.substring(0, 60)}...`);
        
        updatedAudioSamples[i] = {
          url: supabaseUrl,
          name: audio.name || fileName.replace(/\.[^.]+$/, '')
        };

        needsUpdate = true;
        totalFixed++;

        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }

    if (needsUpdate) {
      process.stdout.write(`  Updating database... `);
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          audio_samples: updatedAudioSamples,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        console.log('✗');
        console.error(`  Error: ${updateError.message}`);
        totalFailed++;
      } else {
        console.log('✓');
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Fixed: ${totalFixed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`\n✅ Complete!`);
}

fixRemainingUrls().catch(console.error);

