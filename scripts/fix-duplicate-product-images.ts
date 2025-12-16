import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as crypto from 'crypto';

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

interface Product {
  id: string;
  name: string;
  slug: string;
  featured_image_url: string | null;
  logo_url: string | null;
  category: string;
}

// Products that need unique images
const productsToFix: Array<{
  slug: string;
  name: string;
  imageUrl?: string; // If we can find it on the website
  localPath?: string; // If we have it locally
}> = [
  { slug: 'apache-midi', name: 'Apache' },
  { slug: 'freeq-pack', name: 'FreeQ' },
  { slug: 'gameboi-pack', name: 'GameBoi' },
  { slug: 'rabbit-hole-midi', name: 'Rabbit Hole' },
  { slug: 'swiper-pack', name: 'Swiper' },
];

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

async function uploadToSupabase(fileName: string, imageBuffer: Buffer): Promise<string | null> {
  try {
    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      'image/jpeg';

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imageBuffer, {
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

async function fetchProductImageFromWebsite(slug: string): Promise<string | null> {
  try {
    // Try to fetch from the product page
    const productUrl = `https://nnaud.io/product/${slug}`;
    console.log(`Fetching product page: ${productUrl}`);
    
    const html = await new Promise<string>((resolve, reject) => {
      https.get(productUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
        response.on('error', reject);
      }).on('error', reject);
    });

    // Try to find image in HTML
    const imageMatch = html.match(/<img[^>]+src=["']([^"']+product[^"']*\.(png|jpg|jpeg|webp))[^"']*["']/i);
    if (imageMatch) {
      let imageUrl = imageMatch[1];
      if (imageUrl.startsWith('/')) {
        imageUrl = `https://nnaud.io${imageUrl}`;
      }
      return imageUrl;
    }

    // Try meta og:image
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      return ogImageMatch[1];
    }

    return null;
  } catch (error) {
    console.error(`Error fetching product page for ${slug}:`, error);
    return null;
  }
}

async function fixProductImage(product: Product, newImageUrl: string): Promise<boolean> {
  try {
    // Download the image
    console.log(`Downloading image from: ${newImageUrl}`);
    const imageBuffer = await downloadImage(newImageUrl);
    
    // Generate filename based on slug
    const ext = path.extname(newImageUrl).toLowerCase() || '.webp';
    const fileName = `${product.slug}${ext}`;
    
    // Upload to Supabase
    console.log(`Uploading to Supabase: ${fileName}`);
    const supabaseUrl = await uploadToSupabase(fileName, imageBuffer);
    
    if (!supabaseUrl) {
      console.error(`Failed to upload image for ${product.name}`);
      return false;
    }
    
    // Update database
    console.log(`Updating database for ${product.name}...`);
    const { error } = await supabase
      .from('products')
      .update({ featured_image_url: supabaseUrl })
      .eq('id', product.id);
    
    if (error) {
      console.error(`Error updating database:`, error);
      return false;
    }
    
    console.log(`✓ Successfully fixed ${product.name} -> ${supabaseUrl}`);
    return true;
  } catch (error) {
    console.error(`Error fixing ${product.name}:`, error);
    return false;
  }
}

async function main() {
  console.log('=== Fixing Duplicate Product Images ===\n');
  
  // Get all products that need fixing
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, logo_url, category')
    .eq('status', 'active')
    .in('slug', productsToFix.map(p => p.slug));
  
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  console.log(`Found ${products.length} products to fix\n`);
  
  for (const product of products) {
    console.log(`\n--- Processing: ${product.name} (${product.slug}) ---`);
    
    // Try to find image from website
    const imageUrl = await fetchProductImageFromWebsite(product.slug);
    
    if (imageUrl) {
      const success = await fixProductImage(product, imageUrl);
      if (success) {
        continue;
      }
    }
    
    console.log(`⚠ Could not find image for ${product.name}. Manual upload needed.`);
  }
  
  console.log('\n=== Done ===');
}

main().catch(console.error);


