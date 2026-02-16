import { createAdminClient } from '@/utils/supabase/service';
import { createClient } from '@supabase/supabase-js';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/** Load image from URL or local path. No fallback - returns null on failure. */
async function loadImageOnly(url: string, retries: number = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (url && url.startsWith('http')) {
        try {
          return await loadImage(url);
        } catch {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const response = await fetch(url, {
              signal: controller.signal as any,
              headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }
            });
            clearTimeout(timeoutId);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              return await loadImage(buffer);
            }
          } catch {
            if (attempt < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
              continue;
            }
          }
        }
      } else if (url && url.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(localPath)) return await loadImage(localPath);
      }
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
    }
  }
  return null;
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

  // Randomize the order of products
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

  // Calculate grid dimensions
  const productCount = shuffledProducts.length;
  const cols = Math.ceil(Math.sqrt(productCount));
  const rows = Math.ceil(productCount / cols);
  
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  
  // Track seen featured images to detect duplicates
  const seenFeaturedImages = new Map<string, boolean>();
  
  // Load and draw images - wait for ALL to complete
  console.log(`  Loading ${shuffledProducts.length} images (this may take a while)...`);
  let loadedCount = 0;
  let failedCount = 0;
  const failedProducts: string[] = [];
  
  const imagePromises = shuffledProducts.map(async (product, index) => {
    const featuredImageUrl = product.featured_image_url;
    const logoUrl = product.logo_url;
    
    // Check if this featured image has been seen before
    const isDuplicate = featuredImageUrl && seenFeaturedImages.has(featuredImageUrl);
    
    // If duplicate, use logo instead; otherwise use featured image, then logo as fallback
    let imageUrl: string | undefined;
    if (isDuplicate && logoUrl) {
      imageUrl = logoUrl;
    } else {
      imageUrl = featuredImageUrl || logoUrl;
      if (featuredImageUrl) {
        seenFeaturedImages.set(featuredImageUrl, true);
      }
    }
    
    // ALWAYS draw something for each product - calculate position first
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth;
    const y = row * cellHeight;
    
    try {
      const img = imageUrl ? await loadImageOnly(imageUrl, 3) : null;
      if (img && img.width > 0 && img.height > 0) {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, x, y, cellWidth, cellHeight);
        loadedCount++;
      } else {
        ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
        ctx.fillRect(x, y, cellWidth, cellHeight);
        failedCount++;
        failedProducts.push(`${product.name}`);
      }
      
      if ((loadedCount + failedCount) % 10 === 0 || (loadedCount + failedCount) === shuffledProducts.length) {
        console.log(`    Processed ${loadedCount + failedCount}/${shuffledProducts.length} images (${loadedCount} loaded, ${failedCount} placeholders)...`);
      }
    } catch (error: any) {
      ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
      ctx.fillRect(x, y, cellWidth, cellHeight);
      failedCount++;
      failedProducts.push(`${product.name}`);
      if (failedCount <= 5) {
      console.warn(`    ⚠️  Error loading image for ${product.name}: ${error.message}`);
      }
    }
  });

  await Promise.all(imagePromises);
  console.log(`  ✓ Completed: ${loadedCount} loaded, ${failedCount} failed`);
  if (failedCount > 0) {
    console.log(`  Failed products (first 10): ${failedProducts.slice(0, 10).join(', ')}`);
  }

  return canvas.toBuffer('image/png');
}

async function uploadMosaicToSupabase(bundleId: string, bundleSlug: string, imageBuffer: Buffer): Promise<string> {
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

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return publicUrl;
}

async function generateAllMosaics() {
  console.log('=== Generating Bundle Mosaics ===\n');

  const adminSupabase = await createAdminClient();

  // Get all active bundles with their products
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

    // Extract products (filter out bundle products for elite bundles)
    const allProducts = ((bundle.bundle_products || []) as any[])
      .map((bp: any) => bp.product)
      .filter((p: any) => {
        if (!p) return false;
        if (isSubscriptionBundle && p.category === 'bundle') return false;
        return true;
      });
    
    const withImages = allProducts.filter((p: any) => p && (p.featured_image_url || p.logo_url));
    // Deduplicate by product id then by canonical image URL (no duplicate thumbnails)
    const canonicalImageUrl = (url: string) =>
      (url || '').trim().toLowerCase().replace(/#.*$/, '').replace(/\?.*$/, '').replace(/\/+$/, '') || '';
    const seenProductId = new Set<string>();
    const seenImageUrl = new Set<string>();
    const productsWithImages = withImages.filter((p: any) => {
      if (!p?.id || seenProductId.has(p.id)) return false;
      const url = p.featured_image_url || p.logo_url || '';
      const canonical = canonicalImageUrl(url);
      if (!canonical || seenImageUrl.has(canonical)) return false;
      seenProductId.add(p.id);
      seenImageUrl.add(canonical);
      return true;
    });

    if (productsWithImages.length === 0) {
      console.log(`⏭️  Skipping ${bundle.name} - no products with images`);
      continue;
    }

    console.log(`Generating mosaic for ${bundle.name} (${productsWithImages.length} unique thumbnails)...`);

    try {
      // Generate high-resolution square mosaic (2000x2000)
      const mosaicBuffer = await generateMosaic(productsWithImages, 2000, 2000);
      
      // Upload to Supabase
      const mosaicUrl = await uploadMosaicToSupabase(bundle.id, bundle.slug, mosaicBuffer);
      
      // Update bundle with mosaic URL
      const { error: updateError } = await adminSupabase
        .from('bundles')
        .update({ mosaic_image_url: mosaicUrl })
        .eq('id', bundle.id);

      if (updateError) {
        console.error(`  ❌ Failed to update bundle: ${updateError.message}`);
      } else {
        console.log(`  ✅ Generated and uploaded mosaic: ${mosaicUrl}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error generating mosaic for ${bundle.name}:`, error.message);
    }
  }

  console.log('\n✅ Done generating all mosaics');
}

generateAllMosaics().catch(console.error);
