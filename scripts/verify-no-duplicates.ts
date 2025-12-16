import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import https from 'https';
import http from 'http';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: string;
  name: string;
  featured_image_url?: string;
  logo_url?: string;
}

function normalizeImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/images/')) {
    const pathPart = url.replace('/images/', '');
    return `${supabaseUrl}/storage/v1/object/public/product-images/${pathPart}`;
  }
  
  return `${supabaseUrl}/storage/v1/object/public/product-images/${url.replace(/^\//, '')}`;
}

async function downloadAndHashImage(url: string): Promise<string | null> {
  const normalizedUrl = normalizeImageUrl(url);
  
  return new Promise((resolve) => {
    const protocol = normalizedUrl.startsWith('https') ? https : http;
    
    protocol.get(normalizedUrl, (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const hash = createHash('md5').update(buffer).digest('hex');
        resolve(hash);
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

async function verifyNoDuplicates() {
  console.log('=== Verifying No Duplicates ===\n');

  const { data: bundles, error } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      bundle_products!inner(
        product:products!inner(
          id,
          name,
          featured_image_url,
          logo_url
        )
      )
    `)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching bundles:', error);
    return;
  }

  console.log(`Checking ${bundles?.length || 0} active bundles...\n`);

  const allProducts: Product[] = [];
  bundles?.forEach((bundle: any) => {
    const products = ((bundle.bundle_products || []) as any[])
      .map((bp: any) => bp.product)
      .filter((p: any) => p && (p.featured_image_url || p.logo_url)) as Product[];
    allProducts.push(...products);
  });

  const imageUrlToProducts = new Map<string, Product[]>();
  allProducts.forEach((product) => {
    const imageUrl = product.featured_image_url || product.logo_url;
    if (imageUrl) {
      if (!imageUrlToProducts.has(imageUrl)) {
        imageUrlToProducts.set(imageUrl, []);
      }
      imageUrlToProducts.get(imageUrl)!.push(product);
    }
  });

  console.log(`Processing ${imageUrlToProducts.size} unique image URLs...\n`);

  const hashToProducts = new Map<string, { url: string; products: Product[] }>();
  let processed = 0;

  for (const [url, products] of imageUrlToProducts.entries()) {
    process.stdout.write(`\rChecking ${++processed}/${imageUrlToProducts.size} images...`);
    
    const hash = await downloadAndHashImage(url);
    if (!hash) continue;

    if (!hashToProducts.has(hash)) {
      hashToProducts.set(hash, { url, products: [] });
    }
    
    hashToProducts.get(hash)!.products.push(...products);
  }

  console.log('\n\n');

  let duplicateCount = 0;
  for (const [hash, { url, products }] of hashToProducts.entries()) {
    const uniqueProducts = Array.from(
      new Map(products.map(p => [p.id, p])).values()
    );

    if (uniqueProducts.length > 1) {
      duplicateCount++;
      console.log(`⚠️  DUPLICATE FOUND (${uniqueProducts.length} products):`);
      console.log(`   Hash: ${hash}`);
      console.log(`   URL: ${url}`);
      uniqueProducts.forEach((p) => {
        console.log(`   - ${p.name} (${p.id})`);
      });
      console.log('');
    }
  }

  if (duplicateCount === 0) {
    console.log('✅ NO DUPLICATES FOUND! All products have unique images.');
  } else {
    console.log(`❌ Found ${duplicateCount} duplicate image groups`);
  }
}

verifyNoDuplicates().catch(console.error);

