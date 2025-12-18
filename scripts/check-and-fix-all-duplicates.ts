import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

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

// All products that might have duplicate images
const duplicateGroups = [
  ['cowboy-harp', 'cowboy-harp-free-jaw-harp-plugin'],
  ['freeq-pack', 'freeq-free-eq-module-plugin'],
  ['gameboi-pack', 'game-boi-retro-sounds-free-plugin'],
  ['life-death-midi', 'life-death'],
  ['rabbit-hole-midi', 'rabbit-hole-free-midi'],
  ['swiper-pack', 'swiper-midi-free'],
  ['toybox-retro', 'toybox-retro-free-plugin-download'],
  ['apache-midi', 'apache-free-midi', 'apache-flute'],
];

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : `https://nnaud.io${url}`;
    const protocol = fullUrl.startsWith('https') ? https : http;
    
    protocol.get(fullUrl, (response) => {
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

async function findUniqueImageForProduct(product: Product, group: string[]): Promise<string | null> {
  // Check if there's a local image file
  const localPath = path.join(__dirname, '../public/images/products', `${product.slug}.webp`);
  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    const fileName = `${product.slug}.webp`;
    return await uploadToSupabase(fileName, buffer);
  }

  // Check nnaud-io folder
  const nnaudPath = path.join(__dirname, '../public/images/nnaud-io');
  if (fs.existsSync(nnaudPath)) {
    const files = fs.readdirSync(nnaudPath);
    const matchingFile = files.find(f => 
      f.toLowerCase().includes(product.slug.split('-')[0].toLowerCase())
    );
    if (matchingFile) {
      const buffer = fs.readFileSync(path.join(nnaudPath, matchingFile));
      const fileName = `${product.slug}${path.extname(matchingFile)}`;
      return await uploadToSupabase(fileName, buffer);
    }
  }

  return null;
}

async function main() {
  console.log('=== Finding and Fixing All Duplicate Product Images ===\n');

  // Get all products
  const allSlugs = duplicateGroups.flat();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url')
    .eq('status', 'active')
    .in('slug', allSlugs);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} products to check\n`);

  // Check each group for duplicates
  for (const group of duplicateGroups) {
    console.log(`\n--- Checking group: ${group.join(', ')} ---`);
    
    const groupProducts = products.filter(p => group.includes(p.slug));
    const imageHashes = new Map<string, Product[]>();

    // Download and hash images
    for (const product of groupProducts) {
      if (!product.featured_image_url) continue;

      const imageBuffer = await downloadImage(product.featured_image_url);
      if (!imageBuffer) {
        console.log(`  ⚠ Could not download image for ${product.name}`);
        continue;
      }

      const hash = await hashImage(imageBuffer);
      
      if (!imageHashes.has(hash)) {
        imageHashes.set(hash, []);
      }
      imageHashes.get(hash)!.push(product);
    }

    // Find duplicates
    for (const [hash, productList] of imageHashes.entries()) {
      if (productList.length > 1) {
        console.log(`  ✗ Found ${productList.length} products with same image:`);
        productList.forEach(p => console.log(`    - ${p.name} (${p.slug})`));
        
        // Keep first one, fix the rest
        const [keep, ...toFix] = productList;
        console.log(`  → Keeping: ${keep.name}`);
        
        for (const product of toFix) {
          console.log(`  → Fixing: ${product.name}...`);
          const newImageUrl = await findUniqueImageForProduct(product, group);
          
          if (newImageUrl) {
            const { error } = await supabase
              .from('products')
              .update({ featured_image_url: newImageUrl })
              .eq('id', product.id);
            
            if (error) {
              console.log(`    ✗ Failed to update: ${error.message}`);
            } else {
              console.log(`    ✓ Updated to: ${newImageUrl}`);
            }
          } else {
            console.log(`    ⚠ Could not find unique image for ${product.name}`);
          }
        }
      } else {
        console.log(`  ✓ ${productList[0].name} has unique image`);
      }
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);




