import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  audio_samples: any;
}

async function auditAudioDemos() {
  console.log('🔍 Auditing audio demos for all products...\n');

  // Fetch all products with audio samples
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, audio_samples')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }

  let issueCount = 0;

  for (const product of products) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 Product: ${product.name}`);
    console.log(`   Slug: ${product.slug}`);
    console.log(`   Category: ${product.category}`);
    
    if (!product.audio_samples || product.audio_samples.length === 0) {
      console.log('   ⚠️  NO AUDIO SAMPLES');
      issueCount++;
      continue;
    }

    console.log(`   Audio Samples (${product.audio_samples.length}):`);
    
    const issues: string[] = [];
    const productNameLower = product.name.toLowerCase();
    const productSlugLower = product.slug.toLowerCase();
    
    // Common name variations to check
    const nameVariations = [
      productNameLower,
      productSlugLower,
      productNameLower.replace(/\s+/g, ''),
      productNameLower.replace(/\s+/g, '-'),
      productNameLower.replace(/\s+/g, '_'),
    ];

    product.audio_samples.forEach((demo: any, index: number) => {
      const fileName = demo.file_name || demo.name || 'unknown';
      const fileNameLower = fileName.toLowerCase();
      const url = demo.url || 'no-url';
      
      console.log(`   ${index + 1}. ${fileName}`);
      console.log(`      URL: ${url}`);
      
      // Check if filename contains this product's name
      const matchesProduct = nameVariations.some(variant => 
        fileNameLower.includes(variant)
      );
      
      if (!matchesProduct) {
        issues.push(`❌ "${fileName}" doesn't appear to match product "${product.name}"`);
      }
      
      // Check if filename contains OTHER product names (cross-contamination)
      const otherProducts = products.filter(p => p.id !== product.id);
      const containsOtherProduct = otherProducts.find(other => {
        const otherNameLower = other.name.toLowerCase();
        const otherSlugLower = other.slug.toLowerCase();
        
        // Skip very short names to avoid false positives
        if (otherNameLower.length < 4) return false;
        
        return fileNameLower.includes(otherNameLower) || 
               fileNameLower.includes(otherSlugLower);
      });
      
      if (containsOtherProduct) {
        issues.push(`❌ "${fileName}" appears to contain audio from "${containsOtherProduct.name}"`);
      }
    });

    if (issues.length > 0) {
      console.log(`\n   🚨 ISSUES FOUND:`);
      issues.forEach(issue => console.log(`      ${issue}`));
      issueCount++;
    } else {
      console.log(`   ✅ Audio demos appear correct`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Products: ${products.length}`);
  console.log(`   Products with Issues: ${issueCount}`);
  console.log(`   Products OK: ${products.length - issueCount}`);
}

auditAudioDemos().catch(console.error);
