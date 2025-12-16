import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import https from 'https';
import http from 'http';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  featured_image_url?: string;
  logo_url?: string;
}

// Product IDs with duplicate images from Group 1
const DUPLICATE_PRODUCT_IDS = [
  '847ef5be-32ea-405e-b0b1-023de4247f96', // MIDI Takeout Bundle
  'e01d9991-5f18-4c23-a459-bb4e0d951c8b', // Modern FX Bundle
  '0de3afc4-13c7-4965-80a0-6b257afe0c88', // Atmosphere Bundle
  '088e3794-0e94-4c3b-a255-2ef4d090d6fa', // Guitar Bundle
  '4ce5e019-9f08-4f18-a903-d9776deb625b', // Drum & Perc Bundle
  'af0833e9-ebe2-43ce-81cc-1b8f72e8a9c5', // Tactures
  'ad600e09-471d-4441-88d0-0a9228668fc4', // Orchestra Bundle
  '2cfb32e3-b48c-45d5-99aa-ae4cac46e905', // Summer Sample Pack Bundle 2024
  '0fae3a57-27dc-4019-a8cf-2aad4773b50d', // Orchestral Plugin Bundle
  '471fcf92-33de-4f64-b730-5e52887a5215', // Ultimate MIDI Collection 2
  'a5a5e9e1-3392-484a-b48f-4aca71fbb122', // Albanju
  '0ba4b698-da40-49a6-9bde-f363adccc3fa', // Apache Flute
  '9d441668-1d34-4385-9cbe-078b716f2241', // Rompl Workstation
  '28eece1b-df54-4593-82a7-e9a21d6c3fcb', // Evanescent Baby Grand Piano
  'a03c75f0-d5c3-4689-9124-a787dd351fe8', // Digital Echoes Delay
  'e013d27e-d73c-4372-b2af-8f54275cf76b', // Noker
  'eeeed3df-2486-4bc9-b43a-65f95b374e77', // Primal Cthulhu
  '900fa701-134f-49f0-a69c-22e5de52f8df', // Ultimate Drums & Percs 2
  '63e94ad5-c333-4bbb-8dd6-900e88924ecf', // Valentine MIDI Bundle + Free Plugin 2024
  '9fc3cd3b-eec8-44c8-a1a7-e1c7500611cd', // Modern Cthulhu 2
  '96368963-f066-45fd-a817-0c1c1a3e3618', // VSTAlarm FX Bundle
  'de75e8b5-cb98-46da-8498-0486e130384f', // All Guitar Bundle
  '271ccd34-95ce-44fe-8077-8f55845dae65', // Nice Pipes Bundle
  'b7d8bc91-c719-48a8-86b9-e71f0904afcb', // MIDI Library 2
  'c892fd79-0aa8-4b84-8932-d0f65ef5706d', // The Code
  '5b67e835-8f4b-46f7-ae07-cee6a033bfa5', // 20 For 20 MIDI Bundle 1
  '7f1935a6-317e-4bb7-9a6d-8a717a52fca9', // Ultimate Drums & Percs 1
  'd6f94b07-92b6-459d-8005-cebfd5b484f2', // Modern Song Constructions Bundle
  '6c05313b-6174-40ec-b736-856219e5979b', // Mesosphere
  '90bcf8a0-c3a0-487a-87ce-af085689ba49', // Analog Plugin Bundle
  '9d6020d0-ac39-4b11-8688-ead24f5c81ee', // Blaque
  'fb9c5795-103d-41c1-ad19-cf62f4826e6a', // SubFlux
  '9ddb2590-9bee-461e-9e19-5dd919472136', // Relaunch Plugin Bundle
  // Group 2
  '617ee8e3-1e68-44d9-aecb-6c127a252d23', // Drum & Bass Bundle
  '0adf3e5e-3e47-4639-8745-e2f94e011cb8', // Lutes Of The World Bundle
];

// Download image from URL
async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          downloadImage(response.headers.location).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

// Fetch HTML from nnaud.io product page
async function fetchProductPageHtml(slug: string): Promise<string | null> {
  const url = `https://nnaud.io/product/${slug}`;
  
  return new Promise((resolve) => {
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          const redirectUrl = response.headers.location;
          https.get(redirectUrl, (redirectResponse) => {
            if (redirectResponse.statusCode !== 200) {
              console.log(`  ❌ Redirect failed: ${redirectUrl}`);
              resolve(null);
              return;
            }
            let html = '';
            redirectResponse.on('data', (chunk) => html += chunk);
            redirectResponse.on('end', () => resolve(html));
          }).on('error', (err) => {
            console.log(`  ❌ Error fetching redirect: ${err.message}`);
            resolve(null);
          });
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.log(`  ❌ Page not found (${response.statusCode}): ${url}`);
        resolve(null);
        return;
      }

      let html = '';
      response.on('data', (chunk) => html += chunk);
      response.on('end', () => resolve(html));
    }).on('error', (err) => {
      console.log(`  ❌ Error fetching ${url}:`, err.message);
      resolve(null);
    });
  });
}

// Extract image URLs from HTML
function extractImageUrls(html: string, productName: string): string[] {
  const imageUrls: string[] = [];
  
  // Look for og:image meta tag (highest priority)
  const ogImagePattern = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/gi;
  let match = ogImagePattern.exec(html);
  if (match && match[1]) {
    const url = match[1].trim();
    if (!url.includes('logo') && !url.includes('icon')) {
      imageUrls.push(url);
    }
  }

  // Look for product gallery images (WordPress WooCommerce pattern)
  const wooGalleryPattern = /<div[^>]*class="[^"]*woocommerce-product-gallery[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi;
  let galleryMatch;
  while ((galleryMatch = wooGalleryPattern.exec(html)) !== null) {
    const url = galleryMatch[1].trim();
    if (url && !url.includes('logo') && !url.includes('icon') && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }

  // Look for img tags with product-specific classes or large sizes
  const productImagePattern = /<img[^>]*(?:class="[^"]*(?:wp-post-image|attachment-woocommerce_single|product-image)[^"]*"|width=["'](?:[5-9]\d{2}|\d{4})[^"']*)[^>]*src=["']([^"']+)["']/gi;
  let productMatch;
  while ((productMatch = productImagePattern.exec(html)) !== null) {
    const url = productMatch[1].trim();
    if (url && !url.includes('logo') && !url.includes('icon') && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }

  // Look for any img tags with high-res image URLs
  const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch;
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    const url = imgMatch[1].trim();
    if (url && 
        !url.includes('logo') && 
        !url.includes('icon') &&
        !url.includes('NNPurp') &&
        !url.includes('spinner') &&
        !imageUrls.includes(url) &&
        url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      imageUrls.push(url);
    }
  }

  return imageUrls;
}

// Upload image to Supabase
async function uploadToSupabase(fileName: string, imageBuffer: Buffer): Promise<string | null> {
  try {
    const ext = path.extname(fileName).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif' ? 'image/gif' :
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
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`  ❌ Error uploading: ${error.message}`);
    return null;
  }
}

// Update product image in database
async function updateProductImage(productId: string, imageUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ featured_image_url: imageUrl })
      .eq('id', productId);

    if (error) {
      console.error(`  ❌ Database update error: ${error.message}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`  ❌ Error updating database: ${error.message}`);
    return false;
  }
}

async function scrapeAndFixImages() {
  console.log('=== Scraping Images from nnaud.io ===\n');

  // Fetch all products with duplicates
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, logo_url')
    .in('id', DUPLICATE_PRODUCT_IDS);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products found');
    return;
  }

  console.log(`Found ${products.length} products to fix\n`);

  let fixed = 0;
  let failed = 0;

  for (const product of products) {
    console.log(`\n📦 Processing: ${product.name}`);
    console.log(`   Slug: ${product.slug}`);

    // Try to fetch from nnaud.io
    const html = await fetchProductPageHtml(product.slug);
    
    if (!html) {
      console.log(`  ⏭️  Skipping - page not accessible`);
      failed++;
      continue;
    }

    // Extract image URLs
    const imageUrls = extractImageUrls(html, product.name);
    
    if (imageUrls.length === 0) {
      console.log(`  ⚠️  No images found in HTML`);
      failed++;
      continue;
    }

    console.log(`  📸 Found ${imageUrls.length} potential images`);

    // Try each image URL
    let success = false;
    for (const imageUrl of imageUrls) {
      console.log(`  🔍 Trying: ${imageUrl.substring(0, 80)}...`);
      
      const imageBuffer = await downloadImage(imageUrl);
      
      if (!imageBuffer || imageBuffer.length < 1000) {
        console.log(`  ❌ Failed to download or too small`);
        continue;
      }

      console.log(`  ✅ Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`);

      // Generate filename from slug
      const ext = path.extname(new URL(imageUrl).pathname) || '.png';
      const fileName = `${product.slug}${ext}`;

      // Upload to Supabase
      const newImageUrl = await uploadToSupabase(fileName, imageBuffer);
      
      if (!newImageUrl) {
        console.log(`  ❌ Failed to upload`);
        continue;
      }

      console.log(`  ✅ Uploaded to Supabase`);

      // Update database
      const updated = await updateProductImage(product.id, newImageUrl);
      
      if (updated) {
        console.log(`  ✅ Database updated`);
        console.log(`  🎉 SUCCESS: ${product.name}`);
        fixed++;
        success = true;
        break;
      } else {
        console.log(`  ❌ Failed to update database`);
      }
    }

    if (!success) {
      console.log(`  ❌ FAILED: ${product.name}`);
      failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n=== SUMMARY ===\n');
  console.log(`Total products: ${products.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
}

scrapeAndFixImages().catch(console.error);

