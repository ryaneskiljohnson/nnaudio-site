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
      return null;
    }
    
    const html = await response.text();
    
    let price: number | null = null;
    let salePrice: number | null = null;
    
    const priceParagraphRegex = /<p[^>]*class=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\/p>/i;
    const priceParagraphMatch = html.match(priceParagraphRegex);
    
    if (priceParagraphMatch) {
      const priceContent = priceParagraphMatch[1];
      const hasDel = /<del[^>]*>/i.test(priceContent);
      const hasIns = /<ins[^>]*>/i.test(priceContent);
      
      if (hasDel && hasIns) {
        const delSection = priceContent.match(/<del[^>]*>([\s\S]*?)<\/del>/i);
        if (delSection) {
          const delPriceMatch = delSection[1].match(/Price-currencySymbol[^>]*>[\s\S]*?<\/span>([\d,]+\.?\d*)<\/bdi>/i);
          if (delPriceMatch && delPriceMatch[1]) {
            price = parseFloat(delPriceMatch[1].replace(/,/g, ''));
          }
        }
        
        const insSection = priceContent.match(/<ins[^>]*>([\s\S]*?)<\/ins>/i);
        if (insSection) {
          const insPriceMatch = insSection[1].match(/Price-currencySymbol[^>]*>[\s\S]*?<\/span>([\d,]+\.?\d*)<\/bdi>/i);
          if (insPriceMatch && insPriceMatch[1]) {
            salePrice = parseFloat(insPriceMatch[1].replace(/,/g, ''));
          }
        }
      } else {
        const priceMatch = priceContent.match(/Price-currencySymbol[^>]*>[\s\S]*?<\/span>([\d,]+\.?\d*)<\/bdi>/i);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
      }
    }
    
    if (price === null) {
      return null;
    }
    
    return {
      price,
      salePrice: salePrice !== null ? salePrice : undefined
    };
  } catch (error: any) {
    return null;
  }
}

async function main() {
  console.log('=== Comprehensive Pricing Check ===\n');
  
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
  
  console.log(`Checking ${products.length} products...\n`);
  
  let correct = 0;
  let incorrect = 0;
  let notFound = 0;
  const issues: Array<{name: string; slug: string; current: string; expected: string}> = [];
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    process.stdout.write(`[${i + 1}/${products.length}] ${product.name}... `);
    
    const scraped = await scrapeProductPricing(product.slug);
    
    if (!scraped) {
      console.log('⚠ Not found on nnaud.io');
      notFound++;
      continue;
    }
    
    const priceMatch = Math.abs(product.price - scraped.price) < 0.01;
    const salePriceMatch = 
      (product.sale_price === null && scraped.salePrice === undefined) ||
      (product.sale_price !== null && scraped.salePrice !== undefined && Math.abs(product.sale_price - scraped.salePrice) < 0.01);
    
    if (priceMatch && salePriceMatch) {
      console.log('✓');
      correct++;
    } else {
      const current = `$${product.price}${product.sale_price ? ` (Sale: $${product.sale_price})` : ''}`;
      const expected = `$${scraped.price}${scraped.salePrice ? ` (Sale: $${scraped.salePrice})` : ''}`;
      console.log(`✗ Current: ${current}, Expected: ${expected}`);
      issues.push({
        name: product.name,
        slug: product.slug,
        current,
        expected
      });
      incorrect++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary:');
  console.log(`  Correct: ${correct}`);
  console.log(`  Incorrect: ${incorrect}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (issues.length > 0) {
    console.log('Products with incorrect pricing:');
    issues.forEach(issue => {
      console.log(`  ${issue.name} (${issue.slug})`);
      console.log(`    Current: ${issue.current}`);
      console.log(`    Expected: ${issue.expected}`);
      console.log('');
    });
  } else {
    console.log('✓ All products have correct pricing!');
  }
}

main().catch(console.error);

