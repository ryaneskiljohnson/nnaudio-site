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
  
  // Find the main product content area
  const productTitleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  
  if (productTitleMatch) {
    const titleIndex = productTitleMatch.index! + productTitleMatch[0].length;
    const contentAfterTitle = html.substring(titleIndex, titleIndex + 2000);
    
    // Extract from screen-reader-text (most reliable for products with sales)
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
      // No screen-reader-text found - try to extract from simple price format
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

async function main() {
  console.log('=== Finding Product Links and Prices on nnaud.io ===\n');
  
  const csvPath = path.resolve(__dirname, '../products-export.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    console.log('Please run export-products-to-csv.ts first');
    return;
  }
  
  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: ProductRow[] = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`Found ${records.length} products in CSV\n`);
  
  let processed = 0;
  let found = 0;
  let notFound = 0;
  
  for (const record of records) {
    processed++;
    console.log(`[${processed}/${records.length}] ${record.Name}`);
    
    // Try to find the product on nnaud.io
    const slug = record.Slug;
    const url = `https://nnaud.io/product/${slug}/`;
    
    try {
      const html = await fetchPage(url);
      
      // Check if page exists (not 404)
      if (html.includes('Page not found') || html.includes('404')) {
        console.log(`  ❌ Page not found: ${url}`);
        notFound++;
      } else {
        // Extract prices
        const { price, salePrice } = extractPrices(html);
        
        // Update record
        record.Link = url;
        record['Website Price'] = price !== null ? price.toString() : '';
        record['Website Sale Price'] = salePrice !== null ? salePrice.toString() : '';
        
        console.log(`  ✅ Found: ${url}`);
        console.log(`     Price: ${price !== null ? '$' + price : 'not found'}, Sale: ${salePrice !== null ? '$' + salePrice : 'not found'}`);
        found++;
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      if (error.message === '404 Not Found') {
        console.log(`  ❌ Page not found: ${url}`);
        notFound++;
      } else {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }
  }
  
  // Write updated CSV
  const updatedCsv = stringify(records, {
    header: true,
    columns: ['Name', 'Slug', 'Current Price', 'Current Sale Price', 'Link', 'Website Price', 'Website Sale Price'],
  });
  
  fs.writeFileSync(csvPath, updatedCsv, 'utf-8');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n=== Summary ===`);
  console.log(`✅ Processed: ${processed} products`);
  console.log(`✅ Found: ${found} products`);
  console.log(`❌ Not Found: ${notFound} products`);
  console.log(`\n✅ Updated CSV saved to: ${csvPath}`);
}

main().catch(console.error);

