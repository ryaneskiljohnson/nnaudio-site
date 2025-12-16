import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BundleProduct {
  bundle_id: string;
  bundle_name: string;
  product_id: string;
  product_name: string;
}

async function checkEliteBundleUniqueness() {
  console.log('=== Checking Elite Bundle Product Uniqueness ===\n');

  // Get all elite bundles (bundles with subscription tiers)
  const { data: eliteBundles, error: bundlesError } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      slug,
      bundle_subscription_tiers!inner(id)
    `)
    .eq('status', 'active');

  if (bundlesError) {
    console.error('Error fetching elite bundles:', bundlesError);
    return;
  }

  if (!eliteBundles || eliteBundles.length === 0) {
    console.log('No elite bundles found');
    return;
  }

  console.log(`Found ${eliteBundles.length} elite bundle(s):\n`);
  eliteBundles.forEach(bundle => {
    console.log(`  - ${bundle.name} (${bundle.slug})`);
  });
  console.log('\n');

  // Get all products in elite bundles
  const eliteBundleIds = eliteBundles.map(b => b.id);
  
  const { data: eliteBundleProducts, error: productsError } = await supabase
    .from('bundle_products')
    .select(`
      bundle_id,
      product_id,
      bundle:bundles!inner(id, name),
      product:products!inner(id, name, category)
    `)
    .in('bundle_id', eliteBundleIds);

  if (productsError) {
    console.error('Error fetching elite bundle products:', productsError);
    return;
  }

  // Group products by product_id to find duplicates
  const productToBundles = new Map<string, Array<{ bundleId: string; bundleName: string }>>();
  
  (eliteBundleProducts || []).forEach((bp: any) => {
    const productId = bp.product_id;
    const bundleId = bp.bundle_id;
    const bundleName = bp.bundle.name;
    
    if (!productToBundles.has(productId)) {
      productToBundles.set(productId, []);
    }
    
    productToBundles.get(productId)!.push({ bundleId, bundleName });
  });

  // Find products that appear in multiple elite bundles
  const duplicateProducts: Array<{
    productId: string;
    productName: string;
    bundles: Array<{ bundleId: string; bundleName: string }>;
  }> = [];

  productToBundles.forEach((bundles, productId) => {
    if (bundles.length > 1) {
      const bp = eliteBundleProducts?.find((p: any) => p.product_id === productId);
      duplicateProducts.push({
        productId,
        productName: bp?.product?.name || 'Unknown',
        bundles,
      });
    }
  });

  if (duplicateProducts.length > 0) {
    console.log(`⚠️  Found ${duplicateProducts.length} product(s) that appear in multiple elite bundles:\n`);
    duplicateProducts.forEach(({ productName, bundles }) => {
      console.log(`  Product: ${productName}`);
      console.log(`    Appears in:`);
      bundles.forEach(({ bundleName }) => {
        console.log(`      - ${bundleName}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ All elite bundles contain unique products (no duplicates found)\n');
  }

  // Now check if elite bundles include products from non-elite bundles
  console.log('=== Checking if elite bundles include products from other bundles ===\n');

  const { data: allBundleProducts, error: allProductsError } = await supabase
    .from('bundle_products')
    .select(`
      bundle_id,
      product_id,
      bundle:bundles!inner(id, name, status),
      product:products!inner(id, name)
    `)
    .eq('bundle.status', 'active');

  if (allProductsError) {
    console.error('Error fetching all bundle products:', allProductsError);
    return;
  }

  // Get all product IDs in elite bundles
  const eliteProductIds = new Set(
    (eliteBundleProducts || []).map((bp: any) => bp.product_id)
  );

  // Find products in elite bundles that also appear in non-elite bundles
  const sharedProducts: Array<{
    productId: string;
    productName: string;
    inEliteBundles: string[];
    inOtherBundles: string[];
  }> = [];

  const productToAllBundles = new Map<string, Array<{ bundleId: string; bundleName: string; isElite: boolean }>>();

  (allBundleProducts || []).forEach((bp: any) => {
    const productId = bp.product_id;
    const bundleId = bp.bundle_id;
    const bundleName = bp.bundle.name;
    const isElite = eliteBundleIds.includes(bundleId);

    if (!productToAllBundles.has(productId)) {
      productToAllBundles.set(productId, []);
    }

    productToAllBundles.get(productId)!.push({ bundleId, bundleName, isElite });
  });

  productToAllBundles.forEach((bundles, productId) => {
    const eliteBundles = bundles.filter(b => b.isElite);
    const otherBundles = bundles.filter(b => !b.isElite);

    if (eliteBundles.length > 0 && otherBundles.length > 0) {
      const bp = allBundleProducts?.find((p: any) => p.product_id === productId);
      sharedProducts.push({
        productId,
        productName: bp?.product?.name || 'Unknown',
        inEliteBundles: eliteBundles.map(b => b.bundleName),
        inOtherBundles: otherBundles.map(b => b.bundleName),
      });
    }
  });

  if (sharedProducts.length > 0) {
    console.log(`⚠️  Found ${sharedProducts.length} product(s) in elite bundles that also appear in other bundles:\n`);
    sharedProducts.forEach(({ productName, inEliteBundles, inOtherBundles }) => {
      console.log(`  Product: ${productName}`);
      console.log(`    In elite bundles: ${inEliteBundles.join(', ')}`);
      console.log(`    Also in other bundles: ${inOtherBundles.join(', ')}`);
      console.log('');
    });
  } else {
    console.log('✅ Elite bundles only contain products that are not in other bundles\n');
  }

  // Summary
  console.log('=== Summary ===\n');
  console.log(`Elite bundles: ${eliteBundles.length}`);
  console.log(`Total products in elite bundles: ${eliteProductIds.size}`);
  console.log(`Products duplicated across elite bundles: ${duplicateProducts.length}`);
  console.log(`Products shared with other bundles: ${sharedProducts.length}`);
}

checkEliteBundleUniqueness()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
