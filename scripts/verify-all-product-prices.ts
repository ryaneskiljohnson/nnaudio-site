import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as https from 'https';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractPrices(html: string, productSlug: string): { price: number | null; salePrice: number | null } {
  let price: number | null = null;
  let salePrice: number | null = null;
  
  // Find the main product content area - look for product_title followed by price
  // This ensures we get the main product price, not related products
  const productTitleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  
  if (productTitleMatch) {
    // Get the section after the product title (should contain the main price)
    const titleIndex = productTitleMatch.index! + productTitleMatch[0].length;
    const contentAfterTitle = html.substring(titleIndex, titleIndex + 2000); // Look in next 2000 chars
    
    // First, try to extract from screen-reader-text which is more reliable
    // Pattern: <span class="screen-reader-text">Original price was: $19.95.</span>
    // Make sure we don't match HTML entities - look for numbers after "was:" or "is:" followed by optional $ and then the number
    const originalPriceMatch = contentAfterTitle.match(/Original price was:[^<]*?(\d+\.?\d*)/i);
    const currentPriceMatch = contentAfterTitle.match(/Current price is:[^<]*?(\d+\.?\d*)/i);
    
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
      // Only current price, no original (no sale)
      const currValue = parseFloat(currentPriceMatch[1]);
      if (!isNaN(currValue) && currValue > 0) {
        price = currValue;
      }
    }
    
    // Fallback: Try to parse from HTML structure if screen-reader-text didn't work
    if (!price) {
      const priceBlockMatch = contentAfterTitle.match(/<p[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      
      if (priceBlockMatch) {
        const priceBlock = priceBlockMatch[1];
        
        // Look for numbers that are clearly prices (after </span> tags, not in entities)
        // Pattern: </span>19.95</bdi>
        const priceMatches = priceBlock.matchAll(/<\/span>(\d+\.?\d*)<\/bdi>/g);
        const prices: number[] = [];
        for (const match of priceMatches) {
          const value = parseFloat(match[1]);
          if (!isNaN(value) && value > 0 && value < 10000) { // Sanity check
            prices.push(value);
          }
        }
        
        if (prices.length === 2 && prices[0] > prices[1]) {
          price = prices[0];
          salePrice = prices[1];
        } else if (prices.length === 1) {
          price = prices[0];
        }
      }
    }
  }
  
  return { price, salePrice };
}

async function main() {
  console.log('=== Verifying All Product Prices ===\n');
  
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
  let errors = 0;
  const updates: any[] = [];
  
  for (const product of products || []) {
    checked++;
    console.log(`\n[${checked}/${products.length}] ${product.name} (${product.slug})`);
    console.log(`  Current DB: price=$${product.price}, sale_price=${product.sale_price ? '$' + product.sale_price : 'null'}`);
    
    try {
      const url = `https://nnaud.io/product/${product.slug}/`;
      const html = await fetchPage(url);
      
      const { price: webPrice, salePrice: webSalePrice } = extractPrices(html, product.slug);
      
      console.log(`  Website: price=${webPrice ? '$' + webPrice : 'not found'}, sale_price=${webSalePrice ? '$' + webSalePrice : 'not found'}`);
      
      let needsUpdate = false;
      const updateData: any = {};
      
      // Compare prices (allow small floating point differences)
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
      } else if (product.sale_price) {
        // Website has no sale price but DB does - might need to clear it
        console.log(`  ⚠️  DB has sale_price but website doesn't`);
        // Don't auto-clear, might be intentional
      }
      
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating: ${updateError.message}`);
          errors++;
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
      console.error(`  ❌ Error fetching page: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n=== Summary ===`);
  console.log(`✅ Checked: ${checked} products`);
  console.log(`✅ Updated: ${updated} products`);
  console.log(`❌ Errors: ${errors}`);
  
  if (updates.length > 0) {
    console.log(`\nUpdated products:`);
    updates.forEach(u => {
      console.log(`  - ${u.product}: ${JSON.stringify(u.updates)}`);
    });
  }
}

main().catch(console.error);

