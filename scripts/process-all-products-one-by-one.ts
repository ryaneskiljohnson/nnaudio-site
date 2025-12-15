import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('name');
  
  if (error) {
    throw error;
  }
  
  return data || [];
}

async function scrapeProduct(slug: string, index: number, total: number) {
  console.log('\n' + '═'.repeat(70));
  console.log(`📦 Product ${index}/${total}: ${slug}`);
  console.log('═'.repeat(70));
  
  try {
    const { stdout, stderr } = await execAsync(
      `npx tsx scripts/scrape-product-content.ts "${slug}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    // Show summary from output
    const lines = stdout.split('\n');
    const summaryLine = lines.find(line => line.includes('Summary:'));
    if (summaryLine) {
      const summaryIndex = lines.indexOf(summaryLine);
      const summaryLines = lines.slice(summaryIndex, summaryIndex + 5);
      summaryLines.forEach(line => {
        if (line.trim()) console.log(line);
      });
    }
    
    if (stderr && !stderr.includes('DeprecationWarning')) {
      console.error(`  ⚠ Warning:`, stderr.substring(0, 200));
    }
    
    return true;
  } catch (error: any) {
    console.error(`  ✗ Failed:`, error.message.substring(0, 200));
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive product content scraping...\n');
  console.log('This will process ALL products one at a time, extracting:');
  console.log('  • All images (main + gallery)');
  console.log('  • All audio files (MP3, WAV, OGG, M4A)');
  console.log('  • All video links (YouTube, Vimeo, direct)');
  console.log('  • Full descriptions');
  console.log('  • Features and specifications\n');
  
  const products = await getAllProducts();
  console.log(`Found ${products.length} active products to process\n`);
  
  let successCount = 0;
  let failCount = 0;
  const results: Array<{slug: string; success: boolean; hasAudio: boolean; hasVideo: boolean}> = [];
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    const success = await scrapeProduct(product.slug, i + 1, products.length);
    
    if (success) {
      successCount++;
      // Check if product has audio/video by querying database
      const { data } = await supabase
        .from('products')
        .select('audio_samples, demo_video_url')
        .eq('slug', product.slug)
        .single();
      
      results.push({
        slug: product.slug,
        success: true,
        hasAudio: data?.audio_samples && Array.isArray(data.audio_samples) && data.audio_samples.length > 0,
        hasVideo: !!data?.demo_video_url
      });
    } else {
      failCount++;
      results.push({
        slug: product.slug,
        success: false,
        hasAudio: false,
        hasVideo: false
      });
    }
    
    // Small delay to avoid overwhelming the server
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('✅ BATCH PROCESSING COMPLETE!');
  console.log('═'.repeat(70));
  console.log(`Total products: ${products.length}`);
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  
  const withAudio = results.filter(r => r.hasAudio).length;
  const withVideo = results.filter(r => r.hasVideo).length;
  
  console.log(`\n📊 Content Statistics:`);
  console.log(`   Products with audio files: ${withAudio}`);
  console.log(`   Products with video links: ${withVideo}`);
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
