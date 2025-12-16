import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: string;
  name: string;
  slug: string;
  featured_image_url: string | null;
  logo_url: string | null;
}

interface ImageHash {
  hash: string;
  products: Product[];
}

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function hashImage(imageBuffer: Buffer): Promise<string> {
  return crypto.createHash('md5').update(imageBuffer).digest('hex');
}

async function findDuplicateImages() {
  console.log('Fetching products from database...');
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, logo_url')
    .eq('status', 'active')
    .not('featured_image_url', 'is', null);
  
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  console.log(`Found ${products.length} products with images`);
  console.log('Downloading and hashing images...\n');
  
  const imageHashes = new Map<string, Product[]>();
  const failed: Product[] = [];
  
  for (const product of products) {
    const imageUrl = product.featured_image_url || product.logo_url;
    if (!imageUrl) continue;
    
    try {
      // Handle relative URLs - skip if relative (likely broken)
      if (!imageUrl.startsWith('http')) {
        console.log(`Skipping relative URL: ${product.name} (${imageUrl})`);
        failed.push(product);
        continue;
      }
      
      const imageBuffer = await downloadImage(imageUrl);
      const hash = await hashImage(imageBuffer);
      
      if (!imageHashes.has(hash)) {
        imageHashes.set(hash, []);
      }
      imageHashes.get(hash)!.push(product);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Failed to process ${product.name}:`, error);
      failed.push(product);
    }
  }
  
  console.log('\n=== DUPLICATE IMAGES FOUND ===\n');
  
  let duplicateCount = 0;
  for (const [hash, productList] of imageHashes.entries()) {
    if (productList.length > 1) {
      duplicateCount++;
      console.log(`\nDuplicate Group ${duplicateCount} (Hash: ${hash.substring(0, 8)}...):`);
      console.log(`  Products (${productList.length}):`);
      productList.forEach((p, idx) => {
        console.log(`    ${idx + 1}. ${p.name} (${p.slug})`);
        console.log(`       Image: ${p.featured_image_url || p.logo_url}`);
      });
    }
  }
  
  if (duplicateCount === 0) {
    console.log('No duplicate images found!');
  } else {
    console.log(`\nTotal duplicate groups: ${duplicateCount}`);
  }
  
  if (failed.length > 0) {
    console.log(`\nFailed to process ${failed.length} products:`);
    failed.forEach(p => {
      console.log(`  - ${p.name} (${p.slug})`);
    });
  }
}

findDuplicateImages().catch(console.error);

