/**
 * @fileoverview Script to find duplicate feature images across products
 * @module scripts/find-duplicate-feature-images
 */

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

interface Feature {
  title: string;
  description?: string;
  image_url?: string;
  gif_url?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  features: Feature[];
}

async function findDuplicateFeatureImages() {
  console.log('🔍 Finding duplicate feature images...\n');

  // Fetch all products with features
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, features')
    .not('features', 'is', null);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products with features found.');
    return;
  }

  // Map to track image usage
  const imageUsage: Map<string, Array<{ product: string; productSlug: string; featureTitle: string; featureIndex: number }>> = new Map();

  // Analyze each product's features
  products.forEach((product: Product) => {
    if (!product.features || !Array.isArray(product.features)) {
      return;
    }

    product.features.forEach((feature: Feature, index: number) => {
      const imageUrl = feature.image_url || feature.gif_url;
      if (imageUrl) {
        if (!imageUsage.has(imageUrl)) {
          imageUsage.set(imageUrl, []);
        }
        imageUsage.get(imageUrl)!.push({
          product: product.name,
          productSlug: product.slug,
          featureTitle: feature.title || `Feature ${index + 1}`,
          featureIndex: index,
        });
      }
    });
  });

  // Find duplicates (images used more than once)
  const duplicates = Array.from(imageUsage.entries())
    .filter(([_, usages]) => usages.length > 1)
    .sort((a, b) => b[1].length - a[1].length); // Sort by usage count

  if (duplicates.length === 0) {
    console.log('✅ No duplicate images found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} images used multiple times:\n`);

  duplicates.forEach(([imageUrl, usages]) => {
    console.log(`📸 Image: ${imageUrl}`);
    console.log(`   Used ${usages.length} times:\n`);
    
    usages.forEach((usage, idx) => {
      console.log(`   ${idx + 1}. ${usage.product} (${usage.productSlug})`);
      console.log(`      Feature: "${usage.featureTitle}" (index ${usage.featureIndex})`);
    });
    
    console.log('');
  });

  // Summary by product
  console.log('\n📊 Summary by Product:\n');
  
  const productDuplicates: Map<string, Array<{ image: string; featureTitle: string; featureIndex: number }>> = new Map();
  
  duplicates.forEach(([imageUrl, usages]) => {
    usages.forEach(usage => {
      if (!productDuplicates.has(usage.productSlug)) {
        productDuplicates.set(usage.productSlug, []);
      }
      productDuplicates.get(usage.productSlug)!.push({
        image: imageUrl,
        featureTitle: usage.featureTitle,
        featureIndex: usage.featureIndex,
      });
    });
  });

  productDuplicates.forEach((dups, productSlug) => {
    const product = products.find((p: Product) => p.slug === productSlug);
    console.log(`\n${product?.name || productSlug} (${productSlug}):`);
    console.log(`   ${dups.length} features with duplicate images`);
    
    // Group by image
    const byImage = new Map<string, string[]>();
    dups.forEach(dup => {
      if (!byImage.has(dup.image)) {
        byImage.set(dup.image, []);
      }
      byImage.get(dup.image)!.push(dup.featureTitle);
    });
    
    byImage.forEach((features, image) => {
      console.log(`   - ${image}: ${features.join(', ')}`);
    });
  });
}

findDuplicateFeatureImages()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
