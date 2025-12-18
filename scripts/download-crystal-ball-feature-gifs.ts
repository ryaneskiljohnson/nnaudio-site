import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import https from 'https';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const TEMP_DIR = path.join(__dirname, '../temp-feature-gifs');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Feature GIFs from the old site
const featureGifs = [
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/06/CrystalBall-Features-Randomize.gif',
    fileName: 'crystal-ball-features-randomize.gif',
    featureTitle: 'Generate Infinite Effects'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/06/CrystalBall-Features-Presets.gif',
    fileName: 'crystal-ball-features-presets.gif',
    featureTitle: '250 Stock Presets'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/06/CrystalBall-Features-MIDIcc.gif',
    fileName: 'crystal-ball-features-midi-cc.gif',
    featureTitle: 'MIDI CC + Learn'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/06/CrystalBall-Features-GUI.gif',
    fileName: 'crystal-ball-features-gui.gif',
    featureTitle: 'Intuitive GUI'
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
        fs.unlinkSync(filePath);
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
        contentType: 'image/gif',
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

async function downloadAndUploadFeatureGifs() {
  console.log('=== Downloading and Uploading Crystal Ball Feature GIFs ===\n');

  const adminSupabase = await createAdminClient();

  // Get the product
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, name, slug, features')
    .or('slug.eq.crystal-ball-magic-multi-effect,slug.eq.crystal-ball-magic-effect,name.ilike.%crystal ball%')
    .limit(1)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log(`Found product: ${product.name} (${product.id})\n`);

  const updatedFeatures = [...(product.features || [])];
  let uploadedCount = 0;

  // Download and upload each GIF, then match to features
  for (const gif of featureGifs) {
    console.log(`Processing: ${gif.featureTitle}`);
    console.log(`  URL: ${gif.url}`);
    
    const tempFilePath = path.join(TEMP_DIR, gif.fileName);
    
    process.stdout.write(`  Downloading... `);
    const downloaded = await downloadFile(gif.url, tempFilePath);
    
    if (!downloaded) {
      console.log('✗');
      continue;
    }

    const stats = fs.statSync(tempFilePath);
    console.log(`✓ (${(stats.size / 1024).toFixed(1)}KB)`);

    process.stdout.write(`  Uploading to Supabase... `);
    const supabaseUrl = await uploadToSupabase(tempFilePath, gif.fileName);
    
    if (!supabaseUrl) {
      console.log('✗');
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      continue;
    }

    console.log(`✓`);
    console.log(`  Supabase URL: ${supabaseUrl}\n`);

    // Find matching feature and update it
    const featureIndex = updatedFeatures.findIndex((f: any) => {
      const title = typeof f === 'string' ? f : f.title;
      return title && title.toLowerCase().includes(gif.featureTitle.toLowerCase().split(' ')[0]);
    });

    if (featureIndex !== -1) {
      const feature = updatedFeatures[featureIndex];
      if (typeof feature === 'object') {
        updatedFeatures[featureIndex] = {
          ...feature,
          image_url: supabaseUrl
        };
        uploadedCount++;
      } else {
        // Convert string to object
        updatedFeatures[featureIndex] = {
          title: feature,
          description: '',
          image_url: supabaseUrl
        };
        uploadedCount++;
      }
    } else {
      console.log(`  ⚠️  Could not find matching feature for: ${gif.featureTitle}`);
    }

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }

  // Update the product with new feature URLs
  console.log(`\nUpdating product with ${uploadedCount} feature images...`);
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ features: updatedFeatures })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Crystal Ball features with GIF images');
  console.log(`   Updated ${uploadedCount} features with images`);

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

downloadAndUploadFeatureGifs().catch(console.error);

