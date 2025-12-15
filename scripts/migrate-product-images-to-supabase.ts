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

const BUCKET_NAME = 'product-images';
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'products');

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
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
      fileSizeLimit: 10485760 // 10MB
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

async function uploadImage(filePath: string, fileName: string): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(fileName);
    const contentType = 
      fileExt === '.png' ? 'image/png' :
      fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' :
      fileExt === '.webp' ? 'image/webp' :
      fileExt === '.gif' ? 'image/gif' :
      'image/jpeg';

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

async function migrateImages() {
  console.log('=== Migrating Product Images to Supabase Storage ===\n');

  // Ensure bucket exists
  if (!(await ensureBucket())) {
    console.error('Failed to ensure bucket exists');
    return;
  }

  // Read all image files
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`Images directory not found: ${IMAGES_DIR}`);
    return;
  }

  const files = fs.readdirSync(IMAGES_DIR);
  const imageFiles = files.filter(file => 
    /\.(png|jpg|jpeg|webp|gif)$/i.test(file)
  );

  console.log(`Found ${imageFiles.length} image files to upload\n`);

  const results: Array<{ fileName: string; success: boolean; url?: string; error?: string }> = [];

  // Upload each image
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const filePath = path.join(IMAGES_DIR, file);
    
    process.stdout.write(`[${i + 1}/${imageFiles.length}] Uploading ${file}... `);
    
    const url = await uploadImage(filePath, file);
    
    if (url) {
      console.log('✓');
      results.push({ fileName: file, success: true, url });
    } else {
      console.log('✗');
      results.push({ fileName: file, success: false, error: 'Upload failed' });
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n=== Migration Summary ===`);
  console.log(`Total files: ${imageFiles.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  // Save mapping file for database update
  const mapping = results
    .filter(r => r.success)
    .map(r => ({
      fileName: r.fileName,
      supabaseUrl: r.url
    }));

  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'product-image-mapping.json'),
    JSON.stringify(mapping, null, 2)
  );

  console.log(`\n✅ Mapping saved to scripts/product-image-mapping.json`);
  console.log(`\nNext step: Update database with Supabase URLs`);
}

migrateImages().catch(console.error);
