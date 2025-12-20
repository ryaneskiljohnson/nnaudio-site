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

const FEATURE_IMAGES = [
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/01/DigitalEchoes-Delays.webp',
    fileName: 'digital-echoes-features-delays.webp',
    featureTitle: '3 Powerful Delays'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/01/DigitalEchoes-Effects.webp',
    fileName: 'digital-echoes-features-effects.webp',
    featureTitle: 'Additional Multi-Effects'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/01/DigitalEchoes-Visuals.webp',
    fileName: 'digital-echoes-features-visuals.webp',
    featureTitle: 'See Your Sound & Space'
  }
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
  console.log('=== Downloading and Uploading Digital Echoes Images ===\n');

  const adminSupabase = await createAdminClient();

  // Get Digital Echoes product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features')
    .or('slug.eq.digital-echoes-delay,slug.eq.digital-echoes,name.ilike.%digital echoes%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Download GUI image (main interface image)
  const guiImageUrl = 'https://nnaud.io/wp-content/uploads/2023/05/echoes-gui.webp';
  const guiFileName = 'digital-echoes-gui.webp';
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
        console.log('✅ Successfully updated Digital Echoes with GUI image');
      }
    }
  }

  // Download and upload feature images
  console.log('\n=== Downloading Feature Images ===\n');
  const updatedFeatures = [...(product.features || [])];
  const featureMap = new Map(updatedFeatures.map((f: any) => [f.title, f]));

  for (const img of FEATURE_IMAGES) {
    const tempFilePath = path.join(TEMP_DIR, img.fileName);

    console.log(`Processing: ${img.featureTitle}`);
    console.log(`  Source: ${img.url}`);
    process.stdout.write('  Downloading... ');
    
    const downloaded = await downloadFile(img.url, tempFilePath);
    
    if (!downloaded) {
      console.log('✗');
      continue;
    }

    const stats = fs.statSync(tempFilePath);
    console.log(`✓ (${(stats.size / 1024).toFixed(1)}KB)`);

    process.stdout.write('  Uploading to Supabase... ');
    const supabaseUrl = await uploadToSupabase(tempFilePath, img.fileName, 'image/webp');
    
    if (!supabaseUrl) {
      console.log('✗');
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      continue;
    }

    console.log(`✓`);
    console.log(`  Supabase URL: ${supabaseUrl}\n`);

    // Update the feature with the image URL
    const feature = featureMap.get(img.featureTitle);
    if (feature) {
      feature.image_url = supabaseUrl;
    } else {
      // Find by partial match
      const matchingFeature = updatedFeatures.find((f: any) => 
        f.title && f.title.toLowerCase().includes(img.featureTitle.toLowerCase().split(' ')[0])
      );
      if (matchingFeature) {
        matchingFeature.image_url = supabaseUrl;
      }
    }

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }

  // Update product with updated features
  if (updatedFeatures.some((f: any) => f.image_url)) {
    console.log('Updating product with feature images...');
    const { error: updateError } = await adminSupabase
      .from('products')
      .update({ features: updatedFeatures })
      .eq('id', product.id);

    if (updateError) {
      console.error('❌ Error updating product:', updateError);
    } else {
      console.log('✅ Successfully updated Digital Echoes features with images!');
    }
  }

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

downloadAndUploadImages().catch(console.error);



