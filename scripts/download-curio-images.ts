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

const FEATURE_GIFS = [
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/Curio-Features-Samplers.gif',
    fileName: 'curio-features-samplers.gif',
    featureTitle: '4 Customizable Samplers'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/Curio-Features-KeySelection.gif',
    fileName: 'curio-features-key-selection.gif',
    featureTitle: 'Create Any Key or Chord'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/Curio-Features-Randomizers.gif',
    fileName: 'curio-features-randomizers.gif',
    featureTitle: 'Dynamic Resonance'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/Curio-Features-Effects.gif',
    fileName: 'curio-features-effects.gif',
    featureTitle: 'Simple, Powerful Effects'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/Curio-Features-Presets.gif',
    fileName: 'curio-features-presets.gif',
    featureTitle: 'Stock Presets & Starters'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/Curio-Features-GUI.gif',
    fileName: 'curio-features-gui.gif',
    featureTitle: 'Intuitive Interface Design'
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

async function uploadToSupabase(filePath: string, fileName: string, contentType: string = 'image/gif'): Promise<string | null> {
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
  console.log('=== Downloading and Uploading Curio Images ===\n');

  const adminSupabase = await createAdminClient();

  // Get Curio product
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features')
    .or('slug.eq.curio-texture-generator,slug.eq.curio,name.ilike.%curio%')
    .limit(1)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  // Download GUI image
  const guiImageUrl = 'https://nnaud.io/wp-content/uploads/2024/04/Curio-GUI.jpg';
  const guiFileName = 'curio-gui.jpg';
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
    const supabaseUrl = await uploadToSupabase(guiFilePath, guiFileName, 'image/jpeg');
    
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
        console.log('✅ Successfully updated Curio with GUI image');
      }
    }
  }

  // Download and upload feature GIFs
  console.log('\n=== Downloading Feature GIFs ===\n');
  const updatedFeatures = [...(product.features || [])];
  const featureMap = new Map(updatedFeatures.map((f: any) => [f.title, f]));

  for (const gif of FEATURE_GIFS) {
    const tempFilePath = path.join(TEMP_DIR, gif.fileName);

    console.log(`Processing: ${gif.featureTitle}`);
    console.log(`  Source: ${gif.url}`);
    process.stdout.write('  Downloading... ');
    
    const downloaded = await downloadFile(gif.url, tempFilePath);
    
    if (!downloaded) {
      console.log('✗');
      continue;
    }

    const stats = fs.statSync(tempFilePath);
    console.log(`✓ (${(stats.size / 1024).toFixed(1)}KB)`);

    process.stdout.write('  Uploading to Supabase... ');
    const supabaseUrl = await uploadToSupabase(tempFilePath, gif.fileName, 'image/gif');
    
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
    const feature = featureMap.get(gif.featureTitle);
    if (feature) {
      feature.image_url = supabaseUrl;
    } else {
      // Find by partial match
      const matchingFeature = updatedFeatures.find((f: any) => 
        f.title && f.title.toLowerCase().includes(gif.featureTitle.toLowerCase().split(' ')[0])
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
      console.log('✅ Successfully updated Curio features with GIF images!');
    }
  }

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

downloadAndUploadImages().catch(console.error);



