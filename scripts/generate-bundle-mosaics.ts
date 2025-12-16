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

const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

async function loadImageWithFallback(url: string, fallbackUrl: string, retries: number = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (url && url.startsWith('http')) {
        // Try loading URL directly first (canvas library supports this)
        try {
          return await loadImage(url);
        } catch (directError) {
          // If direct load fails, try fetching and converting to buffer
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
            
            const response = await fetch(url, { 
              signal: controller.signal as any,
              headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/*'
              }
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              return await loadImage(buffer);
            }
          } catch (fetchError: any) {
            if (attempt < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); // Exponential backoff
              continue;
            }
          }
        }
      } else if (url && url.startsWith('/')) {
        // Local file path
        const localPath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(localPath)) {
          return await loadImage(localPath);
        }
      }
      
      // Try fallback
      const fallbackPath = path.join(process.cwd(), 'public', fallbackUrl);
      if (fs.existsSync(fallbackPath)) {
        return await loadImage(fallbackPath);
      }
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      // Final fallback attempt
      try {
        const fallbackPath = path.join(process.cwd(), 'public', fallbackUrl);
        if (fs.existsSync(fallbackPath)) {
          return await loadImage(fallbackPath);
        }
      } catch {
        // Ignore
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
    
    // If no image at all, use NNAudio logo as fallback
    if (!imageUrl) {
      imageUrl = NNAUDIO_LOGO;
    }

    // ALWAYS draw something for each product - calculate position first
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth;
    const y = row * cellHeight;
    
    try {
      let img = await loadImageWithFallback(imageUrl, NNAUDIO_LOGO, 3);
      
      // Validate image has valid dimensions
      if (!img || img.width === 0 || img.height === 0) {
        // If image failed and it's not already the logo, try logo as fallback
        if (imageUrl !== NNAUDIO_LOGO) {
          const logoPath = path.join(process.cwd(), 'public', NNAUDIO_LOGO);
          if (fs.existsSync(logoPath)) {
            try {
              const logoImg = await loadImage(logoPath);
              if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
                img = logoImg;
              }
            } catch {
              // Ignore
            }
          }
        }
      }
      
      // Draw the image or fallback
      if (img && img.width > 0 && img.height > 0) {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        
        ctx.drawImage(img, sx, sy, size, size, x, y, cellWidth, cellHeight);
        loadedCount++;
      } else {
        // Draw NNAudio logo as fallback if available
        const logoPath = path.join(process.cwd(), 'public', NNAUDIO_LOGO);
        if (fs.existsSync(logoPath)) {
          try {
            const logoImg = await loadImage(logoPath);
            if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
              const size = Math.min(logoImg.width, logoImg.height);
              const sx = (logoImg.width - size) / 2;
              const sy = (logoImg.height - size) / 2;
              ctx.drawImage(logoImg, sx, sy, size, size, x, y, cellWidth, cellHeight);
              loadedCount++;
            } else {
              // Draw placeholder if even logo fails
              ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
              ctx.fillRect(x, y, cellWidth, cellHeight);
              failedCount++;
              failedProducts.push(`${product.name}`);
            }
          } catch {
            // Draw placeholder if logo load fails
            ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
            ctx.fillRect(x, y, cellWidth, cellHeight);
            failedCount++;
            failedProducts.push(`${product.name}`);
          }
        } else {
          // Draw placeholder if logo file doesn't exist
          ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
          ctx.fillRect(x, y, cellWidth, cellHeight);
          failedCount++;
          failedProducts.push(`${product.name}`);
        }
      }
      
      if ((loadedCount + failedCount) % 10 === 0 || (loadedCount + failedCount) === shuffledProducts.length) {
        console.log(`    Processed ${loadedCount + failedCount}/${shuffledProducts.length} images (${loadedCount} loaded, ${failedCount} placeholders)...`);
      }
    } catch (error: any) {
      // Even on error, draw logo or placeholder
      const logoPath = path.join(process.cwd(), 'public', NNAUDIO_LOGO);
      if (fs.existsSync(logoPath)) {
        try {
          const logoImg = await loadImage(logoPath);
          if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
            const size = Math.min(logoImg.width, logoImg.height);
            const sx = (logoImg.width - size) / 2;
            const sy = (logoImg.height - size) / 2;
            ctx.drawImage(logoImg, sx, sy, size, size, x, y, cellWidth, cellHeight);
            loadedCount++;
          } else {
            ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
            ctx.fillRect(x, y, cellWidth, cellHeight);
            failedCount++;
            failedProducts.push(`${product.name}`);
          }
        } catch {
          ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
          ctx.fillRect(x, y, cellWidth, cellHeight);
          failedCount++;
          failedProducts.push(`${product.name}`);
        }
      } else {
        ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
        ctx.fillRect(x, y, cellWidth, cellHeight);
        failedCount++;
        failedProducts.push(`${product.name}`);
      }
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
    
    const productsWithImages = allProducts
      .filter((p: any) => p && (p.featured_image_url || p.logo_url));

    if (productsWithImages.length === 0) {
      console.log(`⏭️  Skipping ${bundle.name} - no products with images`);
      continue;
    }

    console.log(`Generating mosaic for ${bundle.name} (${productsWithImages.length} products)...`);

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
