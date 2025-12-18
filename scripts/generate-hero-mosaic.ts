import { createAdminClient } from '@/utils/supabase/service';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

async function loadImageWithFallback(url: string, fallbackUrl: string, retries: number = 5): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (url && url.startsWith('http')) {
        // Try fetching first (more reliable than direct loadImage for remote URLs)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch(url, { 
            signal: controller.signal as any,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'image/*',
              'Accept-Encoding': 'gzip, deflate, br'
            }
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const img = await loadImage(buffer);
            if (img && img.width > 0 && img.height > 0) {
              return img;
            }
          }
        } catch (fetchError: any) {
          // Try direct loadImage as fallback
          try {
            const img = await loadImage(url);
            if (img && img.width > 0 && img.height > 0) {
              return img;
            }
          } catch (directError) {
            if (attempt < retries - 1) {
              const delay = 1000 * (attempt + 1);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
        }
      } else if (url && url.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(localPath)) {
          const img = await loadImage(localPath);
          if (img && img.width > 0 && img.height > 0) {
            return img;
          }
        }
      }
      
      // Try fallback logo
      const fallbackPath = path.join(process.cwd(), 'public', fallbackUrl);
      if (fs.existsSync(fallbackPath)) {
        const img = await loadImage(fallbackPath);
        if (img && img.width > 0 && img.height > 0) {
          return img;
        }
      }
    } catch (error: any) {
      if (attempt < retries - 1) {
        const delay = 1000 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // Final attempt with fallback
      try {
        const fallbackPath = path.join(process.cwd(), 'public', fallbackUrl);
        if (fs.existsSync(fallbackPath)) {
          const img = await loadImage(fallbackPath);
          if (img && img.width > 0 && img.height > 0) {
            return img;
          }
        }
      } catch {
        // Ignore
      }
    }
  }
  return null;
}

async function generateHeroMosaic(
  products: Array<{
    id: string;
    name: string;
    featured_image_url?: string;
    logo_url?: string;
  }>,
  width: number = 3000,
  height: number = 1000
): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Randomize the order of products - use a better shuffle algorithm
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

  // Calculate optimal grid layout for wide format (more columns than rows)
  const productCount = shuffledProducts.length;
  const aspectRatio = width / height;
  
  // Calculate optimal rows/cols based on aspect ratio
  let rows = Math.max(2, Math.round(Math.sqrt(productCount / aspectRatio)));
  let cols = Math.ceil(productCount / rows);
  
  // Ensure we fill the space nicely
  while (rows * cols < productCount) {
    cols++;
  }
  
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  
  // Track seen images to handle duplicates
  const seenImages = new Map<string, boolean>();
  
  console.log(`  Loading ${shuffledProducts.length} images for hero mosaic (${cols}x${rows} grid)...`);
  let loadedCount = 0;
  let failedCount = 0;
  const failedProducts: string[] = [];
  
  // Load all images first, then draw them
  const imageLoadPromises = shuffledProducts.slice(0, rows * cols).map(async (product, index) => {
    const featuredImageUrl = product.featured_image_url;
    const logoUrl = product.logo_url;
    
    // Check for duplicates
    const isDuplicate = featuredImageUrl && seenImages.has(featuredImageUrl);
    
    let imageUrl: string | undefined;
    if (isDuplicate && logoUrl) {
      imageUrl = logoUrl;
    } else {
      imageUrl = featuredImageUrl || logoUrl;
      if (featuredImageUrl) {
        seenImages.set(featuredImageUrl, true);
      }
    }
    
    // Fallback to NNAudio logo
    if (!imageUrl) {
      imageUrl = NNAUDIO_LOGO;
    }

    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth;
    const y = row * cellHeight;
    
    try {
      // Load image with retries
      let img = await loadImageWithFallback(imageUrl, NNAUDIO_LOGO, 5);
      
      // If image failed and it's not already the logo, try logo as final fallback
      if ((!img || img.width === 0 || img.height === 0) && imageUrl !== NNAUDIO_LOGO) {
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
      
      return {
        index,
        product: product.name,
        img,
        x,
        y,
        col,
        row
      };
    } catch (error: any) {
      return {
        index,
        product: product.name,
        img: null,
        x,
        y,
        col,
        row,
        error: error.message
      };
    }
  });

  // Wait for ALL images to load before drawing
  console.log('  Waiting for all images to load...');
  const imageResults = await Promise.all(imageLoadPromises);
  
  // Now draw all loaded images
  console.log('  Drawing images to canvas...');
  for (const result of imageResults) {
    if (result.img && result.img.width > 0 && result.img.height > 0) {
      // Calculate crop to maintain aspect ratio (center crop)
      const imgAspect = result.img.width / result.img.height;
      const cellAspect = cellWidth / cellHeight;
      
      let sx = 0, sy = 0, sw = result.img.width, sh = result.img.height;
      
      if (imgAspect > cellAspect) {
        // Image is wider - crop sides
        sw = result.img.height * cellAspect;
        sx = (result.img.width - sw) / 2;
      } else {
        // Image is taller - crop top/bottom
        sh = result.img.width / cellAspect;
        sy = (result.img.height - sh) / 2;
      }
      
      ctx.drawImage(result.img, sx, sy, sw, sh, result.x, result.y, cellWidth, cellHeight);
      loadedCount++;
    } else {
      // Draw placeholder
      ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
      ctx.fillRect(result.x, result.y, cellWidth, cellHeight);
      failedCount++;
      failedProducts.push(result.product);
    }
    
    if ((loadedCount + failedCount) % 20 === 0 || (loadedCount + failedCount) === imageResults.length) {
      console.log(`    Drawn ${loadedCount + failedCount}/${imageResults.length} images (${loadedCount} loaded, ${failedCount} placeholders)...`);
    }
  }
  
  console.log(`  ✓ Completed: ${loadedCount} loaded, ${failedCount} failed`);
  if (failedCount > 0 && failedCount <= 10) {
    console.log(`  Failed products: ${failedProducts.join(', ')}`);
  } else if (failedCount > 10) {
    console.log(`  Failed products (first 10): ${failedProducts.slice(0, 10).join(', ')}`);
  }

  // Convert PNG buffer to WebP using sharp
  const pngBuffer = canvas.toBuffer('image/png');
  const webpBuffer = await sharp(pngBuffer)
    .webp({ quality: 85 })
    .toBuffer();

  return webpBuffer;
}

async function generateHeroMosaicImage() {
  console.log('=== Generating Hero Mosaic ===\n');

  const adminSupabase = await createAdminClient();

  // Fetch all active products (excluding bundles)
  const { data: products, error } = await adminSupabase
    .from('products')
    .select('id, name, featured_image_url, logo_url, category')
    .eq('status', 'active')
    .neq('category', 'bundle');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No active products found');
    return;
  }

  console.log(`Found ${products.length} active products (excluding bundles)`);
  console.log('Generating hero mosaic (3000x1000, randomized order)...\n');

  try {
    // Generate wide format mosaic (3:1 aspect ratio)
    const mosaicBuffer = await generateHeroMosaic(products, 3000, 1000);
    
    // Save to public folder
    const outputPath = path.join(process.cwd(), 'public', 'images', 'nnaud-io', 'hero-mosaic.webp');
    const outputDir = path.dirname(outputPath);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, mosaicBuffer);
    
    console.log(`\n✅ Hero mosaic generated and saved to: ${outputPath}`);
    console.log(`   File size: ${(mosaicBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  } catch (error: any) {
    console.error(`❌ Error generating hero mosaic:`, error.message);
    console.error(error);
  }

  console.log('\n✅ Done');
}

generateHeroMosaicImage().catch(console.error);
