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

async function deepDatabaseCheck() {
  console.log('=== DEEP DATABASE AUDIO ASSOCIATION CHECK ===\n');

  // Get ALL products (including inactive to see if any were missed)
  const { data: allProducts, error: allError } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples, status')
    .order('name');

  if (allError) {
    console.error('Error fetching all products:', allError);
    return;
  }

  // Get active products with audio
  const { data: activeProductsWithAudio, error: activeError } = await supabase
    .from('products')
    .select('id, name, slug, audio_samples')
    .eq('status', 'active')
    .not('audio_samples', 'is', null);

  if (activeError) {
    console.error('Error fetching active products with audio:', activeError);
    return;
  }

  const activeProductsWithValidAudio = (activeProductsWithAudio || []).filter(p => 
    p.audio_samples && 
    Array.isArray(p.audio_samples) && 
    p.audio_samples.length > 0
  );

  console.log(`Total products in database: ${allProducts?.length || 0}`);
  console.log(`Active products: ${allProducts?.filter(p => p.status === 'active').length || 0}`);
  console.log(`Active products with audio: ${activeProductsWithValidAudio.length}\n`);

  // Deep check each audio file structure
  let totalAudioFiles = 0;
  let perfectFormat = 0;
  let minorIssues = 0;
  let majorIssues = 0;
  const issues: Array<{
    product: string;
    slug: string;
    issue: string;
    audioIndex?: number;
    suggestion?: string;
  }> = [];

  for (const product of activeProductsWithValidAudio) {
    if (!product.audio_samples || !Array.isArray(product.audio_samples)) {
      continue;
    }

    for (let i = 0; i < product.audio_samples.length; i++) {
      totalAudioFiles++;
      const audio = product.audio_samples[i];

      // Check 1: Is it an object?
      if (!audio || typeof audio !== 'object') {
        majorIssues++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} is not an object (type: ${typeof audio})`,
          audioIndex: i,
          suggestion: 'Should be an object with url and name properties'
        });
        continue;
      }

      // Check 2: Has URL?
      const url = audio.url || audio.src || '';
      if (!url || typeof url !== 'string') {
        majorIssues++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} missing URL`,
          audioIndex: i,
          suggestion: 'Add url property with Supabase Storage URL'
        });
        continue;
      }

      // Check 3: URL is from Supabase?
      if (!url.includes('supabase.co/storage')) {
        majorIssues++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} URL not from Supabase Storage`,
          audioIndex: i,
          suggestion: 'Migrate to Supabase Storage'
        });
        continue;
      }

      // Check 4: URL is valid format?
      if (!url.startsWith('https://')) {
        majorIssues++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} URL is not HTTPS`,
          audioIndex: i
        });
        continue;
      }

      // Check 5: Has name? (minor issue if missing)
      if (!audio.name || typeof audio.name !== 'string' || audio.name.trim() === '') {
        minorIssues++;
        // Extract name from URL if possible
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0];
        const suggestedName = fileName.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} missing name`,
          audioIndex: i,
          suggestion: `Add name: "${suggestedName}"`
        });
        continue;
      }

      // Check 6: Name is not empty?
      if (audio.name.trim() === '') {
        minorIssues++;
        issues.push({
          product: product.name,
          slug: product.slug,
          issue: `Audio entry ${i + 1} has empty name`,
          audioIndex: i
        });
        continue;
      }

      // Perfect!
      perfectFormat++;
    }
  }

  console.log('=== Deep Structure Analysis ===');
  console.log(`Total audio files: ${totalAudioFiles}`);
  console.log(`Perfect format: ${perfectFormat}`);
  console.log(`Minor issues (missing name): ${minorIssues}`);
  console.log(`Major issues: ${majorIssues}\n`);

  if (issues.length > 0) {
    console.log('=== Issues Found ===\n');
    
    const majorIssuesList = issues.filter(i => !i.issue.includes('missing name') && !i.issue.includes('empty name'));
    const minorIssuesList = issues.filter(i => i.issue.includes('missing name') || i.issue.includes('empty name'));

    if (majorIssuesList.length > 0) {
      console.log('MAJOR ISSUES (must fix):\n');
      majorIssuesList.slice(0, 10).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.product} (${issue.slug})`);
        console.log(`   ${issue.issue}`);
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
        console.log('');
      });
      if (majorIssuesList.length > 10) {
        console.log(`... and ${majorIssuesList.length - 10} more major issues\n`);
      }
    }

    if (minorIssuesList.length > 0) {
      console.log(`\nMINOR ISSUES (optional - ${minorIssuesList.length} files missing names):\n`);
      console.log('These will work but may display as "Sample 1", "Sample 2", etc.');
      console.log('You can fix these by adding name properties to audio entries.\n');
    }
  } else {
    console.log('✅ ALL AUDIO FILES ARE PERFECTLY FORMATTED!\n');
  }

  // Final summary
  console.log('='.repeat(70));
  console.log('FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Total audio files: ${totalAudioFiles}`);
  console.log(`✅ Perfect format: ${perfectFormat}/${totalAudioFiles} (${((perfectFormat/totalAudioFiles)*100).toFixed(1)}%)`);
  console.log(`⚠️  Minor issues: ${minorIssues}`);
  console.log(`❌ Major issues: ${majorIssues}`);
  console.log(`✅ Production ready: ${majorIssues === 0 ? 'YES' : 'NO'}`);
  console.log('='.repeat(70));

  if (majorIssues === 0) {
    console.log('\n🎉 ALL AUDIO FILES ARE PROPERLY ASSOCIATED! 🎉\n');
    if (minorIssues > 0) {
      console.log(`Note: ${minorIssues} files are missing names but will still work.`);
      console.log('You can optionally add names for better display.\n');
    }
  } else {
    console.log(`\n⚠️  ${majorIssues} major issues need to be fixed before production.\n`);
  }
}

deepDatabaseCheck().catch(console.error);

