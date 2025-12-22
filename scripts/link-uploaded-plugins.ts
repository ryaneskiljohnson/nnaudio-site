import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';
const STORAGE_PATH_PREFIX = 'products/plugins';

const FILES_TO_LINK = [
  { fileName: 'plugin_strange_tingz_80s_multi_sampler.zip', productSlug: 'strange-tingz-free-80s-plugin' },
  { fileName: 'plugin_tactures_textured_drone_engine.zip', productSlug: 'tactures' },
];

async function linkToProduct(fileName: string, productSlug: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const filePath = path.join(PRODUCTION_DIR, fileName);
  const storagePath = `${STORAGE_PATH_PREFIX}/${fileName}`;
  
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Local file not found: ${fileName}`);
    return false;
  }
  
  console.log(`\nLinking: ${fileName}`);
  console.log(`  Product slug: ${productSlug}`);
  console.log(`  Storage path: ${storagePath}`);
  
  try {
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
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
    
    console.log(`  Found product: ${product.name}`);
    
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
    
    console.log(`  ✅ Successfully linked to product`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Linking Uploaded Plugin Files to Products ===\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { fileName, productSlug } of FILES_TO_LINK) {
    const success = await linkToProduct(fileName, productSlug);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Successfully linked: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

main().catch(console.error);

