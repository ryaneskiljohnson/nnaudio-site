import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

interface ProductRow {
  Name: string;
  Slug: string;
  'Current Price': string;
  'Current Sale Price': string;
  Link: string;
  'Website Price': string;
  'Website Sale Price': string;
}

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('404 Not Found'));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractPrices(html: string): { price: number | null; salePrice: number | null } {
  let price: number | null = null;
  let salePrice: number | null = null;
  
  const productTitleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  
  if (productTitleMatch) {
    const titleIndex = productTitleMatch.index! + productTitleMatch[0].length;
    const contentAfterTitle = html.substring(titleIndex, titleIndex + 2000);
    
    const originalPriceText = contentAfterTitle.match(/Original price was:[^<]*/i)?.[0] || '';
    const currentPriceText = contentAfterTitle.match(/Current price is:[^<]*/i)?.[0] || '';
    
    const originalPriceMatch = originalPriceText.match(/(?:[>;]|&#\d+;)(\d+\.?\d*)/);
    const currentPriceMatch = currentPriceText.match(/(?:[>;]|&#\d+;)(\d+\.?\d*)/);
    
    if (originalPriceMatch && currentPriceMatch) {
      const origValue = parseFloat(originalPriceMatch[1]);
      const currValue = parseFloat(currentPriceMatch[1]);
      if (!isNaN(origValue) && !isNaN(currValue)) {
        if (origValue > currValue) {
          price = origValue;
          salePrice = currValue;
        } else {
          price = currValue;
        }
      }
    } else if (currentPriceMatch) {
      const currValue = parseFloat(currentPriceMatch[1]);
      if (!isNaN(currValue) && currValue >= 0) {
        price = currValue;
      }
    } else {
      const priceBlockMatch = contentAfterTitle.match(/<p[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (priceBlockMatch) {
        const priceBlock = priceBlockMatch[1];
        const simplePriceMatch = priceBlock.match(/currencySymbol[^>]*>[\s\S]*?<\/span>(\d+\.?\d*)<\/bdi>/i);
        if (simplePriceMatch) {
          const value = parseFloat(simplePriceMatch[1]);
          if (!isNaN(value) && value >= 0) {
            price = value;
          }
        }
      }
    }
  }
  
  return { price, salePrice };
}

// Products that need alternative slug searches
const alternativeSlugs: Record<string, string[]> = {
  'apache-free-midi': ['apache-midi', 'apache-free-midi-pack'],
  'bakers-delight-midi': ['bakers-delight', 'bakers-delight-midi-pack'],
  'digital-echoes-delay': ['digital-echoes', 'digital-echoes-delay-plugin'],
  'lofi-jamz': ['lofi-jamz-midi', 'lofi-jamz-pack'],
  'rabbit-hole-free-midi': ['rabbit-hole-midi', 'rabbit-hole'],
  'reflection-cthulhu': ['reflection-cthulhu-midi', 'reflection-cthulhu-pack'],
  'so-far-gone-midi': ['so-far-gone', 'so-far-gone-midi-pack'],
  'tetrad-guitars': ['free-tetrad-guitars-plugin', 'tetrad-series-guitars'],
  'tetrad-keys': ['free-tetrad-keys-plugin', 'tetrad-series-keys'],
  'tetrad-winds': ['free-tetrad-winds-plugin', 'tetrad-series-winds'],
  'time-zones-delay': ['time-zones', 'time-zones-delay-plugin'],
  'time-zones-midi': ['time-zones-midi-pack', 'time-zones-midi'],
  'yonkers-cthulhu': ['yonkers-cthulhu-midi', 'yonkers-cthulhu-pack'],
};

async function findProductLink(name: string, slug: string): Promise<{ url: string; price: number | null; salePrice: number | null } | null> {
  // Try the original slug first
  const urlsToTry = [slug, ...(alternativeSlugs[slug] || [])];
  
  for (const trySlug of urlsToTry) {
    const url = `https://nnaud.io/product/${trySlug}/`;
    try {
      const html = await fetchPage(url);
      if (!html.includes('Page not found') && !html.includes('404')) {
        const prices = extractPrices(html);
        return { url, ...prices };
      }
    } catch (error) {
      // Continue to next URL
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return null;
}

async function main() {
  console.log('=== Finding Missing Product Links ===\n');
  
  const csvPath = path.resolve(__dirname, '../products-export.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: ProductRow[] = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  // Find products without links
  const missingProducts = records.filter(r => !r.Link || r.Link.trim() === '');
  
  console.log(`Found ${missingProducts.length} products without links\n`);
  
  for (const record of missingProducts) {
    console.log(`Searching for: ${record.Name} (${record.Slug})`);
    
    const result = await findProductLink(record.Name, record.Slug);
    
    if (result) {
      record.Link = result.url;
      record['Website Price'] = result.price !== null ? result.price.toString() : '';
      record['Website Sale Price'] = result.salePrice !== null ? result.salePrice.toString() : '';
      console.log(`  ✅ Found: ${result.url}`);
      console.log(`     Price: ${result.price !== null ? '$' + result.price : 'not found'}, Sale: ${result.salePrice !== null ? '$' + result.salePrice : 'not found'}`);
    } else {
      console.log(`  ❌ Not found`);
    }
    console.log('');
  }
  
  // Write updated CSV
  const updatedCsv = stringify(records, {
    header: true,
    columns: ['Name', 'Slug', 'Current Price', 'Current Sale Price', 'Link', 'Website Price', 'Website Sale Price'],
  });
  
  fs.writeFileSync(csvPath, updatedCsv, 'utf-8');
  
  console.log(`\n✅ Updated CSV saved to: ${csvPath}`);
}

main().catch(console.error);

