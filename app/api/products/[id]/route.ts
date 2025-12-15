import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';

// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_reviews(rating, title, review_text, customer_name, created_at, is_approved)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Product not found' },
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
      .eq('product_id', id);

    const relatedProducts = relationships?.map((rel: any) => ({
      ...rel.related_product,
      relationship_id: rel.id
    })) || [];

    if (error) {
      console.error('Error fetching product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Calculate average rating
    const reviews = product.product_reviews || [];
    const approvedReviews = reviews.filter((r: any) => r.is_approved);
    const avgRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length
      : 0;

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
    console.error('Unexpected error in GET /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await request.json();
    const adminSupabase = createAdminClient();

    const { data: product, error } = await adminSupabase
      .from('products')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error: any) {
    console.error('Unexpected error in PUT /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

