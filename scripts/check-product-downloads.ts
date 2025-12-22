import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';

async function main() {
  console.log('=== Checking Product Downloads ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all products with plugin downloads
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, downloads')
    .not('downloads', 'is', null);
  
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  // Get all cleaned ZIP filenames
  const zipFiles = fs.readdirSync(PRODUCTION_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('plugin_'))
    .map(file => path.basename(file));
  
  console.log(`Found ${zipFiles.length} plugin ZIP files locally\n`);
  console.log(`Found ${products?.length || 0} products with downloads\n`);
  
  let updatedCount = 0;
  let needsUpdate: any[] = [];
  
  for (const product of products || []) {
    const downloads = product.downloads as any[] || [];
    const pluginDownload = downloads.find((d: any) => d.type === 'plugin');
    
    if (pluginDownload) {
      const currentPath = pluginDownload.path || '';
      const fileName = path.basename(currentPath);
      
      // Check if this filename exists in our cleaned files
      const cleanedFileName = zipFiles.find(zip => {
        // Extract product name from zip filename
        const zipSlug = zip.replace(/^plugin_/, '').replace(/\.zip$/, '').replace(/_/g, '-');
        return product.slug === zipSlug || currentPath.includes(zip);
      });
      
      if (cleanedFileName && fileName !== cleanedFileName) {
        needsUpdate.push({
          product: product.name,
          slug: product.slug,
          current: fileName,
          shouldBe: cleanedFileName,
        });
      } else if (cleanedFileName && fileName === cleanedFileName) {
        updatedCount++;
      }
    }
  }
  
  console.log(`✅ Products with correct cleaned filenames: ${updatedCount}`);
  console.log(`⚠️  Products needing update: ${needsUpdate.length}\n`);
  
  if (needsUpdate.length > 0) {
    console.log('Products that need updating:');
    needsUpdate.forEach(item => {
      console.log(`\n  ${item.product} (${item.slug})`);
      console.log(`    Current: ${item.current}`);
      console.log(`    Should be: ${item.shouldBe}`);
    });
  }
}

main().catch(console.error);

