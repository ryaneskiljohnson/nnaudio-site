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
    const adminSupabase = await createAdminClient();

    // Check if price or sale_price changed - if so, sync to Stripe
    const shouldSyncStripe = body.price !== undefined || body.sale_price !== undefined;
    
    // Get existing product to check current Stripe IDs
    let existingStripeIds: {
      stripe_product_id?: string | null;
      stripe_price_id?: string | null;
      stripe_sale_price_id?: string | null;
    } = {};
    
    if (shouldSyncStripe) {
      const { data: existingProduct } = await adminSupabase
        .from('products')
        .select('stripe_product_id, stripe_price_id, stripe_sale_price_id, name, description, short_description, price, sale_price')
        .eq('id', id)
        .single();
      
      if (existingProduct) {
        existingStripeIds = {
          stripe_product_id: existingProduct.stripe_product_id,
          stripe_price_id: existingProduct.stripe_price_id,
          stripe_sale_price_id: existingProduct.stripe_sale_price_id,
        };
      }
    }

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

    // Sync to Stripe if prices changed
    if (shouldSyncStripe && product) {
      try {
        const { syncProductToStripe } = await import('@/utils/stripe/product-sync');
        
        const syncResult = await syncProductToStripe(
          product.id,
          product.name,
          product.description || product.short_description || '',
          product.price,
          product.sale_price,
          existingStripeIds.stripe_product_id,
          existingStripeIds.stripe_price_id,
          existingStripeIds.stripe_sale_price_id
        );

        if (syncResult.success) {
          // Update product with Stripe IDs (clear sale price ID since we don't use it)
          await adminSupabase
            .from('products')
            .update({
              stripe_product_id: syncResult.stripe_product_id,
              stripe_price_id: syncResult.stripe_price_id,
              stripe_sale_price_id: null, // Clear sale price ID - not used
            })
            .eq('id', id);
          
          // Refresh product data to include Stripe IDs
          const { data: updatedProduct } = await adminSupabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
          
          return NextResponse.json({
            success: true,
            product: updatedProduct || product,
            stripe_synced: true,
          });
        } else {
          console.error('Stripe sync failed:', syncResult.error);
          // Still return success for product update, but log Stripe error
          return NextResponse.json({
            success: true,
            product,
            stripe_synced: false,
            stripe_error: syncResult.error,
          });
        }
      } catch (stripeError: any) {
        console.error('Error syncing to Stripe:', stripeError);
        // Still return success for product update
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
    const adminSupabase = await createAdminClient();

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

