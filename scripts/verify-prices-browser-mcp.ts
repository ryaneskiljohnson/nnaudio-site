import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

interface PriceInfo {
  price: number | null;
  salePrice: number | null;
}

// This will be populated by browser MCP snapshots
// For now, we'll use the improved HTML extraction
async function extractPriceFromHTML(html: string): Promise<PriceInfo> {
  let price: number | null = null;
  let salePrice: number | null = null;
  
  // Find the main product content area
  const productTitleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  
  if (productTitleMatch) {
    const titleIndex = productTitleMatch.index! + productTitleMatch[0].length;
    const contentAfterTitle = html.substring(titleIndex, titleIndex + 2000);
    
    // Extract from screen-reader-text (most reliable for products with sales)
    // The HTML has &#036; for $, so we need to skip that and get the number after
    // Pattern: "Original price was: &#036;19.95." - we want 19.95, not 36 from &#036;
    const originalPriceText = contentAfterTitle.match(/Original price was:[^<]*/i)?.[0] || '';
    const currentPriceText = contentAfterTitle.match(/Current price is:[^<]*/i)?.[0] || '';
    
    // Find numbers that come after > (after HTML tags/entities) or after ; (after HTML entities)
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
      if (!isNaN(currValue) && currValue >= 0) { // Allow 0 for free products
        price = currValue;
      }
    } else {
      // No screen-reader-text found - try to extract from simple price format
      // Pattern: <p class="price"><span...><bdi><span...>&#36;</span>493.00</bdi></span></p>
      // Look for price block and extract number after currency symbol span closes
      const priceBlockMatch = contentAfterTitle.match(/<p[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (priceBlockMatch) {
        const priceBlock = priceBlockMatch[1];
        // Look for pattern: </span>NUMBER</bdi> where NUMBER is the price
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
  console.log('=== Verifying Product Prices ===\n');
  
  const supabase = await createAdminClient();
  
  // Get all active products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, price, sale_price, status')
    .eq('status', 'active')
    .order('name');
  
  if (productsError) {
    console.error('Error fetching products:', productsError);
    return;
  }
  
  console.log(`Found ${products?.length || 0} active products\n`);
  
  let checked = 0;
  let updated = 0;
  const updates: any[] = [];
  
  // Use Node's https module to fetch pages
  const https = require('https');
  
  function fetchPage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
  
  for (const product of products || []) {
    checked++;
    console.log(`\n[${checked}/${products.length}] ${product.name} (${product.slug})`);
    console.log(`  Current DB: price=$${product.price}, sale_price=${product.sale_price ? '$' + product.sale_price : 'null'}`);
    
    try {
      const url = `https://nnaud.io/product/${product.slug}/`;
      const html = await fetchPage(url);
      const { price: webPrice, salePrice: webSalePrice } = await extractPriceFromHTML(html);
      
      console.log(`  Website: price=${webPrice ? '$' + webPrice : 'not found'}, sale_price=${webSalePrice ? '$' + webSalePrice : 'not found'}`);
      
      let needsUpdate = false;
      const updateData: any = {};
      
      if (webPrice !== null) {
        const dbPrice = parseFloat(product.price?.toString() || '0');
        if (Math.abs(dbPrice - webPrice) > 0.01) {
          console.log(`  ⚠️  Price mismatch: DB=$${dbPrice}, Web=$${webPrice}`);
          updateData.price = webPrice;
          needsUpdate = true;
        }
      }
      
      if (webSalePrice !== null) {
        const dbSalePrice = parseFloat(product.sale_price?.toString() || '0');
        if (Math.abs(dbSalePrice - webSalePrice) > 0.01) {
          console.log(`  ⚠️  Sale price mismatch: DB=$${dbSalePrice}, Web=$${webSalePrice}`);
          updateData.sale_price = webSalePrice;
          needsUpdate = true;
        }
      } else if (product.sale_price && webPrice !== null && Math.abs(parseFloat(product.sale_price.toString()) - webPrice) < 0.01) {
        // Website has no sale price but DB does, and the sale_price equals the regular price - clear it
        console.log(`  ⚠️  Clearing sale_price (matches regular price)`);
        updateData.sale_price = null;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated: ${JSON.stringify(updateData)}`);
          updated++;
          updates.push({ product: product.name, updates: updateData });
        }
      } else {
        console.log(`  ✅ Prices match`);
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n=== Summary ===`);
  console.log(`✅ Checked: ${checked} products`);
  console.log(`✅ Updated: ${updated} products`);
  
  if (updates.length > 0) {
    console.log(`\nUpdated products:`);
    updates.forEach(u => {
      console.log(`  - ${u.product}: ${JSON.stringify(u.updates)}`);
    });
  }
}

main().catch(console.error);

