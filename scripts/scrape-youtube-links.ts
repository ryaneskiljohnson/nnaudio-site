/**
 * @fileoverview Scrapes YouTube links from nnaud.io plugin pages
 * @module scripts/scrape-youtube-links
 * 
 * Scrapes the /plugins/ page and individual product pages to find YouTube video links.
 * Updates products table with demo_video_url field.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  demo_video_url: string | null;
}

interface VideoMapping {
  productName: string;
  slug: string;
  videoUrl: string | null;
  source: string;
}

/**
 * nnaud.io plugin page slugs can differ from product slugs (e.g. apache-native-american-flute vs apache-flute)
 */
const PLUGIN_SLUG_ALIASES: Record<string, string[]> = {
  'apache-flute': ['apache-native-american-flute'],
};

/**
 * @brief Extracts YouTube URLs from HTML
 * Also checks Elementor widget data-settings (youtube_url in JSON)
 */
function extractYouTubeUrls(html: string): string[] {
  const urls: string[] = [];
  
  // Match various YouTube URL formats
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g,
    /youtu\.be\/([a-zA-Z0-9_-]+)/g,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/g,
  ];
  
  patterns.forEach(pattern => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const videoId = match[1];
      urls.push(`https://youtu.be/${videoId}`);
    }
  });
  
  // Elementor stores youtube_url in data-settings JSON (HTML-encoded, may have \/ escapes)
  const elementorIdMatch = html.match(/youtu\.be[^a-zA-Z0-9_-]*([a-zA-Z0-9_-]{11})/);
  if (elementorIdMatch) {
    urls.push(`https://youtu.be/${elementorIdMatch[1]}`);
  }
  
  return Array.from(new Set(urls));
}

/**
 * @brief Scrapes a single product page for YouTube link
 * Tries plugin slugs (including aliases) and product URL
 */
async function scrapeProductPage(slug: string): Promise<string | null> {
  const pluginSlugs = [slug, ...(PLUGIN_SLUG_ALIASES[slug] || [])];
  const urls: string[] = [];
  for (const ps of pluginSlugs) {
    urls.push(`https://nnaud.io/plugins/${ps}/`);
  }
  urls.push(`https://nnaud.io/product/${slug}/`);
  
  for (const url of urls) {
    try {
      console.log(`  Checking: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        continue;
      }
      
      const html = await response.text();
      const youtubeUrls = extractYouTubeUrls(html);
      
      if (youtubeUrls.length > 0) {
        console.log(`  ✅ Found video: ${youtubeUrls[0]}`);
        return youtubeUrls[0]; // Return first video found
      }
    } catch (error) {
      console.log(`  ⚠️  Error fetching ${url}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
}

/**
 * @brief Updates product with video URL
 */
async function updateProductVideo(productId: string, videoUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        demo_video_url: videoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to update database:`, error);
    return false;
  }
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🎥 Scraping YouTube Links from NNAud.io\n');
  
  // Get all products (focus on plugins first since they're on the plugins page)
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, demo_video_url')
    .not('name', 'ilike', '%cymasphere%')
    .order('category, name');
  
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }
  
  console.log(`Found ${products.length} products\n`);
  
  const results: VideoMapping[] = [];
  let updated = 0;
  let alreadyHad = 0;
  let notFound = 0;
  
  for (const product of products) {
    console.log(`\n${product.name} (${product.category})`);
    
    // Skip if already has video
    if (product.demo_video_url) {
      console.log(`  ✓ Already has video: ${product.demo_video_url}`);
      alreadyHad++;
      results.push({
        productName: product.name,
        slug: product.slug,
        videoUrl: product.demo_video_url,
        source: 'existing'
      });
      continue;
    }
    
    // Try to scrape video
    const videoUrl = await scrapeProductPage(product.slug);
    
    if (videoUrl) {
      const success = await updateProductVideo(product.id, videoUrl);
      if (success) {
        updated++;
        results.push({
          productName: product.name,
          slug: product.slug,
          videoUrl,
          source: 'scraped'
        });
      }
    } else {
      console.log(`  ⚠️  No video found`);
      notFound++;
      results.push({
        productName: product.name,
        slug: product.slug,
        videoUrl: null,
        source: 'not_found'
      });
    }
    
    // Rate limiting between products
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`YOUTUBE LINK SCRAPING COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Newly updated: ${updated}`);
  console.log(`✓ Already had videos: ${alreadyHad}`);
  console.log(`⚠️  No video found: ${notFound}`);
  console.log(`Total processed: ${products.length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Save detailed log
  const log = {
    timestamp: new Date().toISOString(),
    summary: {
      total: products.length,
      updated,
      alreadyHad,
      notFound,
      coverage: ((updated + alreadyHad) / products.length * 100).toFixed(1) + '%'
    },
    results
  };
  
  fs.writeFileSync(
    'youtube-links-scraping-log.json',
    JSON.stringify(log, null, 2)
  );
  
  console.log('📝 Detailed log saved to: youtube-links-scraping-log.json\n');
  
  // Print summary by category
  const byCategory: Record<string, { total: number; found: number }> = {};
  results.forEach(r => {
    const prod = products.find(p => p.slug === r.slug);
    if (prod) {
      if (!byCategory[prod.category]) {
        byCategory[prod.category] = { total: 0, found: 0 };
      }
      byCategory[prod.category].total++;
      if (r.videoUrl) {
        byCategory[prod.category].found++;
      }
    }
  });
  
  console.log('Coverage by category:');
  Object.entries(byCategory).forEach(([cat, data]) => {
    console.log(`  ${cat}: ${data.found}/${data.total} (${(data.found / data.total * 100).toFixed(0)}%)`);
  });
  console.log('');
}

if (require.main === module) {
  main().catch(console.error);
}
