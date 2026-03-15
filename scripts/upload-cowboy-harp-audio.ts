#!/usr/bin/env tsx
/**
 * @fileoverview One-off: upload Cowboy Harp demo MP3s from plughub archive to product-audio bucket and ensure product is associated.
 * @module scripts/upload-cowboy-harp-audio
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'product-audio';
const SLUG = 'cowboy-harp-free-jaw-harp-plugin';
const FOLDER = 'cowboy-harp-free-jaw-harp-plugin'; // product-named folder in bucket
const SOURCE_DIR = '/Users/rjmacbookpro/Development/Archive/plughub-site/src/wp-content/uploads/2024/10';

const DEMO_FILES = [
  'FREE-Cowboy-Harp-Demo-01.mp3',
  'FREE-Cowboy-Harp-Demo-02.mp3',
  'FREE-Cowboy-Harp-Demo-03.mp3',
  'FREE-Cowboy-Harp-Demo-04.mp3',
  'FREE-Cowboy-Harp-Demo-05.mp3',
  'FREE-Cowboy-Harp-Demo-06.mp3',
  'FREE-Cowboy-Harp-Demo-07.mp3',
  'FREE-Cowboy-Harp-Demo-08.mp3',
];

async function uploadOne(localName: string): Promise<string | null> {
  const storageName = `${FOLDER}/${localName.replace(/\s+/g, '-')}`;
  const filePath = path.join(SOURCE_DIR, localName);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Missing: ${filePath}`);
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageName, buffer, { contentType: 'audio/mpeg', upsert: true, cacheControl: '3600' });
  if (error) {
    console.error(`  ❌ Upload ${storageName}:`, error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageName);
  console.log(`  ✅ ${storageName}`);
  return data.publicUrl;
}

async function main() {
  console.log('Uploading Cowboy Harp demos to product-audio...\n');
  const audioSamples: Array<{ url: string; name: string }> = [];
  for (const name of DEMO_FILES) {
    const url = await uploadOne(name);
    if (url) audioSamples.push({ url, name });
  }
  if (audioSamples.length === 0) {
    console.error('\nNo files uploaded.');
    process.exit(1);
  }
  console.log(`\nUploaded ${audioSamples.length} files. Updating product...`);
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('slug', SLUG)
    .single();
  if (fetchErr || !product) {
    console.error('Product not found:', fetchErr?.message);
    process.exit(1);
  }
  const { error: updateErr } = await supabase
    .from('products')
    .update({ audio_samples: audioSamples })
    .eq('id', product.id);
  if (updateErr) {
    console.error('Update product failed:', updateErr.message);
    process.exit(1);
  }
  console.log(`✅ ${product.name} audio_samples updated (${audioSamples.length} tracks).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
