import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/products/slug/[slug] - Get product by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const { slug } = params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_reviews(rating, title, review_text, customer_name, created_at, is_approved)
      `)
      .eq('slug', slug)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch related products separately
    const { data: relationships, error: relError } = await supabase
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

    if (error) {
      console.error('Error fetching product:', error);
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate average rating
    const reviews = product.product_reviews || [];
    const approvedReviews = reviews.filter((r: any) => r.is_approved);
    const avgRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length
      : 0;

    // Increment view count (fire and forget)
    supabase
      .from('products')
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq('id', product.id)
      .then(() => console.log(`Incremented view count for product: ${slug}`))
      .catch((err) => console.error('Error incrementing view count:', err));

    return NextResponse.json({
      success: true,
      product: {
        ...product,
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

