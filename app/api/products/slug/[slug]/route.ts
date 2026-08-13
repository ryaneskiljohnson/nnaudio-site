import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSupabaseServiceRole } from '@/utils/supabase/service';

// Disable caching so product updates (images, prices, etc.) show immediately
export const dynamic = 'force-dynamic';

// GET /api/products/slug/[slug] - Get product by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createSupabaseServiceRole();
    const { slug } = await params;

    // Use service role so we load all reviews, then filter to approved only for the product page.
    const { data: product, error } = await (adminSupabase as any)
      .from('products')
      .select(`
        *,
        product_reviews(rating, title, review_text, customer_name, created_at, is_approved, moderation_status, is_verified_purchase)
      `)
      .eq('slug', slug)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Determine admin status (only admins may view non-active products and
    // sensitive fields like download URLs / Stripe IDs).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
      const { data: adminRow } = await supabase
        .from('admins')
        .select('id')
        .eq('user', user.id)
        .maybeSingle();
      isAdmin = !!adminRow;
    }

    // Draft / inactive / archived products are not public.
    if (!isAdmin && product.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch related products separately
    const { data: relationships, error: relError } = await (supabase as any)
      .from('product_relationships')
      .select(`
        id,
        related_product:products!product_relationships_related_product_id_fkey(
          id, name, slug, price, sale_price, featured_image_url, logo_url, category
        )
      `)
      .eq('product_id', product.id);

    const relatedProducts = relationships?.map((rel: any) => ({
      ...rel.related_product,
      relationship_id: rel.id
    })) || [];

    if (relError) {
      console.error('Error fetching related products:', relError);
    }

    // Product page shows only approved reviews (rating, count, and list).
    const reviews = product.product_reviews || [];
    const approvedReviews = reviews.filter(
      (r: any) => r.is_approved === true || r.moderation_status === 'approved'
    );
    const avgRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length
      : 0;

    // Increment view count (fire and forget)
    (supabase as any)
      .from('products')
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq('id', product.id)
      .then(() => console.log(`Incremented view count for product: ${slug}`))
      .catch((err: unknown) => console.error('Error incrementing view count:', err));

    // Strip fields that must never reach the public (asset URLs enable
    // unauthenticated downloads; Stripe IDs are internal). Admins keep them.
    const sanitizedProduct = { ...product };
    if (!isAdmin) {
      delete sanitizedProduct.download_url;
      delete sanitizedProduct.downloads;
      delete sanitizedProduct.stripe_product_id;
      delete sanitizedProduct.stripe_price_id;
      delete sanitizedProduct.stripe_sale_price_id;
    }

    return NextResponse.json({
      success: true,
      product: {
        ...sanitizedProduct,
        average_rating: avgRating,
        review_count: approvedReviews.length,
        reviews: approvedReviews,
        related_products: relatedProducts,
        product_reviews: undefined
      }
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/products/slug/[slug]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

