/**
 * @fileoverview Upload Tetrad framed images from public/images/tetrad-framed to Supabase and set as product featured images.
 * @module scripts/upload-tetrad-framed-images
 *
 * Reads tetrad-*-featured.webp from public/images/tetrad-framed, uploads to product-images bucket,
 * and updates products (tetrad-keys, tetrad-guitars, tetrad-winds) with featured_image_url.
 */

import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const FRAMED_DIR = path.join(process.cwd(), 'public', 'images', 'tetrad-framed');

const PRODUCT_IMAGES: { slug: string; fileName: string; name: string }[] = [
  { slug: 'tetrad-keys', fileName: 'tetrad-keys-featured.webp', name: 'Tetrad Keys' },
  { slug: 'tetrad-guitars', fileName: 'tetrad-guitars-featured.webp', name: 'Tetrad Guitars' },
  { slug: 'tetrad-winds', fileName: 'tetrad-winds-featured.webp', name: 'Tetrad Winds' },
];

async function uploadToSupabase(
  filePath: string,
  fileName: string,
  contentType: string = 'image/webp'
): Promise<string | null> {
  const adminSupabase = await createAdminClient();
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });
    if (uploadError) {
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return null;
    }
    const { data: urlData } = adminSupabase.storage.from('product-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (error: unknown) {
    console.error(`  ❌ Error uploading: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  console.log('=== Upload Tetrad Framed Images & Update Products ===\n');

  if (!fs.existsSync(FRAMED_DIR)) {
    console.error(`Framed images directory not found: ${FRAMED_DIR}`);
    process.exit(1);
  }

  const supabase = await createAdminClient();

  for (const { slug, fileName, name } of PRODUCT_IMAGES) {
    const filePath = path.join(FRAMED_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skip (missing file): ${fileName}`);
      continue;
    }

    console.log(`Processing ${name}...`);

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (productError || !product) {
      console.error(`  ❌ Product not found: ${slug}`);
      continue;
    }

    console.log(`  Uploading ${fileName}...`);
    const publicUrl = await uploadToSupabase(filePath, fileName, 'image/webp');
    if (!publicUrl) continue;

    console.log(`  Updating product featured_image_url...`);
    const { error: updateError } = await supabase
      .from('products')
      .update({ featured_image_url: publicUrl })
      .eq('id', product.id);

    if (updateError) {
      console.error(`  ❌ Update error:`, updateError);
    } else {
      console.log(`  ✅ ${name} updated\n`);
    }
  }

  console.log('Done.');
}

main().catch(console.error);
