/**
 * @fileoverview Public and admin product listing; merges active shop-wide promotions when allowed.
 * @module app/api/products/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';
import { requireAdmin } from '@/utils/auth/require-admin';
import { isPSTDateAfterNow, isPSTDateBeforeNow } from '@/utils/timezoneUtils';
import {
  computePromotionalUnitPrice,
  isShopProductIncluded,
  mergeManualAndPromotionalSalePrice,
} from '@/utils/promotions/apply-promotion';
import { excludeNnaudioAccessForCommerce } from '@/lib/shopProductFilters';

// GET /api/products - List all products (with filters)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const free = searchParams.get('free'); // Filter for free products (price = 0 or sale_price = 0)
    /** Admin-only: include the free NNAudio Access app in this list (default: omit — not for sale) */
    const includeNnaudioAccessProduct = searchParams.get('include_nnaudio_access_product') === 'true';
    // If limit is provided, use it; otherwise fetch all (Supabase default is 1000, but we'll set a high limit)
    const limit = limitParam ? parseInt(limitParam) : 10000;

    // Use service role for admin requests (status=all, inactive, draft, archived) to bypass RLS.
    // RLS restricts non-admins to status='active' only, so regular client would hide inactive/draft/archived.
    // These requests expose non-public catalog data, so they MUST be admin-authorized.
    const isAdminRequest =
      statusParam === 'all' ||
      ['inactive', 'draft', 'archived'].includes(statusParam || '') ||
      includeNnaudioAccessProduct;
    if (isAdminRequest) {
      const auth = await requireAdmin();
      if (!auth.ok) {
        return auth.response;
      }
    }
    const supabase = isAdminRequest ? await createAdminClient() : await createClient();
    
    let query = (supabase as any)
      .from('products')
      .select('*, product_reviews(rating, is_approved)')
      .order('created_at', { ascending: false });
    
    // Only apply limit if it's a reasonable number (to prevent abuse)
    if (limit > 0 && limit <= 10000) {
      query = query.limit(limit);
    }

    if (category) {
      // Handle comma-separated categories (e.g., "audio-fx-plugin,instrument-plugin")
      const categories = category.split(',').map(c => c.trim());
      if (categories.length === 1) {
        query = query.eq('category', categories[0]);
      } else {
        query = query.in('category', categories);
      }
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    // Filter for free products (price = 0 or sale_price = 0)
    if (free === 'true') {
      query = query.or('price.eq.0,sale_price.eq.0');
    }

    // Filter by status when provided. status=all returns all statuses (admin). Otherwise default to active.
    if (statusParam === 'all') {
      // No status filter - return all
    } else if (statusParam && ['active', 'inactive', 'draft', 'archived'].includes(statusParam)) {
      query = query.eq('status', statusParam);
    } else {
      // No status param or invalid: default to active for public-facing requests
      query = query.eq('status', 'active');
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate average rating for each product
    let productsWithRatings = products?.map((product: any) => {
      const approvedReviews = (product.product_reviews || []).filter((review: any) => review.is_approved);
      const avgRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length
        : 0;
      
      return {
        ...product,
        average_rating: avgRating,
        review_count: approvedReviews.length,
        product_reviews: undefined // Remove from response
      };
    }) || [];

    // Exclude "nnaudio access" from free products
    if (free === 'true') {
      productsWithRatings = productsWithRatings.filter((product: any) => {
        const name = (product.name || '').toLowerCase();
        const slug = (product.slug || '').toLowerCase();
        return !name.includes('nnaudio access') && !slug.includes('nnaudio-access');
      });
    }

    if (!includeNnaudioAccessProduct) {
      productsWithRatings = excludeNnaudioAccessForCommerce(productsWithRatings) as any[];
    }

    /**
     * @brief Applies highest-priority active promotion that includes shop products to catalog prices.
     */
    if (!isAdminRequest) {
      const pub = await createClient();
      const { data: promoRows } = await (pub as any)
        .from('promotions')
        .select(
          'id, promotion_target_mode, included_targets, discount_type, discount_value, start_date, end_date, priority'
        )
        .eq('active', true)
        .order('priority', { ascending: false });

      const scheduleOk = (promo: any) => {
        if (promo.start_date && isPSTDateAfterNow(promo.start_date)) return false;
        if (promo.end_date && isPSTDateBeforeNow(promo.end_date)) return false;
        return true;
      };

      const affectsShop = (promo: any) => {
        if (promo.promotion_target_mode === 'all') return true;
        const t = promo.included_targets || [];
        return t.some((x: string) => typeof x === 'string' && x.startsWith('product:'));
      };

      const shopPromo =
        (promoRows || []).find((p: any) => scheduleOk(p) && affectsShop(p)) || null;

      if (shopPromo) {
        productsWithRatings = productsWithRatings.map((product: any) => {
          if (!isShopProductIncluded(product.id, shopPromo)) {
            return product;
          }
          const regular = Number(product.price);
          if (!Number.isFinite(regular)) return product;
          const promoUnit = computePromotionalUnitPrice(
            regular,
            shopPromo.discount_type,
            Number(shopPromo.discount_value)
          );
          const merged = mergeManualAndPromotionalSalePrice(
            regular,
            product.sale_price,
            promoUnit
          );
          if (merged === null) return product;
          return { ...product, sale_price: merged };
        });
      }
    }

    const headers: Record<string, string> = {};
    if (!isAdminRequest) {
      headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300";
    }
    return NextResponse.json(
      {
        success: true,
        products: productsWithRatings,
        count: productsWithRatings.length,
      },
      { headers: Object.keys(headers).length ? headers : undefined }
    );
  } catch (error: any) {
    console.error('Unexpected error in GET /api/products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const adminSupabase = await createAdminClient();

    // Validate legacy_product_id uniqueness if provided
    if (body.legacy_product_id && body.legacy_product_id.trim() !== '') {
      const { data: existingProduct, error: checkError } = await (adminSupabase as any)
        .from('products')
        .select('id, name')
        .eq('legacy_product_id', body.legacy_product_id.trim())
        .single();

      if (existingProduct && !checkError) {
        return NextResponse.json(
          { 
            success: false, 
            error: `A product with legacy_product_id "${body.legacy_product_id}" already exists: ${existingProduct.name} (${existingProduct.id})` 
          },
          { status: 400 }
        );
      }
    }

    // Create slug from name if not provided
    const slug = body.slug || body.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: product, error } = await (adminSupabase as any)
      .from('products')
      .insert([{
        name: body.name,
        slug,
        tagline: body.tagline,
        description: body.description,
        short_description: body.short_description,
        price: body.price,
        sale_price: body.sale_price,
        category: body.category,
        status: body.status || 'draft',
        is_featured: body.is_featured || false,
        is_new: body.is_new || false,
        featured_image_url: body.featured_image_url,
        logo_url: body.logo_url,
        background_image_url: body.background_image_url,
        background_video_url: body.background_video_url,
        gallery_images: body.gallery_images || [],
        features: body.features || [],
        specifications: body.specifications || {},
        requirements: body.requirements || {},
        demo_video_url: body.demo_video_url,
        demo_videos: body.demo_videos || [],
        audio_samples: body.audio_samples || [],
        download_url: body.download_url,
        download_version: body.download_version,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        meta_keywords: body.meta_keywords,
        legacy_product_id: body.legacy_product_id?.trim() || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Sync to Stripe if product has a price
    if (product && product.price !== null && product.price !== undefined) {
      try {
        const { syncProductToStripe } = await import('@/utils/stripe/product-sync');
        
        const syncResult = await syncProductToStripe(
          product.id,
          product.name,
          product.description || product.short_description || '',
          product.price,
          product.sale_price,
          null, // No existing Stripe product
          null, // No existing Stripe price
          null  // No existing Stripe sale price
        );

        if (syncResult.success) {
          // Update product with Stripe IDs
          await (adminSupabase as any)
            .from('products')
            .update({
              stripe_product_id: syncResult.stripe_product_id,
              stripe_price_id: syncResult.stripe_price_id,
              stripe_sale_price_id: null,
            })
            .eq('id', product.id);
          
          // Refresh product data to include Stripe IDs
          const { data: updatedProduct } = await (adminSupabase as any)
            .from('products')
            .select('*')
            .eq('id', product.id)
            .single();
          
          return NextResponse.json({
            success: true,
            product: updatedProduct || product,
            stripe_synced: true,
          });
        } else {
          console.error('Stripe sync failed:', syncResult.error);
          // Still return success for product creation, but log Stripe error
          return NextResponse.json({
            success: true,
            product,
            stripe_synced: false,
            stripe_error: syncResult.error,
          });
        }
      } catch (stripeError: any) {
        console.error('Error syncing to Stripe:', stripeError);
        // Still return success for product creation
        return NextResponse.json({
          success: true,
          product,
          stripe_synced: false,
          stripe_error: stripeError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

