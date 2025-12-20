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

async function downloadAndUploadImages() {
  console.log('=== Downloading and Uploading Perc Gadget Images ===\n');

  const adminSupabase = await createAdminClient();

  // Get Perc Gadget product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features')
    .or('slug.eq.perc-gadget,slug.eq.perc-gadget-rhythm-generator,name.ilike.%perc gadget%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Download GUI image
  const guiImageUrl = 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-GUI.webp';
  const guiFileName = 'perc-gadget-gui.webp';
  const guiFilePath = path.join(TEMP_DIR, guiFileName);

  console.log(`Downloading GUI image: ${guiImageUrl}`);
  process.stdout.write('  Downloading... ');
  
  const downloaded = await downloadFile(guiImageUrl, guiFilePath);
  
  if (!downloaded) {
    console.log('✗');
  } else {
    const stats = fs.statSync(guiFilePath);
    console.log(`✓ (${(stats.size / 1024).toFixed(1)}KB)`);

    process.stdout.write('  Uploading to Supabase... ');
    const supabaseUrl = await uploadToSupabase(guiFilePath, guiFileName, 'image/webp');
    
    if (!supabaseUrl) {
      console.log('✗');
    } else {
      console.log(`✓`);
      console.log(`  Supabase URL: ${supabaseUrl}\n`);

      // Update product with background image URL
      const { error: updateError } = await adminSupabase
        .from('products')
        .update({ background_image_url: supabaseUrl })
        .eq('id', product.id);

      if (updateError) {
        console.error('❌ Error updating product:', updateError);
      } else {
        console.log('✅ Successfully updated Perc Gadget with GUI image');
      }
    }
  }

  // Clean up temp files
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

downloadAndUploadImages().catch(console.error);



