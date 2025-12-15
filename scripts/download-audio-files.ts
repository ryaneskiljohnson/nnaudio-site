import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: string;
  name: string;
  slug: string;
  audio_samples: Array<{ url: string; name: string }> | null;
}

async function downloadFile(url: string, filePath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`  ✗ Failed to download ${url}: HTTP ${response.status}`);
      return false;
    }

    const buffer = await response.buffer();
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (error) {
    console.error(`  ✗ Error downloading ${url}:`, error);
    return false;
  }
}

function sanitizeFilename(filename: string): string {
  // Remove invalid characters and replace spaces with hyphens
  return filename
    .replace(/[^a-z0-9._-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function getFileExtension(url: string): string {
  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match ? match[1] : 'mp3';
}

async function main() {
  console.log('📥 Downloading audio files from product pages...\n');

  // Create audio directory
  const audioDir = path.join(process.cwd(), 'public', 'audio', 'products');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  // Fetch all products with audio samples
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .not('audio_samples', 'is', null);

  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No products with audio samples found.');
    return;
  }

  console.log(`Found ${products.length} products with audio samples\n`);

  let totalDownloaded = 0;
  let totalFailed = 0;
  const downloadedFiles: string[] = [];

  for (const product of products) {
    if (!product.audio_samples || product.audio_samples.length === 0) {
      continue;
    }

    console.log(`📦 ${product.name} (${product.audio_samples.length} audio file(s))`);

    // Create product-specific directory
    const productDir = path.join(audioDir, product.slug);
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    for (let i = 0; i < product.audio_samples.length; i++) {
      const audio = product.audio_samples[i];
      const audioUrl = audio.url;
      
      // Generate filename
      const extension = getFileExtension(audioUrl);
      const audioName = audio.name || `sample-${i + 1}`;
      const sanitizedName = sanitizeFilename(audioName);
      const filename = `${sanitizedName}.${extension}`;
      const filePath = path.join(productDir, filename);

      // Skip if file already exists
      if (fs.existsSync(filePath)) {
        console.log(`  ⏭  Skipping (already exists): ${filename}`);
        continue;
      }

      console.log(`  ↓ Downloading: ${filename}...`);
      const success = await downloadFile(audioUrl, filePath);

      if (success) {
        totalDownloaded++;
        downloadedFiles.push(filePath);
        console.log(`  ✓ Downloaded: ${filename}`);
      } else {
        totalFailed++;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Download Summary:');
  console.log(`  ✓ Successfully downloaded: ${totalDownloaded} files`);
  console.log(`  ✗ Failed: ${totalFailed} files`);
  console.log(`  📁 Files saved to: ${audioDir}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

if (require.main === module) {
  main().catch(console.error);
}

