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

async function main() {
  // Check for products with $0 or missing prices
  const { data: zeroPrice, error: zeroError } = await supabase
    .from('products')
    .select('name, slug, price, sale_price')
    .or('price.eq.0,price.is.null')
    .order('name');
  
  if (zeroError) {
    console.error('Error checking zero prices:', zeroError);
  } else if (zeroPrice && zeroPrice.length > 0) {
    console.log('⚠ Products with $0 or missing prices:');
    zeroPrice.forEach(p => {
      console.log(`  ${p.name} (${p.slug}): $${p.price || 0}`);
    });
    console.log('');
  } else {
    console.log('✓ All products have pricing set\n');
  }
  
  // Show sample products
  const { data, error } = await supabase
    .from('products')
    .select('name, slug, price, sale_price')
    .order('name')
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Sample products pricing:\n');
  data?.forEach(p => {
    const displayPrice = p.sale_price || p.price;
    const hasDiscount = p.sale_price && p.sale_price < p.price;
    console.log(`  ${p.name}:`);
    console.log(`    Regular: $${p.price}`);
    if (hasDiscount) {
      console.log(`    Sale: $${p.sale_price}`);
    }
    console.log(`    Display: $${displayPrice}${hasDiscount ? ` (was $${p.price})` : ''}`);
    console.log('');
  });
}

main().catch(console.error);

