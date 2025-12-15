import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

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

async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function comprehensiveVerification() {
  console.log('=== Comprehensive Audio File Association Verification ===\n');

  // Fetch all active products with audio
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .not('audio_samples', 'is', null);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products with audio samples found.');
    return;
  }

  console.log(`Verifying ${products.length} products with audio samples...\n`);

  let totalAudioFiles = 0;
  let validStructure = 0;
  let invalidStructure = 0;
  let accessibleUrls = 0;
  let inaccessibleUrls = 0;
  let missingName = 0;
  let missingUrl = 0;
  const issues: Array<{
    product: string;
    slug: string;
    issue: string;
    audioIndex?: number;
  }> = [];

  for (const product of products) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples)) {
      continue;
    }

    for (let i = 0; i < product.audio_samples.length; i++) {
      totalAudioFiles++;
      const audio = product.audio_samples[i];

      // Check structure
      if (!audio || typeof audio !== 'object') {
        invalidStructure++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: 'Invalid audio entry (not an object)',
          audioIndex: i
        });
        continue;
      }

      validStructure++;

      // Check for URL
      const url = audio.url || audio.src || '';
      if (!url || typeof url !== 'string') {
        missingUrl++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: 'Missing URL',
          audioIndex: i
        });
        continue;
      }

      // Check URL format
      if (!url.includes('supabase.co/storage')) {
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `URL not from Supabase Storage: ${url.substring(0, 60)}...`,
          audioIndex: i
        });
      }

      // Check for name
      if (!audio.name || typeof audio.name !== 'string' || audio.name.trim() === '') {
        missingName++;
        // This is a minor issue, but we should fix it
      }

      // Check URL accessibility (sample a few)
      if (totalAudioFiles <= 5 || Math.random() < 0.05) {
        const isAccessible = await checkUrlAccessibility(url);
        if (isAccessible) {
          accessibleUrls++;
        } else {
          inaccessibleUrls++;
          issues.push({
            product: product.name,
            slug: product.slug,
            issue: `Inaccessible URL: ${url.substring(0, 60)}...`,
            audioIndex: i
          });
        }
      }
    }
  }

  // Summary
  console.log('=== Verification Summary ===');
  console.log(`Total audio files: ${totalAudioFiles}`);
  console.log(`Valid structure: ${validStructure}`);
  console.log(`Invalid structure: ${invalidStructure}`);
  console.log(`Missing URL: ${missingUrl}`);
  console.log(`Missing name: ${missingName}`);
  console.log(`Accessible URLs (sampled): ${accessibleUrls}`);
  console.log(`Inaccessible URLs (sampled): ${inaccessibleUrls}`);
  console.log(`Total issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('=== Issues Found ===\n');
    issues.slice(0, 20).forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.product} (${issue.slug})`);
      if (issue.audioIndex !== undefined) {
        console.log(`   Audio #${issue.audioIndex + 1}: ${issue.issue}`);
      } else {
        console.log(`   ${issue.issue}`);
      }
      console.log('');
    });
    if (issues.length > 20) {
      console.log(`... and ${issues.length - 20} more issues\n`);
    }
  } else {
    console.log('✅ All audio files are properly structured and associated!');
  }

  // Check for products that might need name fixes
  if (missingName > 0) {
    console.log(`\n⚠️  ${missingName} audio files are missing names.`);
    console.log('These will still work but may display as "Sample 1", "Sample 2", etc.');
  }

  return {
    totalAudioFiles,
    validStructure,
    invalidStructure,
    missingUrl,
    missingName,
    issues
  };
}

comprehensiveVerification().catch(console.error);

