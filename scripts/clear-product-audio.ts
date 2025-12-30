import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearProductAudio(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .update({ audio_samples: [] })
    .eq('slug', slug)
    .select('name');
  
  if (error) {
    console.error(`❌ Error clearing ${slug}:`, error);
  } else {
    console.log(`✅ Cleared audio samples for: ${data[0]?.name || slug}`);
  }
}

const slug = process.argv[2];
if (!slug) {
  console.log('Usage: npx tsx scripts/clear-product-audio.ts <slug>');
  process.exit(1);
}

clearProductAudio(slug);
