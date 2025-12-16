import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

async function uploadCymasphereImage() {
  console.log('=== Uploading Cymasphere Image ===\n');

  const imagePath = '/Users/rjmacbookpro/Desktop/Cymasphere v2 Images/cymasphere_square.png';
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    return;
  }

  // Find Cymasphere product
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, slug')
    .ilike('name', '%cymasphere%')
    .limit(1);

  if (productError || !products || products.length === 0) {
    console.error('❌ Cymasphere product not found');
    return;
  }

  const product = products[0];
  console.log(`Found product: ${product.name} (${product.slug})`);

  // Read image file
  console.log(`Reading image from: ${imagePath}`);
  const imageBuffer = fs.readFileSync(imagePath);

  // Generate filename based on slug
  const fileName = `${product.slug}.png`;

  // Upload to Supabase
  console.log(`Uploading to Supabase: ${fileName}`);
  const supabaseUrl = await uploadToSupabase(fileName, imageBuffer);

  if (!supabaseUrl) {
    console.error('❌ Failed to upload image');
    return;
  }

  console.log(`✓ Uploaded: ${supabaseUrl}`);

  // Update database
  console.log(`Updating database...`);
  const { error: updateError } = await supabase
    .from('products')
    .update({ featured_image_url: supabaseUrl })
    .eq('id', product.id);

  if (updateError) {
    console.error(`❌ Failed to update database: ${updateError.message}`);
    return;
  }

  console.log(`✓ Successfully updated Cymasphere product image!`);
  console.log(`  Product: ${product.name}`);
  console.log(`  Image URL: ${supabaseUrl}`);
}

uploadCymasphereImage().catch(console.error);

