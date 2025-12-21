import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

interface ImageUpdate {
  slug: string;
  name: string;
  localPath: string;
  fileName: string;
}

// Direct mappings: slug -> unique image file
const imageUpdates: ImageUpdate[] = [
  {
    slug: 'cowboy-harp',
    name: 'Cowboy Harp',
    localPath: path.join(__dirname, '../public/images/nnaud-io/CowboyHarpArt-600x600.webp'),
    fileName: 'cowboy-harp-unique.webp'
  },
  {
    slug: 'cowboy-harp-free-jaw-harp-plugin',
    name: 'Cowboy Harp Plugin',
    localPath: path.join(__dirname, '../public/images/products/cowboy-harp-free-jaw-harp-plugin.webp'),
    fileName: 'cowboy-harp-free-jaw-harp-plugin-unique.webp'
  },
  {
    slug: 'life-death',
    name: 'Life Death',
    localPath: path.join(__dirname, '../public/images/nnaud-io/LifeDeathBG-1.webp'),
    fileName: 'life-death-unique.webp'
  },
  {
    slug: 'life-death-midi',
    name: 'Life & Death MIDI',
    localPath: path.join(__dirname, '../public/images/products/life-death-midi.webp'),
    fileName: 'life-death-midi-unique.webp'
  },
  {
    slug: 'toybox-retro',
    name: 'Toybox Retro',
    localPath: path.join(__dirname, '../public/images/nnaud-io/Toybox-Retro-Art-1000-600x600.webp'),
    fileName: 'toybox-retro-unique.webp'
  },
  {
    slug: 'toybox-retro-free-plugin-download',
    name: 'Toybox-Retro Plugin',
    localPath: path.join(__dirname, '../public/images/products/toybox-retro-free-plugin-download.webp'),
    fileName: 'toybox-retro-free-plugin-download-unique.webp'
  },
];

async function uploadToSupabase(fileName: string, imageBuffer: Buffer): Promise<string | null> {
  try {
    const ext = path.extname(fileName).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      'image/jpeg';

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log('=== Final Fix: Uploading Unique Images ===\n');

  const slugs = imageUpdates.map(u => u.slug);
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('status', 'active')
    .in('slug', slugs);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const update of imageUpdates) {
    const product = products?.find(p => p.slug === update.slug);
    
    if (!product) {
      console.log(`⚠ Product not found: ${update.name} (${update.slug})`);
      failCount++;
      continue;
    }

    if (!fs.existsSync(update.localPath)) {
      console.log(`⚠ Image file not found: ${update.localPath}`);
      failCount++;
      continue;
    }

    console.log(`\n--- Processing: ${update.name} (${update.slug}) ---`);
    
    const imageBuffer = fs.readFileSync(update.localPath);
    const supabaseUrl = await uploadToSupabase(update.fileName, imageBuffer);
    
    if (!supabaseUrl) {
      console.error(`✗ Failed to upload image`);
      failCount++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ featured_image_url: supabaseUrl })
      .eq('id', product.id);

    if (updateError) {
      console.error(`✗ Failed to update database: ${updateError.message}`);
      failCount++;
    } else {
      console.log(`✓ Updated: ${supabaseUrl}`);
      successCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${imageUpdates.length}`);
}

main().catch(console.error);








