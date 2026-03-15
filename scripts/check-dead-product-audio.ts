#!/usr/bin/env tsx
/**
 * @fileoverview Check all products with audio_samples for dead product-audio storage links.
 * @module scripts/check-dead-product-audio
 * @note Compares DB URLs to storage.objects; outputs products and sample names with missing objects.
 */
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
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'product-audio';

/** Decode path segment from URL (e.g. %20 -> space) for matching storage.object name. */
function decodedStoragePath(url: string): string | null {
  const match = url.match(/\/product-audio\/([^?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch {
    return match[1];
  }
}

async function main() {
  console.log('Checking product-audio links...\n');

  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, slug, name, audio_samples')
    .not('audio_samples', 'is', null);

  if (productsErr) {
    console.error('Failed to fetch products:', productsErr.message);
    process.exit(1);
  }

  const objectNames = new Set<string>();

  async function listAll(prefix: string): Promise<void> {
    const { data: list, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000 });
    if (listErr) {
      console.error(`Failed to list ${prefix || '(root)'}:`, listErr.message);
      return;
    }
    for (const e of list ?? []) {
      if (!e.name) continue;
      const fullPath = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id != null || e.metadata) {
        objectNames.add(fullPath);
      } else {
        await listAll(fullPath);
      }
    }
  }
  await listAll('');

  const dead: Array<{ slug: string; product_name: string; sample_name: string; storage_path: string }> = [];

  for (const p of products ?? []) {
    const samples = (p.audio_samples as Array<{ url?: string; name?: string }>) ?? [];
    for (const s of samples) {
      const url = s?.url;
      if (!url || !url.includes('/product-audio/')) continue;
      const path = decodedStoragePath(url);
      if (!path) continue;
      if (!objectNames.has(path)) {
        dead.push({
          slug: p.slug,
          product_name: p.name,
          sample_name: s?.name ?? path,
          storage_path: path,
        });
      }
    }
  }

  const bySlug = new Map<string, typeof dead>();
  for (const d of dead) {
    const list = bySlug.get(d.slug) ?? [];
    list.push(d);
    bySlug.set(d.slug, list);
  }

  console.log('Dead product-audio links (object missing in storage):');
  console.log('—'.repeat(60));
  if (bySlug.size === 0) {
    console.log('None. All product-audio links point to existing objects.');
    return;
  }
  console.log(`Products affected: ${bySlug.size}`);
  console.log(`Total dead sample links: ${dead.length}\n`);
  for (const [slug, entries] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`${entries[0].product_name} (${slug}) — ${entries.length} missing`);
    for (const e of entries) {
      console.log(`  • ${e.sample_name}`);
      console.log(`    path: ${e.storage_path}`);
    }
    console.log('');
  }
  console.log('—'.repeat(60));
  console.log('Fix by uploading missing files to bucket "product-audio" with the path above, then re-run this script to verify.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
