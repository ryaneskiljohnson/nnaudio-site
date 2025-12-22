import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';
const STORAGE_BUCKET = 'product-downloads';
const STORAGE_PATH_PREFIX = 'products/plugins';

// Clean up filename: remove hyphens, collapse multiple underscores
function cleanFileName(fileName: string): string {
  // Remove hyphens
  let cleaned = fileName.replace(/-/g, '_');
  // Collapse multiple underscores to single underscore
  cleaned = cleaned.replace(/_+/g, '_');
  // Remove leading/trailing underscores
  cleaned = cleaned.replace(/^_+|_+$/g, '');
  return cleaned;
}

// Map cleaned ZIP filenames to product slugs
function getProductSlugFromZipName(zipName: string): string | null {
  // Remove 'plugin_' prefix and '.zip' suffix
  let slug = zipName.replace(/^plugin_/, '').replace(/\.zip$/, '');
  
  // Handle specific mappings for products that don't match exactly
  const mappings: Record<string, string> = {
    'apache_native_american_flute': 'apache-flute',
    'blaque_dark_electric_guitar': 'blaque',
    'cowboy_harp': 'cowboy-harp-free-jaw-harp-plugin',
    'crystal_ball': 'crystal-ball-magic-multi-effect',
    'curio': 'curio-texture-generator',
    'curves_multi_eq': 'curves-eq',
    'digital_dreamscape': 'digitaldreamscape-quad-rompler',
    'digital_echoes': 'digital-echoes-delay',
    'evanescent_baby_grand_pianio': 'evanescent-baby-grand-piano',
    'freeq': 'freeq-free-eq-module-plugin',
    'freelay': 'freelay-free-delay-module-plugin',
    'freeverb': 'freeverb-free-reverb-module-plugin',
    'gameboi': 'game-boi-retro-sounds-free-plugin',
    'mandolele_mandolin_ukulele_instrument': 'mandolele-mandolin-ukulele',
    'mesosphere_dual_atmosphere_engine': 'mesosphere',
    'natura_sampled_analog_instrument': 'natura',
    'numb_dark_acoustic_guitar': 'numb',
    'obscura_music_box_orchestra': 'obscura-tortured-orchestral-box',
    'perc_gadget_update': 'perc-gadget',
    'prodigious_orchestral_engine': 'prodigious',
    'quoir_mixed_vocal_quoir': 'quoir',
    'reiya_layered_sampled_instruments': 'reiya',
    'rompl_workstation': 'rompl-workstation',
    'sterfreeo': 'sterfreeo-free-stereo-module-plugin',
    'strange_tingz_80s_multi_sampler': 'strange-tingz-free-80s-plugin',
    'subflux_bass_module': 'subflux-bass-module',
    'tactures_textured_drone_engine': 'tactures',
    'tetrad_series_guitars': 'tetrad-guitars',
    'tetrad_series_keys': 'tetrad-keys',
    'tetrad_series_winds': 'tetrad-winds',
  };
  
  return mappings[slug] || null;
}

async function uploadPluginZip(zipPath: string, newFileName: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const storagePath = `${STORAGE_PATH_PREFIX}/${newFileName}`;
  
  console.log(`  Uploading ${newFileName}...`);
  
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

async function deleteOldFileFromSupabase(oldFileName: string): Promise<void> {
  const supabase = await createAdminClient();
  const oldPath = `${STORAGE_PATH_PREFIX}/${oldFileName}`;
  
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([oldPath]);
    
    if (error && !error.message.includes('not found')) {
      console.log(`    ⚠️  Could not delete old file: ${error.message}`);
    } else {
      console.log(`    ✅ Deleted old file from Supabase`);
    }
  } catch (error) {
    // Ignore errors
  }
}

async function updateProductDownload(productSlug: string, newFileName: string, fileSize: number): Promise<boolean> {
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
  
  const storagePath = `${STORAGE_PATH_PREFIX}/${newFileName}`;
  
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
  console.log('=== Cleaning Up and Reassociating Plugin ZIPs ===\n');
  console.log(`Source: ${PRODUCTION_DIR}`);
  console.log(`Storage: ${STORAGE_BUCKET}/${STORAGE_PATH_PREFIX}\n`);
  
  // Get all ZIP files
  const zipFiles = fs.readdirSync(PRODUCTION_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('plugin_'))
    .map(file => ({
      oldName: file,
      oldPath: path.join(PRODUCTION_DIR, file),
    }))
    .sort((a, b) => a.oldName.localeCompare(b.oldName));
  
  console.log(`Found ${zipFiles.length} plugin ZIP files\n`);
  
  let successCount = 0;
  let failCount = 0;
  const failed: string[] = [];
  
  for (const { oldName, oldPath } of zipFiles) {
    // Clean up filename
    const newFileName = cleanFileName(oldName);
    const newPath = path.join(PRODUCTION_DIR, newFileName);
    
    console.log(`\nProcessing: ${oldName}`);
    console.log(`  New name: ${newFileName}`);
    
    // Skip if already cleaned
    if (oldName === newFileName) {
      console.log(`  ⏭️  Already cleaned, skipping rename`);
    } else {
      // Rename locally
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`  ✅ Renamed locally`);
      } catch (error: any) {
        console.error(`  ❌ Error renaming: ${error.message}`);
        failCount++;
        failed.push(oldName);
        continue;
      }
    }
    
    // Get product slug
    const productSlug = getProductSlugFromZipName(newFileName);
    
    if (!productSlug) {
      console.log(`  ⚠️  Could not determine product slug`);
      failCount++;
      failed.push(newFileName);
      continue;
    }
    
    console.log(`  Product slug: ${productSlug}`);
    
    // Get file size
    const stats = fs.statSync(newPath);
    const fileSize = stats.size;
    
    // Delete old file from Supabase if it exists
    if (oldName !== newFileName) {
      await deleteOldFileFromSupabase(oldName);
    }
    
    // Upload new/cleaned ZIP to Supabase
    const uploaded = await uploadPluginZip(newPath, newFileName);
    
    if (!uploaded) {
      failCount++;
      failed.push(newFileName);
      continue;
    }
    
    // Update product downloads
    const updated = await updateProductDownload(productSlug, newFileName, fileSize);
    
    if (updated) {
      successCount++;
      console.log(`  ✅ Successfully linked to ${productSlug}`);
    } else {
      failCount++;
      failed.push(newFileName);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failed.length > 0) {
    console.log(`\nFailed files:`);
    failed.forEach(file => console.log(`  - ${file}`));
  }
}

main().catch(console.error);

