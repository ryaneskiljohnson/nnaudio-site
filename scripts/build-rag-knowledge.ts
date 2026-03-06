/**
 * @fileoverview Builds RAG knowledge markdown from products and bundles (Supabase).
 * @module scripts/build-rag-knowledge
 *
 * Run: npx tsx scripts/build-rag-knowledge.ts
 * Writes: lib/rag-knowledge/products-and-bundles.md
 *
 * Load .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createAdminClient } from '@/utils/supabase/service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const OUT_DIR = resolve(__dirname, '../lib/rag-knowledge');
const OUT_FILE = resolve(OUT_DIR, 'products-and-bundles.md');

const DESCRIPTION_MAX_LEN = 1200;
const REVIEW_SNIPPET_LEN = 120;

function escapeMd(text: string | null | undefined): string {
  if (text == null || text === '') return '';
  return String(text)
    .replace(/\|/g, '\\|')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Strip markdown to plain text and cap length for RAG.
 */
function stripMarkdown(text: string | null | undefined, maxLen: number): string {
  if (text == null || text === '') return '';
  let out = String(text)
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > maxLen) out = out.slice(0, maxLen) + '…';
  return escapeMd(out) || '';
}

/**
 * Format approved reviews for a product: up to 2 snippets with rating.
 */
function formatReviews(
  reviews: Array<{ rating?: number; review_text?: string | null }>,
  maxSnippetLen: number
): string {
  if (!reviews?.length) return '';
  const lines = reviews.slice(0, 2).map((r) => {
    const stars = r.rating != null ? `${r.rating} stars` : 'review';
    const text = (r.review_text || '').trim().slice(0, maxSnippetLen);
    const snippet = text ? (text.length >= (r.review_text || '').length ? text : text + '…') : '';
    if (!snippet) return '';
    return `- **Review** (${stars}): "${escapeMd(snippet)}"`;
  });
  return lines.filter(Boolean).join('\n');
}

function featuresToBullets(features: unknown): string {
  if (!Array.isArray(features)) return '';
  return features
    .map((f: any) => {
      const title = f?.title ?? f?.name ?? '';
      const desc = f?.description ?? '';
      return title ? `- ${escapeMd(title)}${desc ? ': ' + escapeMd(desc) : ''}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function requirementsSummary(requirements: unknown, specifications: unknown): string {
  const parts: string[] = [];
  if (requirements && typeof requirements === 'object') {
    const r = requirements as Record<string, unknown>;
    if (r.format) parts.push(`Format: ${r.format}`);
    if (r.windows) parts.push(`Windows: ${r.windows}`);
    if (r.mac) parts.push(`Mac: ${r.mac}`);
    if (r.ram) parts.push(`RAM: ${r.ram}`);
    if (r.disk_space) parts.push(`Disk: ${r.disk_space}`);
  }
  if (specifications && typeof specifications === 'object') {
    const s = specifications as Record<string, unknown>;
    if (s['Format Type']) parts.push(`Format: ${s['Format Type']}`);
    if (s['Operating System']) parts.push(`OS: ${s['Operating System']}`);
    if (s['DAW Compatibility']) parts.push(`DAW: ${s['DAW Compatibility']}`);
  }
  return parts.length ? parts.join('; ') : '';
}

function metaKeywordsToString(meta: string | string[] | null | undefined): string {
  if (meta == null) return '';
  if (Array.isArray(meta)) return meta.join(', ');
  return String(meta).trim();
}

async function main() {
  console.log('Building RAG knowledge: products and bundles...');
  const supabase = await createAdminClient();

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      'id, name, slug, category, tagline, short_description, description, features, requirements, specifications, price, sale_price, meta_keywords, meta_description'
    )
    .eq('status', 'active')
    .order('name');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    process.exit(1);
  }

  const { data: reviewsRows, error: reviewsError } = await supabase
    .from('product_reviews')
    .select('product_id, rating, review_text, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    console.warn('Warning: could not fetch reviews:', reviewsError.message);
  }

  const reviewsByProductId = new Map<string, Array<{ rating?: number; review_text?: string | null }>>();
  for (const r of reviewsRows || []) {
    const pid = (r as any).product_id;
    if (!pid) continue;
    let list = reviewsByProductId.get(pid);
    if (!list) {
      list = [];
      reviewsByProductId.set(pid, list);
    }
    if (list.length < 2) list.push({ rating: (r as any).rating, review_text: (r as any).review_text });
  }

  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select(`
      id,
      name,
      slug,
      tagline,
      short_description,
      description,
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
  let bundleProductsMap = new Map<string, Array<{ name: string; slug: string; tagline: string | null }>>();
  if (bundleIds.length > 0) {
    const { data: bpRows, error: bpError } = await supabase
      .from('bundle_products')
      .select(`
        bundle_id,
        product:products(name, slug, tagline)
      `)
      .in('bundle_id', bundleIds)
      .order('display_order', { ascending: true });

    if (!bpError && bpRows) {
      for (const row of bpRows as any[]) {
        const bid = row.bundle_id;
        const prod = row.product;
        if (!bid || !prod?.name) continue;
        let list = bundleProductsMap.get(bid);
        if (!list) {
          list = [];
          bundleProductsMap.set(bid, list);
        }
        list.push({
          name: prod.name || '',
          slug: prod.slug || '',
          tagline: prod.tagline ?? null,
        });
      }
    }
  }

  const sections: string[] = [];
  sections.push('# NNAudio Products and Bundles (for RAG)');
  sections.push('');
  sections.push(
    'Use this to answer "what products do you have?", "tell me about X", or "where can I buy Y?". Link to /product/{slug} or /bundles/{slug}. Recommend only products/bundles listed here; state prices and details only when they appear below.'
  );
  sections.push('');
  sections.push('## Category quick reference');
  sections.push('');
  const byCategory = new Map<string, string[]>();
  for (const p of products || []) {
    const cat = (p as any).category || 'other';
    const list = byCategory.get(cat) || [];
    list.push(escapeMd((p as any).name));
    byCategory.set(cat, list);
  }
  const categoryOrder = [
    'instrument-plugin',
    'audio-fx-plugin',
    'midi-fx-plugin',
    'pack',
    'bundle',
    'application',
    'preset',
    'template',
  ];
  const categoryLabels: Record<string, string> = {
    'instrument-plugin': 'Instrument plugins',
    'audio-fx-plugin': 'Audio FX plugins',
    'midi-fx-plugin': 'MIDI FX plugins',
    pack: 'Packs',
    bundle: 'Bundles',
    application: 'Applications',
    preset: 'Presets',
    template: 'Templates',
  };
  for (const cat of categoryOrder) {
    const names = byCategory.get(cat);
    if (!names?.length) continue;
    const label = categoryLabels[cat] || cat;
    sections.push(`- **${label}**: ${names.join(', ')}`);
  }
  sections.push('');
  sections.push('---');
  sections.push('');

  for (const p of products || []) {
    const name = escapeMd((p as any).name);
    const slug = escapeMd((p as any).slug);
    const category = escapeMd((p as any).category);
    const tagline = escapeMd((p as any).tagline);
    const short = escapeMd((p as any).short_description);
    const descriptionExcerpt = stripMarkdown((p as any).description, DESCRIPTION_MAX_LEN);
    const price = (p as any).price;
    const salePrice = (p as any).sale_price;
    const keywords = metaKeywordsToString((p as any).meta_keywords);
    const featuresMd = featuresToBullets((p as any).features);
    const reqSummary = requirementsSummary((p as any).requirements, (p as any).specifications);
    const productReviews = reviewsByProductId.get((p as any).id) || [];
    const reviewsMd = formatReviews(productReviews, REVIEW_SNIPPET_LEN);

    sections.push(`## Product: ${name}`);
    sections.push('');
    sections.push(`- **Slug**: ${slug}`);
    sections.push(`- **Category**: ${category}`);
    if (tagline) sections.push(`- **Tagline**: ${tagline}`);
    if (typeof price === 'number') sections.push(`- **Price**: $${price}`);
    if (salePrice != null && typeof salePrice === 'number' && salePrice !== price)
      sections.push(`- **Sale price**: $${salePrice}`);
    if (short) sections.push(`- **Summary**: ${short}`);
    if (descriptionExcerpt) sections.push(`- **Description**: ${descriptionExcerpt}`);
    if (keywords) sections.push(`- **Keywords**: ${keywords}`);
    if (featuresMd) {
      sections.push('- **Features**:');
      sections.push(featuresMd);
    }
    if (reqSummary) sections.push(`- **Compatibility**: ${reqSummary}`);
    if (reviewsMd) {
      sections.push('- **Reviews**:');
      sections.push(reviewsMd);
    }
    sections.push(`- **Page**: /product/${slug}`);
    sections.push('');
  }

  sections.push('---');
  sections.push('');
  sections.push('## Bundles');
  sections.push('');

  for (const b of bundles || []) {
    const name = escapeMd((b as any).name);
    const slug = escapeMd((b as any).slug);
    const tagline = escapeMd((b as any).tagline);
    const bundleType = escapeMd((b as any).bundle_type);
    const short = escapeMd((b as any).short_description);
    const descriptionExcerpt = stripMarkdown((b as any).description, DESCRIPTION_MAX_LEN);
    const tiers = (b as any).bundle_subscription_tiers || [];
    const activeTiers = tiers.filter((t: any) => t.active);
    const tierParts = activeTiers.map((t: any) => {
      const priceStr = t.sale_price != null ? `$${t.sale_price}` : t.price != null ? `$${t.price}` : '';
      return priceStr ? `${t.subscription_type} (${priceStr})` : t.subscription_type;
    });
    const tierStr = tierParts.join(', ');
    const includes = bundleProductsMap.get((b as any).id) || [];
    const includesStr = includes
      .map((i) => (i.tagline ? `${i.name} (${escapeMd(i.tagline)})` : i.name))
      .join('; ');

    sections.push(`### Bundle: ${name}`);
    sections.push('');
    sections.push(`- **Slug**: ${slug}`);
    if (tagline) sections.push(`- **Tagline**: ${tagline}`);
    if (bundleType) sections.push(`- **Bundle type**: ${bundleType}`);
    if (short) sections.push(`- **Summary**: ${short}`);
    if (descriptionExcerpt) sections.push(`- **Description**: ${descriptionExcerpt}`);
    if (includes.length) sections.push(`- **Includes**: ${includesStr}`);
    if (tierStr) sections.push(`- **Tiers**: ${tierStr}`);
    sections.push(`- **Page**: /bundles/${slug}`);
    sections.push('');
  }

  const markdown = sections.join('\n');
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, markdown, 'utf8');
  console.log(`Wrote ${OUT_FILE} (${(products?.length || 0)} products, ${(bundles?.length || 0)} bundles).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
