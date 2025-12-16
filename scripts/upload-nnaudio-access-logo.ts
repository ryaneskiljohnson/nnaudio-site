import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'product-images';

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

async function processAndUploadLogo() {
  console.log('=== Processing and Uploading NNAudio Access Logo ===\n');

  const sourceImagePath = '/Users/rjmacbookpro/Development/NNAudioAccess/Assets/Images/logo.png';
  const tempOutputPath = '/tmp/nnaudio-access-logo-processed.png';
  
  // Check if source file exists
  if (!fs.existsSync(sourceImagePath)) {
    console.error(`❌ Source image file not found: ${sourceImagePath}`);
    return;
  }

  // Find NNAudio Access product
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, slug')
    .ilike('name', '%nnaudio access%')
    .limit(1);

  if (productError || !products || products.length === 0) {
    console.error('❌ NNAudio Access product not found');
    return;
  }

  const product = products[0];
  console.log(`Found product: ${product.name} (${product.slug})`);

  try {
    // Get dimensions of source image
    const identifyOutput = execSync(`identify -format "%w %h" "${sourceImagePath}"`, { encoding: 'utf-8' });
    const [width, height] = identifyOutput.trim().split(' ').map(Number);
    
    console.log(`Source image dimensions: ${width}x${height}`);
    
    // Create a square that's 20% larger than the largest dimension to add padding
    const maxDimension = Math.max(width, height);
    const squareSize = Math.ceil(maxDimension * 1.2);
    
    console.log(`Creating ${squareSize}x${squareSize} black square with centered logo...`);
    
    // Use ImageMagick to:
    // 1. Create a black square
    // 2. Composite the logo centered on it
    const command = `convert -size ${squareSize}x${squareSize} xc:black "${sourceImagePath}" -gravity center -composite "${tempOutputPath}"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✓ Processed image saved to: ${tempOutputPath}`);
    
    // Read the processed image
    const imageBuffer = fs.readFileSync(tempOutputPath);
    
    // Generate filename based on slug
    const fileName = `${product.slug}-logo.png`;
    
    // Upload to Supabase
    console.log(`Uploading to Supabase: ${fileName}`);
    const supabaseUrl = await uploadToSupabase(fileName, imageBuffer);
    
    if (!supabaseUrl) {
      console.error('❌ Failed to upload image');
      return;
    }
    
    console.log(`✓ Uploaded: ${supabaseUrl}`);
    
    // Update database - use logo_url for the icon
    console.log(`Updating database...`);
    const { error: updateError } = await supabase
      .from('products')
      .update({ logo_url: supabaseUrl })
      .eq('id', product.id);
    
    if (updateError) {
      console.error(`❌ Failed to update database: ${updateError.message}`);
      return;
    }
    
    console.log(`✓ Successfully updated NNAudio Access logo!`);
    console.log(`  Product: ${product.name}`);
    console.log(`  Logo URL: ${supabaseUrl}`);
    
    // Clean up temp file
    if (fs.existsSync(tempOutputPath)) {
      fs.unlinkSync(tempOutputPath);
      console.log(`✓ Cleaned up temporary file`);
    }
  } catch (error: any) {
    console.error(`❌ Error processing image: ${error.message}`);
    if (fs.existsSync(tempOutputPath)) {
      fs.unlinkSync(tempOutputPath);
    }
  }
}

processAndUploadLogo().catch(console.error);

