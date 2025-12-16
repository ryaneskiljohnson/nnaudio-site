import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/service';

// GET /api/bundles/[id]/products - Get all products in a bundle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params;
    const adminSupabase = await createAdminClient();

    // Get bundle products
    const { data: bundleProducts, error } = await adminSupabase
      .from('bundle_products')
      .select(`
        id,
        display_order,
        product:products!inner(
          id,
          name,
          slug,
          category,
          price,
          sale_price,
          featured_image_url,
          logo_url
        )
      `)
      .eq('bundle_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching bundle products:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      products: bundleProducts || []
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/bundles/[id]/products - Add a product to a bundle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params;
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    // Check if product is already in bundle
    const { data: existing } = await adminSupabase
      .from('bundle_products')
      .select('id')
      .eq('bundle_id', id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Product is already in this bundle' },
        { status: 400 }
      );
    }

    // Get current max display_order
    const { data: maxOrder } = await adminSupabase
      .from('bundle_products')
      .select('display_order')
      .eq('bundle_id', id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const display_order = (maxOrder?.display_order ?? -1) + 1;

    // Add product to bundle
    const { data, error } = await adminSupabase
      .from('bundle_products')
      .insert({
        bundle_id: id,
        product_id,
        display_order
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product to bundle:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bundle_product: data
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/bundles/[id]/products?product_id=xxx - Remove a product from a bundle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'product_id query parameter is required' },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    const { error } = await adminSupabase
      .from('bundle_products')
      .delete()
      .eq('bundle_id', id)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing product from bundle:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

