import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const STORAGE_PATH_PREFIX = 'products/plugins';

async function main() {
  console.log('=== Verifying Product Download Paths ===\n');
  
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
  
  let pluginDownloadCount = 0;
  let correctPaths = 0;
  let incorrectPaths: any[] = [];
  
  for (const product of products || []) {
    const downloads = product.downloads as any[] || [];
    const pluginDownload = downloads.find((d: any) => d.type === 'plugin');
    
    if (pluginDownload) {
      pluginDownloadCount++;
      const downloadPath = pluginDownload.path || '';
      
      // Check if path uses cleaned filename format (no hyphens, no multiple underscores)
      const fileName = path.basename(downloadPath);
      const hasHyphens = fileName.includes('-');
      const hasMultipleUnderscores = fileName.includes('__') || /_[_-]+_/.test(fileName);
      
      if (hasHyphens || hasMultipleUnderscores) {
        incorrectPaths.push({
          product: product.name,
          slug: product.slug,
          path: downloadPath,
          issues: [
            hasHyphens ? 'contains hyphens' : null,
            hasMultipleUnderscores ? 'has multiple underscores' : null,
          ].filter(Boolean),
        });
      } else {
        correctPaths++;
      }
    }
  }
  
  console.log(`Total products with plugin downloads: ${pluginDownloadCount}`);
  console.log(`✅ Products with cleaned paths: ${correctPaths}`);
  console.log(`⚠️  Products with old paths (need update): ${incorrectPaths.length}\n`);
  
  if (incorrectPaths.length > 0) {
    console.log('Products that need path updates:');
    incorrectPaths.forEach(item => {
      console.log(`\n  ${item.product} (${item.slug})`);
      console.log(`    Path: ${item.path}`);
      console.log(`    Issues: ${item.issues.join(', ')}`);
    });
  } else {
    console.log('✅ All product download paths are using cleaned filenames!');
  }
}

main().catch(console.error);

