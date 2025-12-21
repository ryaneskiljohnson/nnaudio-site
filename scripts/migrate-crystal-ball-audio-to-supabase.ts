import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import https from 'https';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const TEMP_DIR = path.join(__dirname, '../temp-audio');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function downloadFile(url: string, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          downloadFile(response.headers.location, filePath).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.error(`  ❌ Failed to download: ${response.statusCode}`);
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        resolve(false);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      console.error(`  ❌ Error downloading: ${err.message}`);
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      resolve(false);
    });
  });
}

async function ensureAudioBucket() {
  const adminSupabase = await createAdminClient();
  
  const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return false;
  }

  const bucketName = 'product-audio';
  const bucketExists = buckets?.some(b => b.name === bucketName);
  
  if (!bucketExists) {
    console.log(`Creating bucket: ${bucketName}`);
    const { error: createError } = await adminSupabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'],
      fileSizeLimit: 52428800 // 50MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return false;
    }
    console.log(`Bucket ${bucketName} created successfully`);
  }
  
  return true;
}

async function uploadToSupabase(filePath: string, fileName: string): Promise<string | null> {
  const adminSupabase = await createAdminClient();
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { error: uploadError } = await adminSupabase.storage
      .from('product-audio')
      .upload(fileName, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = adminSupabase.storage
      .from('product-audio')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`  ❌ Error uploading: ${error.message}`);
    return null;
  }
}

async function checkFileExists(fileName: string): Promise<boolean> {
  const adminSupabase = await createAdminClient();
  
  try {
    const { data, error } = await adminSupabase.storage
      .from('product-audio')
      .list('', {
        limit: 1000
      });

    if (error) {
      // If bucket doesn't exist, file doesn't exist
      return false;
    }

    return data?.some(file => file.name === fileName) || false;
  } catch (error) {
    return false;
  }
}

function sanitizeFileName(url: string): string {
  // Extract filename from URL
  const urlPath = new URL(url).pathname;
  const fileName = path.basename(urlPath);
  // Sanitize: replace spaces and special chars, keep it simple
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function migrateCrystalBallAudio() {
  console.log('=== Migrating Crystal Ball Audio Files to Supabase ===\n');

  const adminSupabase = await createAdminClient();

  // Ensure audio bucket exists
  if (!(await ensureAudioBucket())) {
    console.error('Failed to ensure audio bucket exists');
    return;
  }

  // Get Crystal Ball product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})`);
  console.log(`Audio samples count: ${product.audio_samples?.length || 0}\n`);

  if (!product.audio_samples || product.audio_samples.length === 0) {
    console.log('No audio samples to migrate.');
    return;
  }

  const updatedAudioSamples: any[] = [];
  let downloaded = 0;
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < product.audio_samples.length; i++) {
    const audio = product.audio_samples[i];
    const oldUrl = audio.url;
    const fileName = sanitizeFileName(oldUrl);
    const filePath = path.join(TEMP_DIR, fileName);

    console.log(`\n[${i + 1}/${product.audio_samples.length}] ${audio.name}`);
    console.log(`  Old URL: ${oldUrl}`);

    // Check if file already exists in Supabase
    const exists = await checkFileExists(fileName);
    if (exists) {
      console.log(`  ✓ File already exists in Supabase`);
      const { data: urlData } = adminSupabase.storage
        .from('product-images')
        .getPublicUrl(`audio-samples/${fileName}`);
      
      updatedAudioSamples.push({
        ...audio,
        url: urlData.publicUrl
      });
      skipped++;
      continue;
    }

    // Download file
    process.stdout.write(`  Downloading... `);
    const downloadedSuccess = await downloadFile(oldUrl, filePath);
    
    if (!downloadedSuccess) {
      console.log('✗');
      errors++;
      // Keep old URL if download fails
      updatedAudioSamples.push(audio);
      continue;
    }

    const stats = fs.statSync(filePath);
    console.log(`✓ (${(stats.size / 1024).toFixed(1)}KB)`);
    downloaded++;

    // Upload to Supabase
    process.stdout.write(`  Uploading to Supabase... `);
    const supabaseUrl = await uploadToSupabase(filePath, fileName);
    
    if (!supabaseUrl) {
      console.log('✗');
      errors++;
      // Keep old URL if upload fails
      updatedAudioSamples.push(audio);
      // Clean up temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      continue;
    }

    console.log(`✓`);
    console.log(`  New URL: ${supabaseUrl}`);
    uploaded++;

    // Update audio sample with new URL
    updatedAudioSamples.push({
      ...audio,
      url: supabaseUrl
    });

    // Clean up temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Update product with new audio sample URLs
  console.log(`\n\n=== Summary ===`);
  console.log(`Total files: ${product.audio_samples.length}`);
  console.log(`Already in Supabase: ${skipped}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Errors: ${errors}`);

  if (uploaded > 0 || skipped > 0) {
    console.log(`\nUpdating product with new URLs...`);
    const { error: updateError } = await adminSupabase
      .from('products')
      .update({ audio_samples: updatedAudioSamples })
      .eq('id', product.id);

    if (updateError) {
      console.error('❌ Error updating product:', updateError);
      return;
    }

    console.log('✅ Successfully updated product with Supabase audio URLs!');
  } else {
    console.log('\n⚠️  No files were migrated. All files may already be in Supabase or there were errors.');
  }

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

migrateCrystalBallAudio().catch(console.error);





