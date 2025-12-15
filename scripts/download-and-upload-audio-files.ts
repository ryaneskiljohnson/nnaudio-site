import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
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

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return false;
  }

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`Creating bucket: ${BUCKET_NAME}`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'],
      fileSizeLimit: 52428800 // 50MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return false;
    }
    console.log(`Bucket ${BUCKET_NAME} created successfully`);
  } else {
    console.log(`Bucket ${BUCKET_NAME} already exists`);
  }
  
  return true;
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
  // Try to extract filename from URL
  const urlParts = url.split('/');
  const urlFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
  const baseName = urlFileName && urlFileName.includes('.') 
    ? urlFileName.replace(/\.(mp3|wav|ogg|m4a|aac|flac)$/i, '')
    : `audio-${index}`;
  
  // Sanitize filename
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

    // Upload to Supabase Storage
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error);
    return null;
  }
}

async function processAudioFiles() {
  console.log('=== Downloading and Uploading Audio Files ===\n');

  // Ensure bucket exists
  if (!(await ensureBucket())) {
    console.error('Failed to ensure bucket exists');
    return;
  }

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

  console.log(`Found ${products.length} products with audio samples\n`);

  let totalProcessed = 0;
  let totalDownloaded = 0;
  let totalUploaded = 0;
  let totalFailed = 0;
  const updates: Array<{ productId: string; audioSamples: any[] }> = [];

  for (const product of products) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples)) {
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${product.name} (${product.slug})`);
    console.log(`Audio files: ${product.audio_samples.length}`);
    console.log(`${'='.repeat(60)}`);

    const updatedAudioSamples: any[] = [];

    for (let i = 0; i < product.audio_samples.length; i++) {
      const audio = product.audio_samples[i];
      const originalUrl = audio.url || audio.src || audio;
      
      if (!originalUrl || typeof originalUrl !== 'string') {
        console.log(`  ⚠ Skipping invalid audio entry ${i + 1}`);
        continue;
      }

      // Skip if already a Supabase URL
      if (originalUrl.includes('supabase.co/storage')) {
        console.log(`  ✓ Already uploaded: ${originalUrl.substring(0, 60)}...`);
        updatedAudioSamples.push(audio);
        continue;
      }

      // Skip if not from nnaud.io
      if (!originalUrl.includes('nnaud.io') && !originalUrl.startsWith('http')) {
        console.log(`  ⚠ Skipping non-nnaud.io URL: ${originalUrl.substring(0, 60)}...`);
        updatedAudioSamples.push(audio);
        continue;
      }

      totalProcessed++;
      const fileName = getFileName(originalUrl, product.slug, i);
      const tempFilePath = path.join(TEMP_DIR, fileName);

      process.stdout.write(`  [${i + 1}/${product.audio_samples.length}] Downloading ${originalUrl.substring(0, 60)}... `);

      // Download file
      const downloaded = await downloadFile(originalUrl, tempFilePath);
      
      if (!downloaded) {
        console.log('✗ Download failed');
        totalFailed++;
        // Keep original URL if download fails
        updatedAudioSamples.push(audio);
        continue;
      }

      totalDownloaded++;
      process.stdout.write('✓ Downloaded, uploading... ');

      // Upload to Supabase
      const supabaseUrl = await uploadAudio(tempFilePath, fileName);
      
      if (!supabaseUrl) {
        console.log('✗ Upload failed');
        totalFailed++;
        // Keep original URL if upload fails
        updatedAudioSamples.push(audio);
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        continue;
      }

      totalUploaded++;
      console.log(`✓ Uploaded: ${supabaseUrl.substring(0, 60)}...`);

      // Update audio sample with new URL
      updatedAudioSamples.push({
        url: supabaseUrl,
        name: audio.name || fileName.replace(/\.[^.]+$/, '')
      });

      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Store update for this product
    if (updatedAudioSamples.length > 0) {
      updates.push({
        productId: product.id,
        audioSamples: updatedAudioSamples
      });
    }
  }

  // Update database
  console.log(`\n${'='.repeat(60)}`);
  console.log('Updating database...');
  console.log(`${'='.repeat(60)}\n`);

  let dbUpdated = 0;
  let dbFailed = 0;

  for (const update of updates) {
    process.stdout.write(`Updating product ${update.productId}... `);
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        audio_samples: update.audioSamples,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.productId);

    if (updateError) {
      console.log('✗');
      console.error(`  Error: ${updateError.message}`);
      dbFailed++;
    } else {
      console.log('✓');
      dbUpdated++;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('=== Migration Summary ===');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total audio files processed: ${totalProcessed}`);
  console.log(`Successfully downloaded: ${totalDownloaded}`);
  console.log(`Successfully uploaded: ${totalUploaded}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`\nDatabase updates:`);
  console.log(`  Successful: ${dbUpdated}`);
  console.log(`  Failed: ${dbFailed}`);
  console.log(`\n✅ Complete!`);
}

processAudioFiles().catch(console.error);

