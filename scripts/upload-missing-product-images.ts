import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

interface ProductImageMapping {
  slug: string;
  name: string;
  localPath: string;
  fileName: string;
}

// Map products to their local image files
const productImageMappings: ProductImageMapping[] = [
  // Apache MIDI - use the local Apache image
  {
    slug: 'apache-midi',
    name: 'Apache',
    localPath: path.join(__dirname, '../public/images/nnaud-io/Apache-1000-600x600.webp'),
    fileName: 'apache-midi.webp'
  },
  // FreeQ Pack - use the local FreeQ image
  {
    slug: 'freeq-pack',
    name: 'FreeQ',
    localPath: path.join(__dirname, '../public/images/nnaud-io/FreeQWebart-600x600.webp'),
    fileName: 'freeq-pack.webp'
  },
  // GameBoi Pack - use the local GameBoi image
  {
    slug: 'gameboi-pack',
    name: 'GameBoi',
    localPath: path.join(__dirname, '../public/images/nnaud-io/GameBoi-Art-600x600.webp'),
    fileName: 'gameboi-pack.webp'
  },
  // Rabbit Hole MIDI - use the local Rabbit Hole image
  {
    slug: 'rabbit-hole-midi',
    name: 'Rabbit Hole',
    localPath: path.join(__dirname, '../public/images/nnaud-io/Rabbit-Hole-1000-600x600.webp'),
    fileName: 'rabbit-hole-midi.webp'
  },
  // Swiper Pack - use the local Swiper image
  {
    slug: 'swiper-pack',
    name: 'Swiper',
    localPath: path.join(__dirname, '../public/images/nnaud-io/Swiper-1000-600x600.webp'),
    fileName: 'swiper-pack.webp'
  },
];

async function uploadImageToSupabase(filePath: string, fileName: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      'image/jpeg';

    console.log(`Uploading ${fileName}...`);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error(`Error uploading ${fileName}:`, uploadError);
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

async function updateProductImage(productId: string, productName: string, imageUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ featured_image_url: imageUrl })
      .eq('id', productId);

    if (error) {
      console.error(`Error updating ${productName}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error updating ${productName}:`, error);
    return false;
  }
}

async function main() {
  console.log('=== Uploading Missing Product Images ===\n');

  // Get all products that need fixing
  const slugs = productImageMappings.map(m => m.slug);
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url')
    .eq('status', 'active')
    .in('slug', slugs);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} products to update\n`);

  let successCount = 0;
  let failCount = 0;

  for (const mapping of productImageMappings) {
    const product = products?.find(p => p.slug === mapping.slug);
    
    if (!product) {
      console.log(`⚠ Product not found: ${mapping.name} (${mapping.slug})`);
      failCount++;
      continue;
    }

    console.log(`\n--- Processing: ${mapping.name} (${mapping.slug}) ---`);
    
    // Upload image
    const imageUrl = await uploadImageToSupabase(mapping.localPath, mapping.fileName);
    
    if (!imageUrl) {
      console.error(`✗ Failed to upload image for ${mapping.name}`);
      failCount++;
      continue;
    }

    // Update database
    const updated = await updateProductImage(product.id, mapping.name, imageUrl);
    
    if (updated) {
      console.log(`✓ Successfully updated ${mapping.name}`);
      console.log(`  URL: ${imageUrl}`);
      successCount++;
    } else {
      console.error(`✗ Failed to update database for ${mapping.name}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${productImageMappings.length}`);
}

main().catch(console.error);








