import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';
const STORAGE_BUCKET = 'product-downloads';
const STORAGE_PATH_PREFIX = 'products/plugins';

const FAILED_FILES = [
  { fileName: 'plugin_strange_tingz_80s_multi_sampler.zip', productSlug: 'strange-tingz-free-80s-plugin' },
  { fileName: 'plugin_tactures_textured_drone_engine.zip', productSlug: 'tactures' },
];

async function uploadAndLink(fileName: string, productSlug: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const filePath = path.join(PRODUCTION_DIR, fileName);
  const storagePath = `${STORAGE_PATH_PREFIX}/${fileName}`;
  
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ File not found: ${fileName}`);
    return false;
  }
  
  console.log(`\nProcessing: ${fileName}`);
  console.log(`  Product slug: ${productSlug}`);
  
  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    
    console.log(`  File size: ${fileSizeMB} MB`);
    console.log(`  Uploading...`);
    
    // Upload to Supabase Storage with retry logic
    let uploadError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'application/zip',
          upsert: true,
          cacheControl: '3600',
        });
      
      if (!error) {
        console.log(`  ✅ Uploaded successfully (attempt ${attempt})`);
        uploadError = null;
        break;
      } else {
        uploadError = error;
        console.log(`  ⚠️  Attempt ${attempt} failed: ${error.message}`);
        if (attempt < 3) {
          console.log(`  Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    if (uploadError) {
      console.error(`  ❌ Upload failed after 3 attempts: ${uploadError.message}`);
      return false;
    }
    
    // Get product and update downloads
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, downloads')
      .eq('slug', productSlug)
      .single();
    
    if (productError || !product) {
      console.error(`  ❌ Product not found: ${productSlug}`);
      return false;
    }
    
    const downloadObject = {
      path: storagePath,
      name: `${product.name} Plugin`,
      type: 'plugin',
      version: null,
      file_size: fileSize,
    };
    
    const currentDownloads = (product.downloads as any[]) || [];
    const filteredDownloads = currentDownloads.filter((d: any) => d.type !== 'plugin');
    const updatedDownloads = [...filteredDownloads, downloadObject];
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ downloads: updatedDownloads })
      .eq('id', product.id);
    
    if (updateError) {
      console.error(`  ❌ Error updating product: ${updateError.message}`);
      return false;
    }
    
    console.log(`  ✅ Updated product downloads`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Retrying Failed Uploads ===\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { fileName, productSlug } of FAILED_FILES) {
    const success = await uploadAndLink(fileName, productSlug);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

main().catch(console.error);

