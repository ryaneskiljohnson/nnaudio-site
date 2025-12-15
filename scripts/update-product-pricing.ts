import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

interface PricingData {
  price: number;
  salePrice?: number;
}

async function scrapeProductPricing(slug: string): Promise<PricingData | null> {
  const url = `https://nnaud.io/product/${slug}/`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`  ⚠ HTTP ${response.status} - Product may not exist`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract price from WooCommerce price elements
    // Structure: <p class="price">...</p>
    // On sale: <del>regular</del> <ins>sale</ins>
    // Not on sale: just the price
    let price: number | null = null;
    let salePrice: number | null = null;
    
    // Find the price paragraph
    const priceParagraphRegex = /<p[^>]*class=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\/p>/i;
    const priceParagraphMatch = html.match(priceParagraphRegex);
    
    if (priceParagraphMatch) {
      const priceContent = priceParagraphMatch[1];
      
      // Check if product is on sale (has <del> and <ins> tags)
      const hasDel = /<del[^>]*>/i.test(priceContent);
      const hasIns = /<ins[^>]*>/i.test(priceContent);
      
      if (hasDel && hasIns) {
        // Product is on sale
        // Extract regular price from <del> tag
        // Pattern: <span class="woocommerce-Price-currencySymbol">&#36;</span>34.95</bdi>
        const delSection = priceContent.match(/<del[^>]*>([\s\S]*?)<\/del>/i);
        if (delSection) {
          // Look for: currencySymbol>...</span>NUMBER</bdi>
          const delPriceMatch = delSection[1].match(/Price-currencySymbol[^>]*>[\s\S]*?<\/span>([\d,]+\.?\d*)<\/bdi>/i);
          if (delPriceMatch && delPriceMatch[1]) {
            price = parseFloat(delPriceMatch[1].replace(/,/g, ''));
          }
        }
        
        // Extract sale price from <ins> tag
        const insSection = priceContent.match(/<ins[^>]*>([\s\S]*?)<\/ins>/i);
        if (insSection) {
          const insPriceMatch = insSection[1].match(/Price-currencySymbol[^>]*>[\s\S]*?<\/span>([\d,]+\.?\d*)<\/bdi>/i);
          if (insPriceMatch && insPriceMatch[1]) {
            salePrice = parseFloat(insPriceMatch[1].replace(/,/g, ''));
          }
        }
      } else {
        // Product is not on sale - just extract the price
        // Pattern: <span class="woocommerce-Price-currencySymbol">&#36;</span>24.95</bdi>
        const priceMatch = priceContent.match(/Price-currencySymbol[^>]*>[\s\S]*?<\/span>([\d,]+\.?\d*)<\/bdi>/i);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
      }
    }
    
    // Fallback: if we didn't find price in the paragraph, try finding it anywhere
    if (price === null) {
      const fallbackPriceRegex = /<span[^>]*class=["'][^"']*woocommerce-Price-amount[^"']*["'][^>]*>[\s\S]*?<bdi>[\s\S]*?([\d,]+\.?\d*)/gi;
      const fallbackMatches = [...html.matchAll(fallbackPriceRegex)];
      
      if (fallbackMatches.length > 0) {
        const prices = fallbackMatches.map(match => parseFloat(match[1].replace(/,/g, '')));
        const uniquePrices = [...new Set(prices)].sort((a, b) => b - a);
        
        if (uniquePrices.length === 1) {
          price = uniquePrices[0];
        } else if (uniquePrices.length > 1) {
          // Multiple prices - higher is regular, lower might be sale
          price = uniquePrices[0];
          if (uniquePrices[1] < uniquePrices[0]) {
            salePrice = uniquePrices[1];
          }
        }
      }
    }
    
    // Alternative: Look for data-price attributes
    if (price === null) {
      const dataPriceRegex = /data-price=["']([\d,]+\.?\d*)["']/gi;
      const dataPriceMatch = html.match(dataPriceRegex);
      if (dataPriceMatch) {
        const amount = dataPriceMatch[0].match(/["']([\d,]+\.?\d*)["']/);
        if (amount) {
          price = parseFloat(amount[1].replace(/,/g, ''));
        }
      }
    }
    
    // Alternative: Look for JSON-LD structured data
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    const jsonLdMatches = [...html.matchAll(jsonLdRegex)];
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        if (jsonData.offers && jsonData.offers.price) {
          const jsonPrice = parseFloat(jsonData.offers.price);
          if (!isNaN(jsonPrice)) {
            if (price === null) {
              price = jsonPrice;
            }
          }
        }
        if (jsonData.offers && jsonData.offers.priceSpecification) {
          const spec = jsonData.offers.priceSpecification;
          if (spec.price) {
            const jsonPrice = parseFloat(spec.price);
            if (!isNaN(jsonPrice)) {
              if (price === null) {
                price = jsonPrice;
              }
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    if (price === null) {
      console.log(`  ⚠ Could not extract price`);
      return null;
    }
    
    return {
      price,
      salePrice: salePrice !== null ? salePrice : undefined
    };
  } catch (error: any) {
    console.error(`  ✗ Error scraping pricing: ${error.message}`);
    return null;
  }
}

async function updateProductPricing(productId: string, pricing: PricingData) {
  const updateData: any = {
    price: pricing.price
  };
  
  if (pricing.salePrice !== undefined) {
    updateData.sale_price = pricing.salePrice;
  } else {
    // Clear sale_price if not on sale
    updateData.sale_price = null;
  }
  
  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId);
  
  if (error) {
    throw error;
  }
}

async function main() {
  console.log('=== Updating Product Pricing from nnaud.io ===\n');
  
  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, price, sale_price')
    .order('name');
  
  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }
  
  if (!products || products.length === 0) {
    console.log('No products found');
    process.exit(0);
  }
  
  console.log(`Found ${products.length} products\n`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    console.log(`\n[${i + 1}/${products.length}] ${product.name} (${product.slug})`);
    console.log(`  Current: $${product.price}${product.sale_price ? ` (Sale: $${product.sale_price})` : ''}`);
    
    const pricing = await scrapeProductPricing(product.slug);
    
    if (!pricing) {
      console.log(`  ⚠ Skipping - could not scrape pricing`);
      skipped++;
      continue;
    }
    
    console.log(`  Scraped: $${pricing.price}${pricing.salePrice ? ` (Sale: $${pricing.salePrice})` : ''}`);
    
    // Check if pricing has changed
    const priceChanged = Math.abs(product.price - pricing.price) > 0.01;
    const salePriceChanged = 
      (product.sale_price === null && pricing.salePrice !== undefined) ||
      (product.sale_price !== null && pricing.salePrice === undefined) ||
      (product.sale_price !== null && pricing.salePrice !== undefined && Math.abs(product.sale_price - pricing.salePrice) > 0.01);
    
    if (!priceChanged && !salePriceChanged) {
      console.log(`  ✓ Pricing is already correct`);
      skipped++;
      continue;
    }
    
    try {
      await updateProductPricing(product.id, pricing);
      console.log(`  ✓ Updated pricing in database`);
      updated++;
    } catch (error: any) {
      console.error(`  ✗ Error updating: ${error.message}`);
      failed++;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);

