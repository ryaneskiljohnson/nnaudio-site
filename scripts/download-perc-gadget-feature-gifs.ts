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
    url: 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-Features-SampleEditor-1.gif',
    fileName: 'perc-gadget-features-sample-editor.gif',
    featureTitle: '6 Customizable Arps'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-Features-RhythmShuffle-1.gif',
    fileName: 'perc-gadget-features-rhythm-shuffle.gif',
    featureTitle: 'Randomize Your Rhythm'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-Features-SampleShuffle-1.gif',
    fileName: 'perc-gadget-features-sample-shuffle.gif',
    featureTitle: 'Randomize Your Samples'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-Features-SampleImport-1.gif',
    fileName: 'perc-gadget-features-sample-import.gif',
    featureTitle: 'Use Your Own Samples'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-Features-FX-OneTouchGen-1.gif',
    fileName: 'perc-gadget-features-fx-one-touch.gif',
    featureTitle: 'One-Touch Generator + FX'
  },
  {
    url: 'https://nnaud.io/wp-content/uploads/2024/04/PercGadget-Features-ResizeGUI-1.gif',
    fileName: 'perc-gadget-features-resize-gui.gif',
    featureTitle: 'Intuitive & Resizable GUI'
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
  console.log('=== Downloading and Uploading Perc Gadget Feature GIFs ===\n');

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

  const updatedFeatures = [...(product.features || [])];
  const featureMap = new Map(updatedFeatures.map((f: any) => [f.title, f]));

  // Download and upload each GIF
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
  console.log('Updating product with feature images...');
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ features: updatedFeatures })
    .eq('id', product.id);

  if (updateError) {
    console.error('❌ Error updating product:', updateError);
    return;
  }

  console.log('✅ Successfully updated Perc Gadget features with GIF images!');

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

downloadAndUploadFeatureGifs().catch(console.error);



