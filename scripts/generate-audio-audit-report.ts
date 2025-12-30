import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateReport() {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, category, audio_samples')
    .order('name');

  if (!products) return;

  const report: string[] = [];
  report.push('# AUDIO DEMOS AUDIT REPORT');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  report.push('## SUMMARY');
  report.push('');

  let needsAttention: any[] = [];
  let correct: any[] = [];
  let noAudio: any[] = [];

  for (const product of products) {
    if (!product.audio_samples || product.audio_samples.length === 0) {
      noAudio.push(product);
      continue;
    }

    const productNameClean = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const issues = product.audio_samples.filter((sample: any) => {
      const fileName = (sample.file_name || sample.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return !fileName.includes(productNameClean.substring(0, Math.min(productNameClean.length, 8)));
    });

    if (issues.length > 0) {
      needsAttention.push({ ...product, issueCount: issues.length });
    } else {
      correct.push(product);
    }
  }

  report.push(`- Total Products: ${products.length}`);
  report.push(`- ✅ Correct Audio: ${correct.length}`);
  report.push(`- ⚠️  Needs Attention: ${needsAttention.length}`);
  report.push(`- ⏭️  No Audio: ${noAudio.length}`);
  report.push('');

  report.push('## ⚠️  PRODUCTS NEEDING MANUAL REVIEW');
  report.push('');
  
  needsAttention.forEach(p => {
    report.push(`### ${p.name}`);
    report.push(`- Slug: \`${p.slug}\``);
    report.push(`- Category: ${p.category}`);
    report.push(`- Audio Files: ${p.audio_samples.length}`);
    report.push(`- Issues: ${p.issueCount} files may not match`);
    report.push('- Files:');
    p.audio_samples.forEach((s: any) => {
      report.push(`  - ${s.file_name || s.name}`);
    });
    report.push('');
  });

  report.push('## ✅ PRODUCTS WITH CORRECT AUDIO');
  report.push('');
  correct.slice(0, 20).forEach(p => {
    report.push(`- ${p.name} (${p.audio_samples.length} files)`);
  });
  if (correct.length > 20) {
    report.push(`... and ${correct.length - 20} more`);
  }

  const reportText = report.join('\n');
  fs.writeFileSync('/tmp/audio-demos-final-report.md', reportText);
  console.log(reportText);
}

generateReport().catch(console.error);
