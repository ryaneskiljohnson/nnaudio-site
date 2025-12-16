import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

async function fetchProductPageHtml(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }
      let html = '';
      response.on('data', (chunk) => html += chunk);
      response.on('end', () => resolve(html));
    }).on('error', () => resolve(null));
  });
}

async function addToyboxLogo() {
  console.log('Fetching Toybox page...\n');
  
  const html = await fetchProductPageHtml('https://nnaud.io/product/toybox-retro-free-plugin-download/');
  
  if (!html) {
    console.log('Failed to fetch page');
    return;
  }

  // Look for all images and find potential logo
  const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  const images: string[] = [];
  let imgMatch;
  
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    const url = imgMatch[1].trim();
    if (url && 
        url.includes('toybox') && 
        !url.includes('NNPurp') &&
        !url.includes('logo1') &&
        url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      images.push(url);
    }
  }

  console.log(`Found ${images.length} Toybox images:\n`);
  images.forEach((img, idx) => {
    console.log(`${idx + 1}. ${img}`);
  });

  if (images.length > 0) {
    // Use the first unique-looking image as logo
    const logoUrl = images[0];
    console.log(`\nDownloading logo: ${logoUrl}`);
    
    const imageBuffer = await downloadImage(logoUrl);
    
    if (!imageBuffer) {
      console.log('Failed to download logo');
      return;
    }

    console.log(`Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`);

    // Upload to Supabase
    const fileName = 'toybox-retro-logo.webp';
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    const newLogoUrl = urlData.publicUrl;
    console.log('Uploaded to:', newLogoUrl);

    // Update the second Toybox product (the duplicate) with the logo
    const { error: updateError } = await supabase
      .from('products')
      .update({ logo_url: newLogoUrl })
      .eq('id', '8fdb05c5-baec-4e4d-a1a0-aa087367f3f8'); // Toybox-Retro (plugin)

    if (updateError) {
      console.error('Update error:', updateError.message);
    } else {
      console.log('✅ Updated Toybox-Retro with logo!');
    }
  }
}

addToyboxLogo();

