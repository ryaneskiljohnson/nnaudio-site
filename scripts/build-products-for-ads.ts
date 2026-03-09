/**
 * @fileoverview Builds condensed, ad-ready product reference for Marketing Director and ad copy.
 * @module scripts/build-products-for-ads
 *
 * Run: npx tsx scripts/build-products-for-ads.ts
 * Writes: .cursor/skills/marketing-director/products-reference.md
 *
 * Load .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const OUT_DIR = resolve(__dirname, '../.cursor/skills/marketing-director');
const OUT_FILE = resolve(OUT_DIR, 'products-reference.md');

const BASE_URL = 'https://nnaud.io';
const PITCH_MAX_LEN = 120;
const BULLET_MAX_LEN = 80;
const BULLET_COUNT = 3;

function escapeMd(text: string | null | undefined): string {
  if (text == null || text === '') return '';
  return String(text)
    .replace(/\|/g, '\\|')
    .replace(/\n+/g, ' ')
    .trim();
}

function stripMarkdown(text: string | null | undefined, maxLen: number): string {
  if (text == null || text === '') return '';
  let out = String(text)
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > maxLen) out = out.slice(0, maxLen) + '…';
  return escapeMd(out) || '';
}

/** First 2–3 feature titles (or title + short desc) as short bullets for ad copy. */
function featuresToShortBullets(features: unknown, maxBullets: number, maxLen: number): string[] {
  if (!Array.isArray(features)) return [];
  const bullets: string[] = [];
  for (const f of features) {
    if (bullets.length >= maxBullets) break;
    const title = (f?.title ?? f?.name ?? '').trim();
    const desc = (f?.description ?? '').trim();
    const line = title + (desc ? ': ' + desc : '');
    const clipped = line.length > maxLen ? line.slice(0, maxLen) + '…' : line;
    if (clipped) bullets.push(escapeMd(clipped));
  }
  return bullets;
}

/** One-line ad pitch from tagline + short_description, capped. */
function oneLinePitch(tagline: string | null | undefined, short: string | null | undefined): string {
  const parts = [tagline, short].filter(Boolean).map((s) => escapeMd(String(s).trim()));
  const combined = parts.join(' — ');
  return combined.length > PITCH_MAX_LEN ? combined.slice(0, PITCH_MAX_LEN) + '…' : combined;
}

const CATEGORY_ORDER = [
  'application',
  'instrument-plugin',
  'audio-fx-plugin',
  'midi-fx-plugin',
  'pack',
  'bundle',
  'preset',
  'template',
];

const CATEGORY_LABELS: Record<string, string> = {
  application: 'Applications',
  'instrument-plugin': 'Instrument plugins',
  'audio-fx-plugin': 'Audio FX plugins',
  'midi-fx-plugin': 'MIDI FX plugins',
  pack: 'Packs',
  bundle: 'Bundles',
  preset: 'Presets',
  template: 'Templates',
};

async function main() {
  console.log('Building products reference for ads...');
  const supabase = await createAdminClient();

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      'id, name, slug, category, tagline, short_description, description, features, price, sale_price'
    )
    .eq('status', 'active')
    .order('name');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    process.exit(1);
  }

  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      slug,
      tagline,
      short_description,
      bundle_type,
      bundle_subscription_tiers(id, subscription_type, price, sale_price, active)
    `)
    .eq('status', 'active')
    .order('display_order', { ascending: true })
    .order('name');

  if (bundlesError) {
    console.error('Error fetching bundles:', bundlesError);
    process.exit(1);
  }

  const bundleIds = (bundles || []).map((b: any) => b.id);
  const bundleProductsMap = new Map<string, number>();
  if (bundleIds.length > 0) {
    const { data: bpRows, error: bpError } = await supabase
      .from('bundle_products')
      .select('bundle_id')
      .in('bundle_id', bundleIds);

    if (!bpError && bpRows) {
      for (const row of bpRows as any[]) {
        const bid = row.bundle_id;
        if (!bid) continue;
        bundleProductsMap.set(bid, (bundleProductsMap.get(bid) || 0) + 1);
      }
    }
  }

  const sections: string[] = [];
  sections.push('# NNAudio products reference (for ad copy)');
  sections.push('');
  sections.push(
    'Use this file for all product names, taglines, one-line pitches, prices, and URLs when drafting campaigns and ads. Do not use MCP for product data; this is the source of truth for the Marketing Director.'
  );
  sections.push('');
  sections.push('---');
  sections.push('');

  const byCategory = new Map<string, any[]>();
  for (const p of products || []) {
    const cat = (p as any).category || 'other';
    const list = byCategory.get(cat) || [];
    list.push(p);
    byCategory.set(cat, list);
  }

  for (const cat of CATEGORY_ORDER) {
    const list = byCategory.get(cat);
    if (!list?.length) continue;
    const label = CATEGORY_LABELS[cat] || cat;
    sections.push(`## ${label}`);
    sections.push('');

    for (const p of list) {
      const name = escapeMd((p as any).name);
      const slug = escapeMd((p as any).slug);
      const tagline = escapeMd((p as any).tagline);
      const short = (p as any).short_description;
      const price = (p as any).price;
      const salePrice = (p as any).sale_price;
      const pitch = oneLinePitch(tagline, short);
      const bullets = featuresToShortBullets((p as any).features, BULLET_COUNT, BULLET_MAX_LEN);
      const url = `${BASE_URL}/product/${slug}`;

      sections.push(`### ${name}`);
      sections.push('');
      sections.push(`- **Slug**: ${slug}`);
      if (tagline) sections.push(`- **Tagline**: ${tagline}`);
      sections.push(`- **One-line pitch**: ${pitch}`);
      if (typeof price === 'number') sections.push(`- **Price**: $${price}`);
      if (salePrice != null && typeof salePrice === 'number' && salePrice !== price) {
        sections.push(`- **Sale price**: $${salePrice}`);
      }
      sections.push(`- **URL**: ${url}`);
      if (bullets.length) {
        sections.push('- **Differentiators**:');
        bullets.forEach((b) => sections.push(`  - ${b}`));
      }
      sections.push('');
    }
  }

  sections.push('---');
  sections.push('');
  sections.push('## Bundles');
  sections.push('');

  for (const b of bundles || []) {
    const name = escapeMd((b as any).name);
    const slug = escapeMd((b as any).slug);
    const tagline = escapeMd((b as any).tagline);
    const short = (b as any).short_description;
    const tiers = (b as any).bundle_subscription_tiers || [];
    const activeTiers = tiers.filter((t: any) => t.active);
    const tierParts = activeTiers.map((t: any) => {
      const priceStr = t.sale_price != null ? `$${t.sale_price}` : t.price != null ? `$${t.price}` : '';
      return priceStr ? `${t.subscription_type} ${priceStr}` : t.subscription_type;
    });
    const tierStr = tierParts.join(', ');
    const count = bundleProductsMap.get((b as any).id) || 0;
    const pitch = oneLinePitch(tagline, short);
    const url = `${BASE_URL}/bundles/${slug}`;

    sections.push(`### ${name}`);
    sections.push('');
    sections.push(`- **Slug**: ${slug}`);
    if (tagline) sections.push(`- **Tagline**: ${tagline}`);
    sections.push(`- **One-line pitch**: ${pitch}`);
    sections.push(`- **Includes**: ${count} products`);
    if (tierStr) sections.push(`- **Tiers**: ${tierStr}`);
    sections.push(`- **URL**: ${url}`);
    sections.push('');
  }

  const markdown = sections.join('\n');
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, markdown, 'utf8');
  console.log(`Wrote ${OUT_FILE} (${(products?.length || 0)} products, ${(bundles?.length || 0)} bundles, ${markdown.length} chars).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
