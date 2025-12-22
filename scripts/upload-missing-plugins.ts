import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';
const STORAGE_BUCKET = 'product-downloads';
const STORAGE_PATH_PREFIX = 'products/plugins';

const FILES_TO_UPLOAD = [
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
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    
    console.log(`  File size: ${fileSizeMB} MB`);
    console.log(`  Uploading to: ${storagePath}...`);
    
    // Read file in chunks for large files
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/zip',
        upsert: true,
        cacheControl: '3600',
      });
    
    if (uploadError) {
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return false;
    }
    
    console.log(`  ✅ Uploaded successfully`);
    
    // Get product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, downloads')
      .eq('slug', productSlug)
      .single();
    
    if (productError || !product) {
      console.error(`  ❌ Product not found: ${productSlug}`);
      return false;
    }
    
    // Prepare download object
    const downloadObject = {
      path: storagePath,
      name: `${product.name} Plugin`,
      type: 'plugin',
      version: null,
      file_size: fileSize,
    };
    
    // Update downloads array - remove existing plugin download, add new one
    const currentDownloads = (product.downloads as any[]) || [];
    const filteredDownloads = currentDownloads.filter((d: any) => d.type !== 'plugin');
    const updatedDownloads = [...filteredDownloads, downloadObject];
    
    // Update product
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
  console.log('=== Uploading Missing Plugin Files ===\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { fileName, productSlug } of FILES_TO_UPLOAD) {
    const success = await uploadAndLink(fileName, productSlug);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Successfully uploaded and linked: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

main().catch(console.error);

