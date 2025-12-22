import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import https from 'https';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const TEMP_DIR = path.join(process.cwd(), 'temp-images');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const PRODUCT_IMAGES = [
  {
    productSlug: 'tetrad-keys',
    productName: 'Tetrad Keys',
    imageUrl: 'https://nnaud.io/wp-content/uploads/2024/01/TetradKeysScreenshot.webp',
    fileName: 'tetrad-keys-featured.webp',
  },
  {
    productSlug: 'tetrad-guitars',
    productName: 'Tetrad Guitars',
    imageUrl: 'https://nnaud.io/wp-content/uploads/2024/01/TetradGuitarsScreenshot.webp',
    fileName: 'tetrad-guitars-featured.webp',
  },
  {
    productSlug: 'tetrad-winds',
    productName: 'Tetrad Winds',
    imageUrl: 'https://nnaud.io/wp-content/uploads/2024/01/TetradWindsScreenshot.webp',
    fileName: 'tetrad-winds-featured.webp',
  },
];

async function downloadFile(url: string, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          downloadFile(response.headers.location, filePath).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.error(`  ❌ Failed to download: HTTP ${response.statusCode}`);
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        resolve(false);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      console.error(`  ❌ Error downloading: ${err.message}`);
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      resolve(false);
    });
  });
}

async function uploadToSupabase(filePath: string, fileName: string, contentType: string = 'image/webp'): Promise<string | null> {
  const adminSupabase = await createAdminClient();
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = adminSupabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`  ❌ Error uploading: ${error.message}`);
    return null;
  }
}

async function downloadAndUpdateImages() {
  console.log('=== Downloading and Updating Tetrad Product Images ===\n');

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

    // Download image
    const tempFilePath = path.join(TEMP_DIR, productImage.fileName);
    console.log(`  Downloading from: ${productImage.imageUrl}`);
    
    const downloaded = await downloadFile(productImage.imageUrl, tempFilePath);
    
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

  console.log('✅ Completed updating Tetrad product images!');
}

downloadAndUpdateImages().catch(console.error);

