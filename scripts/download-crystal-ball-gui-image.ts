import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import https from 'https';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const TEMP_DIR = path.join(__dirname, '../temp-images');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

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
        console.error(`  ❌ Failed to download: ${response.statusCode}`);
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

async function uploadToSupabase(filePath: string, fileName: string): Promise<string | null> {
  const adminSupabase = await createAdminClient();
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
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

async function downloadAndUploadGUIImage() {
  console.log('=== Downloading and Uploading Crystal Ball GUI Image ===\n');

  const imageUrl = 'https://nnaud.io/wp-content/uploads/2024/06/CrystalBall-GUI.jpg';
  const fileName = 'crystal-ball-gui.jpg';
  const tempFilePath = path.join(TEMP_DIR, fileName);

  console.log(`Downloading: ${imageUrl}`);
  process.stdout.write('  Downloading... ');
  
  const downloaded = await downloadFile(imageUrl, tempFilePath);
  
  if (!downloaded) {
    console.log('✗');
    return;
  }

  const stats = fs.statSync(tempFilePath);
  console.log(`✓ (${(stats.size / 1024).toFixed(1)}KB)`);

  process.stdout.write('  Uploading to Supabase... ');
  const supabaseUrl = await uploadToSupabase(tempFilePath, fileName);
  
  if (!supabaseUrl) {
    console.log('✗');
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    return;
  }

  console.log(`✓`);
  console.log(`  Supabase URL: ${supabaseUrl}\n`);

  // Update the product with the background image URL
  const adminSupabase = await createAdminClient();
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, name, slug')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log(`Updating product: ${product.name} (${product.id})`);
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ background_image_url: supabaseUrl })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Crystal Ball with GUI image');
  console.log(`   Background image URL: ${supabaseUrl}`);

  // Clean up temp file
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

downloadAndUploadGUIImage().catch(console.error);

