/**
 * @fileoverview Enhanced product scraper that fetches descriptions from multiple sources
 * @module scripts/scrape-enhanced-product
 * 
 * This script scrapes product information from both WooCommerce product pages
 * and plugin-specific pages on nnaud.io, merging the data intelligently.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * @brief Scraped product data structure
 */
interface ScrapedProductData {
  shortDescription: string;
  fullDescription: string;
  features: string[];
  sourceUrls: string[];
  scrapedAt: string;
}

/**
 * @brief Fetches HTML content from a URL
 * @param url The URL to fetch
 * @returns Promise<string> HTML content
 */
async function fetchPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`  ✗ Failed to fetch ${url}:`, error);
    return '';
  }
}

/**
 * @brief Extracts text content from HTML, removing tags
 * @param html HTML string
 * @returns Clean text content
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @brief Extracts description from WooCommerce product page
 * @param html HTML content
 * @returns Object with short and full descriptions
 */
function extractWooCommerceDescriptions(html: string): { short: string; full: string } {
  let shortDesc = '';
  let fullDesc = '';
  
  // Extract short description
  const shortDescMatch = html.match(/<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>(.*?)<\/div>/is);
  if (shortDescMatch) {
    shortDesc = stripHtmlTags(shortDescMatch[1]);
  }
  
  // Extract full description from description tab
  let descMatch = html.match(/<div[^>]*class="[^"]*woocommerce-Tabs-panel[^"]*description[^"]*"[^>]*>(.*?)(?:<\/div>\s*<\/div>|<\/div>\s*<div[^>]*class="[^"]*woocommerce-Tabs-panel)/is);
  
  if (!descMatch) {
    descMatch = html.match(/<div[^>]*id="[^"]*tab-description[^"]*"[^>]*>.*?<\/h2>(.*?)(?:<div[^>]*id="tab-|<\/div>\s*<\/div>)/is);
  }
  
  if (descMatch) {
    // Extract paragraphs
    const pMatches = descMatch[1].match(/<p[^>]*>(.*?)<\/p>/gis);
    if (pMatches && pMatches.length > 0) {
      fullDesc = pMatches
        .map(p => stripHtmlTags(p))
        .filter(p => p.length > 10)
        .join('\n\n');
    } else {
      fullDesc = stripHtmlTags(descMatch[1]);
    }
  }
  
  return { short: shortDesc, full: fullDesc };
}

/**
 * @brief Extracts features from product page
 * @param html HTML content
 * @returns Array of feature strings
 */
function extractFeatures(html: string): string[] {
  const features: string[] = [];
  
  // Look for feature lists
  const featureMatches = html.match(/<ul[^>]*>(.*?)<\/ul>/gis);
  if (featureMatches) {
    for (const match of featureMatches) {
      const liMatches = match.match(/<li[^>]*>(.*?)<\/li>/gis);
      if (liMatches) {
        for (const li of liMatches) {
          const feature = stripHtmlTags(li);
          if (feature.length > 10 && feature.length < 200) {
            features.push(feature);
          }
        }
      }
    }
  }
  
  return features;
}

/**
 * @brief Scrapes product data from nnaud.io
 * @param slug Product slug
 * @returns Promise<ScrapedProductData | null> Scraped product data
 * 
 * @example
 * const data = await scrapeEnhancedProduct('apache-flute');
 */
export async function scrapeEnhancedProduct(slug: string): Promise<ScrapedProductData | null> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping: ${slug}`);
  console.log(`${'='.repeat(60)}`);
  
  const sources = [
    `https://nnaud.io/product/${slug}/`,
    `https://nnaud.io/plugins/${slug}/`
  ];
  
  let bestShortDesc = '';
  let bestFullDesc = '';
  const allFeatures: string[] = [];
  const successfulUrls: string[] = [];
  
  // Try both URLs
  for (const url of sources) {
    console.log(`  Fetching: ${url}`);
    const html = await fetchPage(url);
    
    if (!html) {
      console.log(`  ✗ Failed to fetch`);
      continue;
    }
    
    successfulUrls.push(url);
    console.log(`  ✓ Fetched successfully`);
    
    const { short, full } = extractWooCommerceDescriptions(html);
    
    // Keep the longer descriptions
    if (short && short.length > bestShortDesc.length) {
      bestShortDesc = short;
      console.log(`  ✓ Short description: ${short.length} chars`);
    }
    
    if (full && full.length > bestFullDesc.length) {
      bestFullDesc = full;
      console.log(`  ✓ Full description: ${full.length} chars`);
    }
    
    // Collect features
    const features = extractFeatures(html);
    if (features.length > 0) {
      allFeatures.push(...features);
      console.log(`  ✓ Features: ${features.length} found`);
    }
  }
  
  // If still no descriptions, try WooCommerce API
  if (!bestShortDesc && !bestFullDesc && successfulUrls.length === 0) {
    console.log(`  Trying WooCommerce API...`);
    try {
      const apiUrl = `https://nnaud.io/wp-json/wc/v3/products?slug=${slug}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const products = await response.json();
        if (products && products.length > 0) {
          const product = products[0];
          if (product.short_description) {
            bestShortDesc = stripHtmlTags(product.short_description);
            console.log(`  ✓ API short description: ${bestShortDesc.length} chars`);
          }
          if (product.description) {
            bestFullDesc = stripHtmlTags(product.description);
            console.log(`  ✓ API full description: ${bestFullDesc.length} chars`);
          }
          successfulUrls.push(apiUrl);
        }
      }
    } catch (error) {
      console.log(`  ✗ API fetch failed`);
    }
  }
  
  if (!bestShortDesc && !bestFullDesc) {
    console.log(`  ✗ No descriptions found`);
    return null;
  }
  
  // Deduplicate features
  const uniqueFeatures = Array.from(new Set(allFeatures));
  
  console.log(`\n  Summary:`);
  console.log(`    Short: ${bestShortDesc.length} chars`);
  console.log(`    Full: ${bestFullDesc.length} chars`);
  console.log(`    Features: ${uniqueFeatures.length}`);
  console.log(`    Sources: ${successfulUrls.length}`);
  
  return {
    shortDescription: bestShortDesc,
    fullDescription: bestFullDesc,
    features: uniqueFeatures,
    sourceUrls: successfulUrls,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * @brief Main function for CLI usage
 */
async function main() {
  const slug = process.argv[2];
  
  if (!slug) {
    console.error('Usage: npx tsx scripts/scrape-enhanced-product.ts <slug>');
    console.error('Example: npx tsx scripts/scrape-enhanced-product.ts apache-flute');
    process.exit(1);
  }
  
  const data = await scrapeEnhancedProduct(slug);
  
  if (!data) {
    console.error('\n✗ Failed to scrape product');
    process.exit(1);
  }
  
  console.log(`\n✅ Complete!`);
  console.log(JSON.stringify(data, null, 2));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
