import { createClient } from '@supabase/supabase-js';
import https from 'https';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

// Remaining products that need fixing with their slugs
const PRODUCTS_TO_FIX = [
  { id: '18b115c0-eb3a-4312-9031-e232bc546b07', slug: 'rompl-workstation-trial', name: 'Rompl Workstation Trial' },
  { id: 'e579dbd6-8b3d-451d-a5f9-8b1066e34b89', slug: 'digitaldreamscape-full', name: 'DigitalDreamscape FULL' },
];

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    https.get(url, (response) => {
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
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

async function fetchProductPageHtml(slug: string): Promise<string | null> {
  const url = `https://nnaud.io/product/${slug}`;
  
  return new Promise((resolve) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          const redirectUrl = response.headers.location;
          https.get(redirectUrl, (redirectResponse) => {
            if (redirectResponse.statusCode !== 200) {
              resolve(null);
              return;
            }
            let html = '';
            redirectResponse.on('data', (chunk) => html += chunk);
            redirectResponse.on('end', () => resolve(html));
          }).on('error', () => resolve(null));
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
    }).on('error', () => resolve(null));
  });
}

function extractImageUrls(html: string): string[] {
  const imageUrls: string[] = [];
  
  const ogImagePattern = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/gi;
  let match = ogImagePattern.exec(html);
  if (match && match[1]) {
    const url = match[1].trim();
    if (!url.includes('logo') && !url.includes('icon')) {
      imageUrls.push(url);
    }
  }

  const productImagePattern = /<img[^>]*(?:class="[^"]*(?:wp-post-image|attachment-woocommerce_single|product-image)[^"]*"|width=["'](?:[5-9]\d{2}|\d{4})[^"']*)[^>]*src=["']([^"']+)["']/gi;
  let productMatch;
  while ((productMatch = productImagePattern.exec(html)) !== null) {
    const url = productMatch[1].trim();
    if (url && !url.includes('logo') && !url.includes('icon') && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }

  const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch;
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    const url = imgMatch[1].trim();
    if (url && 
        !url.includes('logo') && 
        !url.includes('icon') &&
        !url.includes('NNPurp') &&
        !url.includes('spinner') &&
        !url.includes('placeholder') &&
        !imageUrls.includes(url) &&
        url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      imageUrls.push(url);
    }
  }

  return imageUrls;
}

async function uploadToSupabase(fileName: string, imageBuffer: Buffer): Promise<string | null> {
  try {
    const ext = path.extname(fileName).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif' ? 'image/gif' :
      'image/jpeg';

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

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`  ❌ Error uploading: ${error.message}`);
    return null;
  }
}

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

async function fixRemainingDuplicates() {
  console.log('=== Fixing Remaining Duplicates ===\n');

  let fixed = 0;
  let failed = 0;

  for (const product of PRODUCTS_TO_FIX) {
    console.log(`\n📦 Processing: ${product.name}`);
    console.log(`   Slug: ${product.slug}`);

    const html = await fetchProductPageHtml(product.slug);
    
    if (!html) {
      console.log(`  ⏭️  Skipping - page not accessible`);
      failed++;
      continue;
    }

    const imageUrls = extractImageUrls(html);
    
    if (imageUrls.length === 0) {
      console.log(`  ⚠️  No images found in HTML`);
      failed++;
      continue;
    }

    console.log(`  📸 Found ${imageUrls.length} potential images`);

    let success = false;
    for (const imageUrl of imageUrls) {
      console.log(`  🔍 Trying: ${imageUrl.substring(0, 80)}...`);
      
      const imageBuffer = await downloadImage(imageUrl);
      
      if (!imageBuffer || imageBuffer.length < 1000) {
        console.log(`  ❌ Failed to download or too small`);
        continue;
      }

      console.log(`  ✅ Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`);

      const ext = path.extname(new URL(imageUrl).pathname) || '.png';
      const fileName = `${product.slug}${ext}`;

      const newImageUrl = await uploadToSupabase(fileName, imageBuffer);
      
      if (!newImageUrl) {
        console.log(`  ❌ Failed to upload`);
        continue;
      }

      console.log(`  ✅ Uploaded to Supabase`);

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

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n=== SUMMARY ===\n');
  console.log(`Total products: ${PRODUCTS_TO_FIX.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
}

fixRemainingDuplicates().catch(console.error);

