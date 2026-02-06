/**
 * @fileoverview Upload Apache Flute landscape background image to Supabase and set as product background.
 * @module scripts/upload-apache-flute-background
 */

import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const IMAGE_PATH = path.join(__dirname, '../public/images/apache-flute-landscape.png');
const STORAGE_FILE_NAME = 'apache-flute-landscape.png';

/**
 * @brief Upload local image to Supabase Storage and update Apache Flute product background.
 * @returns Promise<void>
 */
async function uploadAndUpdate() {
  console.log('=== Upload Apache Flute Background Image ===\n');

  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`❌ Image not found: ${IMAGE_PATH}`);
    process.exit(1);
  }

  const adminSupabase = await createAdminClient();

  // Get Apache Flute product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'apache-flute')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching Apache Flute product:', productError);
    process.exit(1);
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Upload to Supabase Storage
  process.stdout.write('Uploading to Supabase Storage (product-images)... ');
  try {
    const fileBuffer = fs.readFileSync(IMAGE_PATH);

    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(STORAGE_FILE_NAME, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.log('✗');
      console.error('Upload error:', uploadError.message);
      process.exit(1);
    }

    const { data: urlData } = adminSupabase.storage
      .from('product-images')
      .getPublicUrl(STORAGE_FILE_NAME);

    const publicUrl = urlData.publicUrl;
    console.log('✓');
    console.log(`  URL: ${publicUrl}\n`);

    // Update product background_image_url
    process.stdout.write('Updating product background_image_url... ');
    const { error: updateError } = await adminSupabase
      .from('products')
      .update({ background_image_url: publicUrl })
      .eq('id', product.id);

    if (updateError) {
      console.log('✗');
      console.error('Update error:', updateError.message);
      process.exit(1);
    }

    console.log('✓');
    console.log('\n✅ Successfully set Apache Flute background image!');
  } catch (err: unknown) {
    console.log('✗');
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

uploadAndUpdate().catch(console.error);
