import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

interface Product {
  id: string;
  name: string;
  slug: string;
  featured_image_url: string | null;
}

interface ImageSource {
  localPath?: string;
  url?: string;
  fileName: string;
}

// Map each product to potential unique image sources
const productImageSources: Record<string, ImageSource[]> = {
  'cowboy-harp': [
    { localPath: path.join(__dirname, '../public/images/nnaud-io/CowboyHarpArt-600x600.webp'), fileName: 'cowboy-harp.webp' },
  ],
  'cowboy-harp-free-jaw-harp-plugin': [
    { localPath: path.join(__dirname, '../public/images/products/cowboy-harp-free-jaw-harp-plugin.webp'), fileName: 'cowboy-harp-free-jaw-harp-plugin.webp' },
  ],
  'life-death': [
    { localPath: path.join(__dirname, '../public/images/nnaud-io/LifeDeathBG-1.webp'), fileName: 'life-death.webp' },
  ],
  'life-death-midi': [
    { localPath: path.join(__dirname, '../public/images/products/life-death-midi.webp'), fileName: 'life-death-midi.webp' },
  ],
  'toybox-retro': [
    { localPath: path.join(__dirname, '../public/images/nnaud-io/Toybox-Retro-Art-1000-600x600.webp'), fileName: 'toybox-retro.webp' },
  ],
  'toybox-retro-free-plugin-download': [
    { localPath: path.join(__dirname, '../public/images/products/toybox-retro-free-plugin-download.webp'), fileName: 'toybox-retro-free-plugin-download.webp' },
  ],
  'midi-nerds-pads-atmos': [
    { localPath: path.join(__dirname, '../public/images/nnaud-io/MIDI-Nerds-1-Pads-Atmos-1000-600x600.webp'), fileName: 'midi-nerds-pads-atmos.webp' },
  ],
};

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

async function hashImage(imageBuffer: Buffer): Promise<string> {
  return crypto.createHash('md5').update(imageBuffer).digest('hex');
}

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

async function findUniqueImage(product: Product, existingHashes: Set<string>, currentProductHash?: string): Promise<{ url: string; hash: string } | null> {
  const sources = productImageSources[product.slug] || [];
  
  for (const source of sources) {
    let imageBuffer: Buffer | null = null;
    
    if (source.localPath && fs.existsSync(source.localPath)) {
      imageBuffer = fs.readFileSync(source.localPath);
    } else if (source.url) {
      imageBuffer = await downloadImage(source.url);
    }
    
    if (!imageBuffer) continue;
    
    const hash = await hashImage(imageBuffer);
    
    // Skip if this is the same as the current product image
    if (currentProductHash && hash === currentProductHash) {
      continue;
    }
    
    // Check if this image is unique (not already used by another product)
    if (!existingHashes.has(hash)) {
      const supabaseUrl = await uploadToSupabase(source.fileName, imageBuffer);
      if (supabaseUrl) {
        existingHashes.add(hash);
        return { url: supabaseUrl, hash };
      }
    }
  }
  
  return null;
}

async function main() {
  console.log('=== Finding and Uploading Unique Images for All Products ===\n');

  // Get all products that need fixing
  const allSlugs = Object.keys(productImageSources);
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url')
    .eq('status', 'active')
    .in('slug', allSlugs);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} products to process\n`);

  // Track existing image hashes to avoid duplicates (excluding current product)
  const existingHashes = new Map<string, string>(); // hash -> product slug
  
  // First, hash all existing images from other products
  for (const product of products) {
    if (product.featured_image_url && product.featured_image_url.startsWith('http')) {
      const buffer = await downloadImage(product.featured_image_url);
      if (buffer) {
        const hash = await hashImage(buffer);
        existingHashes.set(hash, product.slug);
      }
    }
  }

  let successCount = 0;
  let failCount = 0;

  // Process each product
  for (const product of products) {
    console.log(`\n--- Processing: ${product.name} (${product.slug}) ---`);
    
    // Get current product's image hash
    let currentProductHash: string | undefined;
    if (product.featured_image_url && product.featured_image_url.startsWith('http')) {
      const buffer = await downloadImage(product.featured_image_url);
      if (buffer) {
        currentProductHash = await hashImage(buffer);
      }
    }
    
    // Create a set of hashes excluding this product's current hash
    const otherProductHashes = new Set<string>();
    for (const [hash, slug] of existingHashes.entries()) {
      if (slug !== product.slug) {
        otherProductHashes.add(hash);
      }
    }
    
    const uniqueImage = await findUniqueImage(product, otherProductHashes, currentProductHash);
    
    if (uniqueImage) {
      // Update database
      const { error: updateError } = await supabase
        .from('products')
        .update({ featured_image_url: uniqueImage.url })
        .eq('id', product.id);
      
      if (updateError) {
        console.error(`✗ Failed to update database: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`✓ Updated with unique image: ${uniqueImage.url}`);
        // Update the hash map
        existingHashes.set(uniqueImage.hash, product.slug);
        successCount++;
      }
    } else {
      console.log(`⚠ Could not find unique image for ${product.name}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${products.length}`);
}

main().catch(console.error);

