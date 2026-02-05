#!/usr/bin/env tsx
/**
 * @fileoverview Upload CymaSynth product images to Supabase and update product record
 * @module scripts/upload-cymasynth-images
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

const ORBITALS_BASE = '/Users/rjmacbookpro/Development/Orbitals/_Shared/Assets';

const IMAGE_MAPPINGS = [
  {
    localPath: path.join(ORBITALS_BASE, 'product-images/cymasynth-background-square-with-title.png'),
    storagePath: 'cymasynth/cymasynth-product.png',
    field: 'product' as const,
  },
  {
    localPath: path.join(ORBITALS_BASE, 'backgrounds/cymasynth-background.png'),
    storagePath: 'cymasynth/cymasynth-background.png',
    field: 'background' as const,
  },
  {
    localPath: path.join(ORBITALS_BASE, 'backgrounds/screenshot/CymaSynth1.png'),
    storagePath: 'cymasynth/cymasynth-feature-1.png',
    field: 'feature1' as const,
  },
  {
    localPath: path.join(ORBITALS_BASE, 'backgrounds/screenshot/CymaSynth2.png'),
    storagePath: 'cymasynth/cymasynth-feature-2.png',
    field: 'feature2' as const,
  },
  {
    localPath: path.join(ORBITALS_BASE, 'backgrounds/screenshot/Cymasynth3.png'),
    storagePath: 'cymasynth/cymasynth-feature-3.png',
    field: 'feature3' as const,
  },
];

async function uploadImage(localPath: string, storagePath: string): Promise<string | null> {
  if (!fs.existsSync(localPath)) {
    console.error(`  ❌ File not found: ${localPath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(storagePath).toLowerCase();
  const contentType =
    ext === '.png' ? 'image/png' :
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
    ext === '.webp' ? 'image/webp' : 'image/png';

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType, upsert: true, cacheControl: '3600' });

  if (error) {
    console.error(`  ❌ Upload failed for ${storagePath}:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  console.log('=== Uploading CymaSynth Images ===\n');

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, logo_url, background_image_url, features')
    .eq('slug', 'cymasynth')
    .single();

  if (productError || !product) {
    console.error('❌ CymaSynth product not found');
    process.exit(1);
  }

  console.log(`Found product: ${product.name} (${product.slug})\n`);

  const urls: Record<string, string> = {};

  for (const { localPath, storagePath, field } of IMAGE_MAPPINGS) {
    console.log(`Uploading ${field}...`);
    const url = await uploadImage(localPath, storagePath);
    if (url) {
      urls[field] = url;
      console.log(`  ✓ ${url}`);
    }
  }

  if (!urls.product || !urls.background) {
    console.error('\n❌ Failed to upload required images (product, background)');
    process.exit(1);
  }

  // Update features array - set image_url for first 3 features
  const features = (product.features as any[]) || [];
  if (urls.feature1 && features.length > 0) features[0] = { ...features[0], image_url: urls.feature1 };
  if (urls.feature2 && features.length > 1) features[1] = { ...features[1], image_url: urls.feature2 };
  if (urls.feature3 && features.length > 2) features[2] = { ...features[2], image_url: urls.feature3 };

  const { error: updateError } = await supabase
    .from('products')
    .update({
      featured_image_url: urls.product,
      logo_url: urls.product,
      background_image_url: urls.background,
      features,
    })
    .eq('id', product.id);

  if (updateError) {
    console.error('\n❌ Failed to update product:', updateError.message);
    process.exit(1);
  }

  console.log('\n✅ CymaSynth product updated successfully!');
  console.log('  Product/Logo image:', urls.product);
  console.log('  Background image:', urls.background);
  if (urls.feature1) console.log('  Feature 1:', urls.feature1);
  if (urls.feature2) console.log('  Feature 2:', urls.feature2);
  if (urls.feature3) console.log('  Feature 3:', urls.feature3);
}

main().catch((err) => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
