import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const TEMP_DIR = path.join(process.cwd(), 'temp-images');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

interface ProductImage {
  productSlug: string;
  productName: string;
  imageUrl: string;
  fileName: string;
}

const PRODUCT_IMAGES: ProductImage[] = [
  {
    productSlug: 'tetrad-keys',
    productName: 'Tetrad Keys',
    imageUrl: 'https://nnaud.io/product/free-tetrad-keys-plugin/',
    fileName: 'tetrad-keys-featured.webp',
  },
  {
    productSlug: 'tetrad-guitars',
    productName: 'Tetrad Guitars',
    imageUrl: 'https://nnaud.io/product/free-tetrad-guitars-plugin/',
    fileName: 'tetrad-guitars-featured.webp',
  },
  {
    productSlug: 'tetrad-winds',
    productName: 'Tetrad Winds',
    imageUrl: 'https://nnaud.io/product/free-tetrad-winds-plugin/',
    fileName: 'tetrad-winds-featured.webp',
  },
];

async function downloadFile(url: string, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return downloadFile(response.headers.location!, filePath).then(resolve);
      }
      
      if (response.statusCode !== 200) {
        console.error(`  Failed to download: HTTP ${response.statusCode}`);
        resolve(false);
        return;
      }
      
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      
      fileStream.on('error', (err) => {
        console.error(`  File write error:`, err);
        fs.unlink(filePath, () => {});
        resolve(false);
      });
    }).on('error', (err) => {
      console.error(`  Download error:`, err);
      resolve(false);
    });
  });
}

async function extractImageFromPage(htmlUrl: string): Promise<string | null> {
  try {
    const html = await new Promise<string>((resolve, reject) => {
      const protocol = htmlUrl.startsWith('https') ? https : http;
      
      protocol.get(htmlUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          return extractImageFromPage(response.headers.location!).then(resolve).catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => resolve(data));
        response.on('error', reject);
      }).on('error', reject);
    });

    // Try to find featured image in meta tags
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      return ogImageMatch[1];
    }

    // Try to find featured image in WordPress format
    const wpImageMatch = html.match(/wp-image-\d+["'][^>]*src=["']([^"']+)["']/i);
    if (wpImageMatch) {
      return wpImageMatch[1];
    }

    // Try to find any large image in the content
    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      const imgUrl = match[1];
      // Prefer images from wp-content/uploads
      if (imgUrl.includes('wp-content/uploads') && !imgUrl.includes('logo') && !imgUrl.includes('icon')) {
        return imgUrl;
      }
    }

    return null;
  } catch (error) {
    console.error(`  Error extracting image from page:`, error);
    return null;
  }
}

async function uploadToSupabase(filePath: string, fileName: string, contentType: string = 'image/webp'): Promise<string | null> {
  try {
    const supabase = await createAdminClient();
    
    const fileBuffer = fs.readFileSync(filePath);
    
    const storagePath = `product-images/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      console.error(`  Upload error:`, error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    console.error(`  Upload error:`, error);
    return null;
  }
}

async function downloadAndAssociateImages() {
  console.log('=== Downloading and Associating Tetrad Product Images ===\n');

  const supabase = await createAdminClient();

  for (const productImage of PRODUCT_IMAGES) {
    console.log(`Processing ${productImage.productName}...`);
    
    // Get product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, featured_image_url')
      .eq('slug', productImage.productSlug)
      .single();

    if (productError || !product) {
      console.error(`  ❌ Product not found: ${productImage.productSlug}`);
      continue;
    }

    console.log(`  Found product: ${product.name} (${product.id})`);

    // Extract image URL from the page
    console.log(`  Extracting image from: ${productImage.imageUrl}`);
    const imageUrl = await extractImageFromPage(productImage.imageUrl);
    
    if (!imageUrl) {
      console.log(`  ⚠️  Could not extract image URL from page, skipping...`);
      continue;
    }

    console.log(`  Found image URL: ${imageUrl}`);

    // Download image
    const tempFilePath = path.join(TEMP_DIR, productImage.fileName);
    console.log(`  Downloading image...`);
    
    const downloaded = await downloadFile(imageUrl, tempFilePath);
    
    if (!downloaded) {
      console.log(`  ❌ Failed to download image`);
      continue;
    }

    const stats = fs.statSync(tempFilePath);
    console.log(`  ✓ Downloaded (${(stats.size / 1024).toFixed(1)}KB)`);

    // Upload to Supabase
    console.log(`  Uploading to Supabase...`);
    const supabaseUrl = await uploadToSupabase(tempFilePath, productImage.fileName, 'image/webp');
    
    if (!supabaseUrl) {
      console.log(`  ❌ Failed to upload image`);
      continue;
    }

    console.log(`  ✓ Uploaded: ${supabaseUrl}`);

    // Update product with image URL
    console.log(`  Updating product...`);
    const { error: updateError } = await supabase
      .from('products')
      .update({ featured_image_url: supabaseUrl })
      .eq('id', product.id);

    if (updateError) {
      console.error(`  ❌ Error updating product:`, updateError);
    } else {
      console.log(`  ✅ Successfully updated ${product.name} with image\n`);
    }

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  // Clean up temp directory
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }

  console.log('✅ Completed downloading and associating Tetrad product images!');
}

downloadAndAssociateImages().catch(console.error);

