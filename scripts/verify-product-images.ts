/**
 * @fileoverview Verify all product image URLs exist in Supabase storage and fix broken references
 * @module scripts/verify-product-images
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const STORAGE_BASE = `${supabaseUrl}/storage/v1/object/public/product-images/`;

function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/product-images\/(.+)$/);
  return match ? match[1] : null;
}

function isSupabaseProductImage(url: string): boolean {
  return url?.includes('supabase.co/storage') && url?.includes('product-images');
}

function isLocalPath(url: string): boolean {
  return url?.startsWith('/');
}

const FIX_MAPPINGS: Record<string, string> = {
  'albanju-gui.webp': 'albanju-features-gui.webp',
  'blaque-gui.webp': 'blaque-features-gui.webp',
  'tactures-gui.webp': 'tactures-features-gui.webp',
  'subflux-gui.webp': 'subflux-features-gui.webp',
  'digital-echoes-gui.webp': 'digital-echoes-features-visuals.webp',
  'rompl-gui.webp': 'rompl-features-sampler-ui.webp',
  'mesosphere-gui.webp': 'mesosphere-features-gui.webp',
  'noker-gui.webp': 'noker-features-gui.webp',
};

async function fetchAllStoragePaths(): Promise<Set<string>> {
  const paths = new Set<string>();
  const folders = ['', 'product-backgrounds', 'product-images', 'bundles', 'cymasynth', 'nnaudio-access', 'orbitals'];

  for (const folder of folders) {
    const { data } = await supabase.storage
      .from('product-images')
      .list(folder, { limit: 1000 });

    for (const item of data || []) {
      if (item.name && !item.name.startsWith('.')) {
        const path = folder ? `${folder}/${item.name}` : item.name;
        paths.add(path);
      }
    }
  }

  return paths;
}

async function main() {
  console.log('\n🔍 Product Image Verification Audit\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, logo_url, background_image_url')
    .eq('status', 'active');

  if (error || !products) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }

  console.log('Fetching storage paths...');
  const existingPaths = await fetchAllStoragePaths();
  console.log(`  Found ${existingPaths.size} files in storage\n`);

  const broken: Array<{ product: string; slug: string; field: string; path: string }> = [];
  const fixes: Array<{ id: string; slug: string; field: string; newUrl: string }> = [];

  for (const p of products) {
    const urls = [
      { field: 'featured_image_url', url: p.featured_image_url },
      { field: 'logo_url', url: p.logo_url },
      { field: 'background_image_url', url: p.background_image_url },
    ];

    for (const { field, url } of urls) {
      if (!url || isLocalPath(url)) continue;
      if (!isSupabaseProductImage(url)) continue;

      const path = extractStoragePath(url);
      if (!path) continue;

      if (!existingPaths.has(path)) {
        broken.push({ product: p.name, slug: p.slug, field, path });

        let altPath: string | null = FIX_MAPPINGS[path.split('/').pop() || ''] || null;
        if (!altPath) {
          const fileName = path.split('/').pop() || '';
          for (const existing of existingPaths) {
            if (existing.endsWith('/' + fileName) || existing === fileName) {
              altPath = existing;
              break;
            }
          }
        }

        if (altPath && existingPaths.has(altPath)) {
          fixes.push({
            id: p.id,
            slug: p.slug,
            field,
            newUrl: `${STORAGE_BASE}${altPath}`,
          });
        }
      }
    }
  }

  console.log(`📊 Results: ${products.length} products, ${broken.length} broken, ${fixes.length} fixable\n`);

  if (broken.length > 0) {
    console.log('❌ Broken references:\n');
    for (const b of broken) {
      const fix = fixes.find(f => f.slug === b.slug && f.field === b.field);
      console.log(`   ${b.product} | ${b.field}: ${b.path}${fix ? ` → fix` : ''}`);
    }
  }

  if (fixes.length > 0) {
    console.log(`\n🔧 Applying ${fixes.length} fixes...\n`);
    for (const fix of fixes) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ [fix.field]: fix.newUrl })
        .eq('id', fix.id);

      if (updateError) {
        console.error(`   ❌ ${fix.slug}: ${updateError.message}`);
      } else {
        console.log(`   ✅ ${fix.slug} - ${fix.field}`);
      }
    }
  } else if (broken.length === 0) {
    console.log('✅ All product images exist in storage!');
  }

  console.log('\n');
}

main().catch(console.error);
