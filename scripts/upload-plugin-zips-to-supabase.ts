import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';
const STORAGE_BUCKET = 'product-downloads';
const STORAGE_PATH_PREFIX = 'products/plugins';

// Map ZIP filenames to product slugs
// Format: plugin_{sanitized_name}.zip -> product-slug
function getProductSlugFromZipName(zipName: string): string | null {
  // Remove 'plugin_' prefix and '.zip' suffix
  let slug = zipName.replace(/^plugin_/, '').replace(/\.zip$/, '');
  
  // Convert underscores to dashes, then collapse multiple dashes to single dash
  slug = slug.replace(/_/g, '-').replace(/-+/g, '-');
  
  // Remove leading/trailing dashes
  slug = slug.replace(/^-+|-+$/g, '');
  
  // Handle specific mappings for products that don't match exactly
  // Based on actual product slugs in database
  const mappings: Record<string, string> = {
    'apache-native-american-flute': 'apache-flute',
    'blaque-dark-electric-guitar': 'blaque',
    'cowboy-harp': 'cowboy-harp-free-jaw-harp-plugin',
    'crystal-ball': 'crystal-ball-magic-multi-effect',
    'curio': 'curio-texture-generator',
    'curves-multi-eq': 'curves-eq',
    'digital-dreamscape': 'digitaldreamscape-quad-rompler',
    'digital-echoes': 'digital-echoes-delay',
    'evanescent-baby-grand-pianio': 'evanescent-baby-grand-piano',
    'freeq': 'freeq-free-eq-module-plugin',
    'freelay': 'freelay-free-delay-module-plugin',
    'freeverb': 'freeverb-free-reverb-module-plugin',
    'gameboi': 'game-boi-retro-sounds-free-plugin',
    'mandolele-mandolin-ukulele-instrument': 'mandolele-mandolin-ukulele',
    'mesosphere-dual-atmosphere-engine': 'mesosphere',
    'natura-sampled-analog-instrument': 'natura',
    'numb-dark-acoustic-guitar': 'numb',
    'obscura-music-box-orchestra': 'obscura-tortured-orchestral-box',
    'perc-gadget-update': 'perc-gadget',
    'prodigious-orchestral-engine': 'prodigious',
    'quoir-mixed-vocal-quoir': 'quoir',
    'reiya-layered-sampled-instruments': 'reiya',
    'rompl-workstation': 'rompl-workstation',
    'sterfreeo': 'sterfreeo-free-stereo-module-plugin',
    'strange-tingz-80s-multi-sampler': 'strange-tingz-free-80s-plugin',
    'subflux-bass-module': 'subflux-bass-module',
    'tactures-textured-drone-engine': 'tactures',
    'tetrad-series-guitars': 'tetrad-guitars',
    'tetrad-series-keys': 'tetrad-keys',
    'tetrad-series-winds': 'tetrad-winds',
  };
  
  return mappings[slug] || slug;
}

async function uploadPluginZip(zipPath: string, productSlug: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const zipFileName = path.basename(zipPath);
  const storagePath = `${STORAGE_PATH_PREFIX}/${zipFileName}`;
  
  console.log(`  Uploading ${zipFileName}...`);
  
  try {
    // Read file
    const fileBuffer = fs.readFileSync(zipPath);
    const fileSize = fileBuffer.length;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    
    console.log(`    File size: ${fileSizeMB} MB`);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/zip',
        upsert: true,
        cacheControl: '3600',
      });
    
    if (uploadError) {
      console.error(`    ❌ Upload error: ${uploadError.message}`);
      return false;
    }
    
    console.log(`    ✅ Uploaded to: ${storagePath}`);
    return true;
  } catch (error: any) {
    console.error(`    ❌ Error: ${error.message}`);
    return false;
  }
}

async function updateProductDownload(productSlug: string, zipFileName: string, fileSize: number): Promise<boolean> {
  const supabase = await createAdminClient();
  
  // Get product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, downloads')
    .eq('slug', productSlug)
    .single();
  
  if (productError || !product) {
    console.error(`    ❌ Product not found: ${productSlug}`);
    return false;
  }
  
  const storagePath = `${STORAGE_PATH_PREFIX}/${zipFileName}`;
  
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
    console.error(`    ❌ Error updating product: ${updateError.message}`);
    return false;
  }
  
  console.log(`    ✅ Updated product downloads`);
  return true;
}

async function main() {
  console.log('=== Uploading Plugin ZIPs to Supabase ===\n');
  console.log(`Source: ${PRODUCTION_DIR}`);
  console.log(`Storage: ${STORAGE_BUCKET}/${STORAGE_PATH_PREFIX}\n`);
  
  // Get all ZIP files
  const zipFiles = fs.readdirSync(PRODUCTION_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('plugin_'))
    .map(file => path.join(PRODUCTION_DIR, file))
    .sort();
  
  console.log(`Found ${zipFiles.length} plugin ZIP files\n`);
  
  let successCount = 0;
  let failCount = 0;
  const failed: string[] = [];
  
  for (const zipPath of zipFiles) {
    const zipFileName = path.basename(zipPath);
    const productSlug = getProductSlugFromZipName(zipFileName);
    
    if (!productSlug) {
      console.log(`⚠️  ${zipFileName}: Could not determine product slug`);
      failCount++;
      failed.push(zipFileName);
      continue;
    }
    
    console.log(`\nProcessing: ${zipFileName}`);
    console.log(`  Product slug: ${productSlug}`);
    
    // Get file size
    const stats = fs.statSync(zipPath);
    const fileSize = stats.size;
    
    // Upload ZIP
    const uploaded = await uploadPluginZip(zipPath, productSlug);
    
    if (!uploaded) {
      failCount++;
      failed.push(zipFileName);
      continue;
    }
    
    // Update product downloads
    const updated = await updateProductDownload(productSlug, zipFileName, fileSize);
    
    if (updated) {
      successCount++;
      console.log(`  ✅ Successfully linked to ${productSlug}`);
    } else {
      failCount++;
      failed.push(zipFileName);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Successfully uploaded and linked: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failed.length > 0) {
    console.log(`\nFailed files:`);
    failed.forEach(file => console.log(`  - ${file}`));
  }
}

main().catch(console.error);

