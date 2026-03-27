import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';
import { getCanonicalImageKey } from '@/utils/canonicalImageKey';
import { isPSTDateAfterNow, isPSTDateBeforeNow } from '@/utils/timezoneUtils';
import {
  applyPromotionToBundlePricingSnapshot,
  type BundlePricingSnapshot,
  type PromotionPricingRow,
} from '@/utils/promotions/apply-promotion';

/**
 * @fileoverview API route for listing and creating bundles.
 * @module api/bundles
 *
 * @note The `bundles` table now has a `product_id` FK that points to the
 *       corresponding `products` row (category='bundle') for this bundle.
 *       `bundles.featured_image_url` and `bundles.logo_url` are kept in sync
 *       with the product row via the admin UI, so all image reads come
 *       directly from the `bundles` table — no cross-table slug/name lookup needed.
 */

// GET /api/bundles - List all bundles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';
    const bundleType = searchParams.get('type');
    const featured = searchParams.get('featured');

    const supabase = await createClient();
    
    let query = (supabase as any)
      .from('bundles')
      .select(`
        *,
        bundle_subscription_tiers(
          id,
          subscription_type,
          price,
          sale_price,
          active
        ),
        bundle_products(
          product:products(
            id,
            name,
            category,
            price,
            sale_price,
            featured_image_url,
            logo_url,
            status
          )
        )
      `)
      .eq('status', status)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (bundleType) {
      query = query.eq('bundle_type', bundleType);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    const { data: bundles, error } = await query;

    if (error) {
      console.error('Error fetching bundles:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const { data: promoRows } = await (supabase as any)
      .from('promotions')
      .select(
        'promotion_target_mode, included_targets, discount_type, discount_value, start_date, end_date, priority'
      )
      .eq('active', true)
      .order('priority', { ascending: false });

    const scheduleOk = (promo: Record<string, unknown>) => {
      if (promo.start_date && isPSTDateAfterNow(promo.start_date as string)) {
        return false;
      }
      if (promo.end_date && isPSTDateBeforeNow(promo.end_date as string)) {
        return false;
      }
      return true;
    };

    const affectsBundles = (promo: Record<string, unknown>) => {
      if (promo.promotion_target_mode === 'all') return true;
      const t = (promo.included_targets as string[]) || [];
      return t.some((x) => typeof x === 'string' && x.startsWith('bundle:'));
    };

    const bundlePromo =
      (promoRows || []).find(
        (p: Record<string, unknown>) => scheduleOk(p) && affectsBundles(p)
      ) || null;

    const bundlePromoRow = bundlePromo as PromotionPricingRow | null;

    // Transform the data to make it easier to work with
    const transformedBundles = bundles?.map((bundle: any) => {
      const tiers = ((bundle.bundle_subscription_tiers || []) as any[]).filter(t => t.active);
      let pricing: BundlePricingSnapshot = {
        monthly: tiers.find(t => t.subscription_type === 'monthly'),
        annual: tiers.find(t => t.subscription_type === 'annual'),
        lifetime: tiers.find(t => t.subscription_type === 'lifetime'),
      };

      if (bundlePromoRow) {
        pricing = applyPromotionToBundlePricingSnapshot(
          bundle.id,
          pricing,
          bundlePromoRow
        );
      }

      // Check if this is a subscription bundle (has monthly or annual tiers).
      // Bundles with ONLY lifetime tiers are considered regular one-time purchase bundles.
      const isSubscriptionBundle = tiers.some(t => t.subscription_type === 'monthly' || t.subscription_type === 'annual');

      // Extract all products for mosaic and counts (only active products).
      // For elite subscription bundles (monthly/annual), exclude bundle-category products.
      const allProducts = ((bundle.bundle_products || []) as any[])
        .map((bp: any) => bp.product)
        .filter((p: any) => {
          if (!p) return false;
          if (p.status !== 'active') return false;
          if (isSubscriptionBundle && p.category === 'bundle') return false;
          return true;
        });
      
      const withImages = allProducts.filter((p: any) => p && (p.featured_image_url || p.logo_url));
      // Deduplicate by canonical image key so the same image is never shown twice.
      const seenKey = new Set<string>();
      const productsWithImages = withImages.filter((p: any) => {
        const url = (p.featured_image_url || p.logo_url || '').trim();
        if (!url) return false;
        const key = getCanonicalImageKey(url);
        if (!key || seenKey.has(key)) return false;
        seenKey.add(key);
        return true;
      });
      
      const totalProductCount = allProducts.length;

      // Total compare-at value: sum of full list price of each product (for strikethrough on cards).
      const totalValue = allProducts.reduce((sum: number, p: any) => {
        const listPrice = p.price ?? 0;
        return sum + (typeof listPrice === 'number' ? listPrice : 0);
      }, 0);

      // Images live directly on the bundles row — no cross-table lookup needed.
      // The bundles.product_id FK and image sync are maintained by the admin UI.
      const featured_image_url = (bundle.featured_image_url && String(bundle.featured_image_url).trim()) || undefined;
      const logo_url = (bundle.logo_url && String(bundle.logo_url).trim()) || undefined;

      return {
        ...bundle,
        featured_image_url,
        logo_url,
        pricing,
        products: productsWithImages,
        totalProductCount,
        totalValue,
        isSubscriptionBundle,
        bundle_subscription_tiers: undefined,
        bundle_products: undefined,
      };
    });

    // Only show bundles that have at least one active product
    const bundlesWithActiveProducts = transformedBundles?.filter((b: any) => (b.totalProductCount || 0) > 0) ?? [];

    // Sort: elite subscription bundles first, then regular bundles, then by display_order
    const sortedBundles = bundlesWithActiveProducts.sort((a: any, b: any) => {
      // Elite subscription bundles (with monthly/annual tiers) come first
      if (a.isSubscriptionBundle && !b.isSubscriptionBundle) return -1;
      if (!a.isSubscriptionBundle && b.isSubscriptionBundle) return 1;
      
      // If both are elite bundles or both are not, sort by display_order
      const aOrder = a.display_order ?? 999;
      const bOrder = b.display_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Fallback to created_at
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return NextResponse.json(
      {
        success: true,
        bundles: sortedBundles,
        count: sortedBundles?.length || 0,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in GET /api/bundles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/bundles - Create a new bundle (admin only)
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = await createAdminClient();
    const body = await request.json();

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: bundle, error } = await (adminSupabase as any)
      .from('bundles')
      .insert([{
        name: body.name,
        slug,
        tagline: body.tagline,
        description: body.description,
        short_description: body.short_description,
        bundle_type: body.bundle_type,
        featured_image_url: body.featured_image_url,
        logo_url: body.logo_url,
        background_image_url: body.background_image_url,
        status: body.status || 'draft',
        is_featured: body.is_featured || false,
        display_order: body.display_order || 0,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        meta_keywords: body.meta_keywords,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating bundle:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bundle
    });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/bundles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

