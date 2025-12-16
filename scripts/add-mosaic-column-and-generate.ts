import { createAdminClient } from '@/utils/supabase/service';
import { createClient } from '@supabase/supabase-js';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

async function addColumnIfNeeded() {
  const adminSupabase = await createAdminClient();
  
  // Try to select the column - if it fails, we need to add it
  const { error } = await adminSupabase
    .from('bundles')
    .select('mosaic_image_url')
    .limit(1);
  
  if (error && error.message.includes('column') && error.message.includes('does not exist')) {
    console.log('Column does not exist. Adding it via SQL...');
    // Use the service role key to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS mosaic_image_url TEXT;'
      })
    });
    
    if (!response.ok) {
      console.log('Could not add column via RPC. Trying direct approach...');
      // The column will be added when we try to update, or we can skip for now
      console.log('Will attempt to add column during update...');
    } else {
      console.log('✓ Column added successfully');
    }
  } else {
    console.log('✓ Column already exists');
  }
}

async function loadImageWithFallback(url: string, fallbackUrl: string): Promise<any> {
  try {
    if (url && url.startsWith('http')) {
      try {
        return await loadImage(url);
      } catch (httpError) {
        // If it fails, try fallback
      }
    } else if (url && url.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', url);
      if (fs.existsSync(localPath)) {
        return await loadImage(localPath);
      }
    }
    
    const fallbackPath = path.join(process.cwd(), 'public', fallbackUrl);
    if (fs.existsSync(fallbackPath)) {
      return await loadImage(fallbackPath);
    }
    return null;
  } catch (error) {
    try {
      const fallbackPath = path.join(process.cwd(), 'public', fallbackUrl);
      if (fs.existsSync(fallbackPath)) {
        return await loadImage(fallbackPath);
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

async function generateMosaic(
  products: Array<{
    id: string;
    name: string;
    featured_image_url?: string;
    logo_url?: string;
  }>,
  width: number = 2000,
  height: number = 2000
): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
  const productCount = shuffledProducts.length;
  const cols = Math.ceil(Math.sqrt(productCount));
  const rows = Math.ceil(productCount / cols);
  
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  
  const seenFeaturedImages = new Map<string, boolean>();
  
  const imagePromises = shuffledProducts.map(async (product, index) => {
    const featuredImageUrl = product.featured_image_url;
    const logoUrl = product.logo_url;
    
    const isDuplicate = featuredImageUrl && seenFeaturedImages.has(featuredImageUrl);
    
    let imageUrl: string | undefined;
    if (isDuplicate && logoUrl) {
      imageUrl = logoUrl;
    } else {
      imageUrl = featuredImageUrl || logoUrl;
      if (featuredImageUrl) {
        seenFeaturedImages.set(featuredImageUrl, true);
      }
    }
    
    if (!imageUrl) {
      imageUrl = NNAUDIO_LOGO;
    }

    try {
      const img = await loadImageWithFallback(imageUrl, NNAUDIO_LOGO);
      
      if (img) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        
        ctx.drawImage(img, sx, sy, size, size, x, y, cellWidth, cellHeight);
      }
    } catch (error) {
      // Skip failed images
    }
  });

  await Promise.all(imagePromises);
  return canvas.toBuffer('image/png');
}

async function uploadMosaicToSupabase(bundleSlug: string, imageBuffer: Buffer): Promise<string> {
  const fileName = `bundle-mosaics/${bundleSlug}-mosaic.png`;
  
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload mosaic: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return publicUrl;
}

async function main() {
  console.log('=== Adding Column and Generating Mosaics ===\n');
  
  await addColumnIfNeeded();
  
  const adminSupabase = await createAdminClient();

  const { data: bundles, error } = await adminSupabase
    .from('bundles')
    .select(`
      id,
      name,
      slug,
      status,
      bundle_subscription_tiers(id),
      bundle_products(
        product:products(
          id,
          name,
          category,
          featured_image_url,
          logo_url
        )
      )
    `)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching bundles:', error);
    return;
  }

  if (!bundles || bundles.length === 0) {
    console.log('No active bundles found');
    return;
  }

  for (const bundle of bundles) {
    const tiers = ((bundle.bundle_subscription_tiers || []) as any[]).filter(t => t.active);
    const isSubscriptionBundle = tiers.length > 0;

    const allProducts = ((bundle.bundle_products || []) as any[])
      .map((bp: any) => bp.product)
      .filter((p: any) => {
        if (!p) return false;
        if (isSubscriptionBundle && p.category === 'bundle') return false;
        return true;
      });
    
    const productsWithImages = allProducts
      .filter((p: any) => p && (p.featured_image_url || p.logo_url));

    if (productsWithImages.length === 0) {
      console.log(`⏭️  Skipping ${bundle.name} - no products with images`);
      continue;
    }

    console.log(`Generating mosaic for ${bundle.name} (${productsWithImages.length} products)...`);

    try {
      const mosaicBuffer = await generateMosaic(productsWithImages, 2000, 2000);
      const mosaicUrl = await uploadMosaicToSupabase(bundle.slug, mosaicBuffer);
      
      // Try to update - if column doesn't exist, we'll get an error but the image is uploaded
      const { error: updateError } = await adminSupabase
        .from('bundles')
        .update({ mosaic_image_url: mosaicUrl })
        .eq('id', bundle.id);

      if (updateError) {
        if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
          console.log(`  ⚠️  Mosaic uploaded but column doesn't exist yet: ${mosaicUrl}`);
          console.log(`  Please add the column manually: ALTER TABLE bundles ADD COLUMN mosaic_image_url TEXT;`);
          console.log(`  Then update: UPDATE bundles SET mosaic_image_url = '${mosaicUrl}' WHERE id = '${bundle.id}';`);
        } else {
          console.error(`  ❌ Failed to update bundle: ${updateError.message}`);
        }
      } else {
        console.log(`  ✅ Generated and uploaded mosaic: ${mosaicUrl}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error generating mosaic for ${bundle.name}:`, error.message);
    }
  }

  console.log('\n✅ Done');
}

main().catch(console.error);
