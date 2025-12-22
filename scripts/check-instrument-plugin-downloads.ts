import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  console.log('=== Checking Instrument Plugin Downloads ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all instrument plugins
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, downloads')
    .eq('category', 'instrument-plugin')
    .order('name');
  
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  console.log(`Found ${products?.length || 0} instrument plugins\n`);
  
  let hasBoth = 0;
  let missingPlugin = 0;
  let missingSamples = 0;
  let missingBoth = 0;
  
  const issues: any[] = [];
  
  for (const product of products || []) {
    const downloads = product.downloads as any[] || [];
    const pluginDownload = downloads.find((d: any) => d.type === 'plugin');
    const sampleDownload = downloads.find((d: any) => d.type === 'samples');
    
    if (pluginDownload && sampleDownload) {
      hasBoth++;
    } else if (!pluginDownload && !sampleDownload) {
      missingBoth++;
      issues.push({
        product: product.name,
        slug: product.slug,
        missing: 'both plugin and samples',
      });
    } else if (!pluginDownload) {
      missingPlugin++;
      issues.push({
        product: product.name,
        slug: product.slug,
        missing: 'plugin',
      });
    } else if (!sampleDownload) {
      missingSamples++;
      issues.push({
        product: product.name,
        slug: product.slug,
        missing: 'samples',
      });
    }
  }
  
  console.log(`=== Summary ===`);
  console.log(`✅ Has both plugin and samples: ${hasBoth}`);
  console.log(`⚠️  Missing plugin only: ${missingPlugin}`);
  console.log(`⚠️  Missing samples only: ${missingSamples}`);
  console.log(`❌ Missing both: ${missingBoth}\n`);
  
  if (issues.length > 0) {
    console.log(`\nProducts with missing downloads:`);
    issues.forEach(item => {
      console.log(`\n  ${item.product} (${item.slug})`);
      console.log(`    Missing: ${item.missing}`);
    });
  } else {
    console.log(`\n✅ All instrument plugins have both plugin and sample library links!`);
  }
}

main().catch(console.error);

