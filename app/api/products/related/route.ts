/**
 * @fileoverview API route to fetch related products by product ID, category, and keywords
 * @module app/api/products/related
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRole } from '@/utils/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/related?productId=xxx&category=xxx&keywords=xxx&limit=8
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const category = searchParams.get('category') || '';
    const keywords = searchParams.get('keywords') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 12);

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServiceRole();
    const keywordArray = keywords
      ? keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    const selectCols = `
      id, name, slug, price, sale_price,
      featured_image_url, logo_url, tagline, category,
      meta_keywords
    `;

    // First: same category (use type assertion for products table)
    let query = (supabase as any)
      .from('products')
      .select(selectCols)
      .neq('id', productId)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: sameCategory, error: sameErr } = await query.limit(limit * 2);

    if (sameErr) {
      console.error('Related products sameCategory error:', sameErr);
    }

    let allRelated = sameCategory || [];

    // Fallback: other categories if not enough
    if (allRelated.length < limit && category) {
      const { data: other } = await (supabase as any)
        .from('products')
        .select(selectCols)
        .neq('id', productId)
        .neq('category', category)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(limit * 2);

      if (other?.length) {
        allRelated = [...allRelated, ...other];
      }
    }

    // Last resort: any products if still empty
    if (allRelated.length === 0) {
      const { data: anyProducts } = await (supabase as any)
        .from('products')
        .select(selectCols)
        .neq('id', productId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(limit);

      allRelated = anyProducts || [];
    }

    // Score and sort
    const scored = allRelated.map((p: any) => {
      let score = p.category === category ? 10 : 0;
      if (keywordArray.length && p.meta_keywords) {
        const pk = p.meta_keywords.toLowerCase().split(',').map((k: string) => k.trim());
        score += keywordArray.filter((kw) =>
          pk.some((pkw: string) => pkw.includes(kw) || kw.includes(pkw))
        ).length * 5;
      }
      return { ...p, relevanceScore: score };
    });

    scored.sort((a: any, b: any) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return (a.name || '').localeCompare(b.name || '');
    });

    const products = scored.slice(0, limit).map(({ relevanceScore, ...p }: any) => p);

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Related products API error:', error);
    return NextResponse.json(
      { success: false, products: [], error: error?.message },
      { status: 500 }
    );
  }
}
